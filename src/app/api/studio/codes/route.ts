import { randomBytes } from "node:crypto";

import { type NextRequest } from "next/server";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { enrollmentCodeSchema } from "@/lib/validation";

export const POST = route(async (req: NextRequest) => {
  const auth = await requireAuth(req, ["teacher", "admin"]);

  const rl = rateLimit(`codes:${auth.user.id}`, 30, 60 * 60 * 1000);
  if (!rl.ok) {
    throw new ApiError(429, "Too many codes created. Please try again later.", "rate_limited");
  }

  const body = await parseBody(req, enrollmentCodeSchema);

  const profile = await db.teacherProfile.findUnique({
    where: { userId: auth.user.id },
    select: { handle: true },
  });
  if (!profile) throw new ApiError(404, "Teacher profile not found.", "not_found");

  const prefix = `GL-${profile.handle.slice(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, "")}`;

  let code = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = randomBytes(3).toString("hex").toUpperCase().slice(0, 5);
    const candidate = `${prefix}-${suffix}`;
    const clash = await db.enrollmentCode.findUnique({
      where: { code: candidate },
      select: { id: true },
    });
    if (!clash) {
      code = candidate;
      break;
    }
  }
  if (!code) throw new ApiError(500, "Could not generate a unique code. Try again.", "code_gen");

  const enrollmentCode = await db.enrollmentCode.create({
    data: {
      teacherId: auth.user.id,
      code,
      label: body.label ?? null,
      maxUses: body.maxUses,
      expiresAt: body.expiresInDays
        ? new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000)
        : null,
    },
    select: { id: true, code: true, label: true, maxUses: true, uses: true, expiresAt: true },
  });

  await writeAudit(auth.user.id, "enrollment_code.create", enrollmentCode.id, {
    maxUses: body.maxUses,
  });
  return ok({ code: enrollmentCode }, { status: 201 });
});
