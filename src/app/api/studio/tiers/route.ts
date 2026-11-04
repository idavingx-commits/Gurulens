import { type NextRequest } from "next/server";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { tierSchema } from "@/lib/validation";

export const POST = route(async (req: NextRequest) => {
  const auth = await requireAuth(req, ["teacher", "admin"]);

  const rl = rateLimit(`tiers:${auth.user.id}`, 15, 60 * 60 * 1000);
  if (!rl.ok) {
    throw new ApiError(429, "Too many tiers created. Please try again later.", "rate_limited");
  }

  const body = await parseBody(req, tierSchema);

  const profile = await db.teacherProfile.findUnique({
    where: { userId: auth.user.id },
    select: { id: true },
  });
  if (!profile) throw new ApiError(404, "Teacher profile not found.", "not_found");

  const tierCount = await db.membershipTier.count({ where: { teacherId: auth.user.id } });
  if (tierCount >= 5) {
    throw new ApiError(400, "You can have up to 5 membership tiers.", "tier_limit");
  }

  const tier = await db.membershipTier.create({
    data: {
      teacherId: auth.user.id,
      name: body.name,
      description: body.description ?? null,
      priceLkr: body.priceLkr,
      perks: body.perks.length > 0 ? JSON.stringify(body.perks) : null,
    },
    select: { id: true, name: true, priceLkr: true },
  });

  await writeAudit(auth.user.id, "tier.create", tier.id, { priceLkr: body.priceLkr });
  return ok({ tier }, { status: 201 });
});
