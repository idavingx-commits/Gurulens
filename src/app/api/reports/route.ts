import { type NextRequest } from "next/server";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { reportSchema } from "@/lib/validation";

export const POST = route(async (req: NextRequest) => {
  const auth = await requireAuth(req);

  const rl = rateLimit(`report:${auth.user.id}`, 10, 24 * 60 * 60 * 1000);
  if (!rl.ok) {
    throw new ApiError(429, "Too many reports today. Our team is already on it.", "rate_limited");
  }

  const body = await parseBody(req, reportSchema);

  // Prevent noisy duplicates: one open report per reporter + target.
  const duplicate = await db.report.findFirst({
    where: {
      reporterId: auth.user.id,
      targetType: body.targetType,
      targetId: body.targetId,
      status: { in: ["open", "in_review"] },
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new ApiError(409, "You already reported this. Our moderators are on it.", "duplicate");
  }

  const report = await db.report.create({
    data: {
      reporterId: auth.user.id,
      targetType: body.targetType,
      targetId: body.targetId,
      reason: body.reason,
      details: body.details?.trim() || null,
    },
    select: { id: true, status: true, createdAt: true },
  });

  await writeAudit(auth.user.id, "report.create", report.id, {
    targetType: body.targetType,
    targetId: body.targetId,
    reason: body.reason,
  });

  return ok({ report }, { status: 201 });
});
