import { type NextRequest } from "next/server";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { notify, writeAudit } from "@/lib/audit";
import { ADMIN_ROLES } from "@/lib/constants";
import { db } from "@/lib/db";
import { adminBadgeActionSchema } from "@/lib/validation";

const BADGE_NAMES: Record<string, string> = {
  "verified-teacher": "Verified Teacher",
  "highly-rated": "Highly Rated",
  "active-educator": "Active Educator",
  "community-contributor": "Community Contributor",
};

export const POST = route(async (req: NextRequest) => {
  const auth = await requireAuth(req, ADMIN_ROLES);
  const body = await parseBody(req, adminBadgeActionSchema);

  const user = body.userId
    ? await db.user.findUnique({
        where: { id: body.userId },
        select: { id: true, name: true, role: true },
      })
    : await db.user.findUnique({
        where: { email: body.userEmail!.toLowerCase() },
        select: { id: true, name: true, role: true },
      });
  if (!user) throw new ApiError(404, "User not found.", "not_found");

  let badge = await db.badge.findUnique({
    where: { key: body.badgeKey },
    select: { id: true, name: true },
  });
  if (!badge) {
    badge = await db.badge.create({
      data: {
        key: body.badgeKey,
        name: BADGE_NAMES[body.badgeKey] ?? body.badgeKey,
        description: "Granted by the GuruLens moderation team.",
        kind: body.badgeKey === "verified-teacher" ? "verification" : "achievement",
      },
      select: { id: true, name: true },
    });
  }

  if (body.action === "grant") {
    const existing = await db.badgeGrant.findFirst({
      where: { badgeId: badge.id, userId: user.id },
      select: { id: true, active: true },
    });
    if (existing?.active) {
      throw new ApiError(400, "This user already has this badge.", "already_granted");
    }
    if (existing) {
      await db.badgeGrant.update({
        where: { id: existing.id },
        data: { active: true, revokedAt: null, grantedById: auth.user.id, reason: body.reason ?? null },
      });
    } else {
      await db.badgeGrant.create({
        data: {
          badgeId: badge.id,
          userId: user.id,
          grantedById: auth.user.id,
          reason: body.reason ?? null,
        },
      });
    }
    await notify(
      user.id,
      "badge",
      `You earned the ${badge.name} badge`,
      body.reason?.trim() || "Keep up the great work!",
      user.role === "teacher" ? "/studio" : "/dashboard",
    );
  } else {
    const existing = await db.badgeGrant.findFirst({
      where: { badgeId: badge.id, userId: user.id, active: true },
      select: { id: true },
    });
    if (!existing) {
      throw new ApiError(400, "This user does not have this badge.", "not_granted");
    }
    await db.badgeGrant.update({
      where: { id: existing.id },
      data: { active: false, revokedAt: new Date() },
    });
    await notify(
      user.id,
      "badge",
      `The ${badge.name} badge was removed`,
      body.reason?.trim() || "Contact support if you think this was a mistake.",
      null,
    );
  }

  await writeAudit(auth.user.id, `badge.${body.action}`, user.id, {
    badgeKey: body.badgeKey,
    reason: body.reason ?? null,
  });

  return ok({ done: true });
});
