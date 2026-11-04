import { type NextRequest } from "next/server";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { tierSchema } from "@/lib/validation";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

async function requireOwnTier(req: NextRequest, id: string) {
  const auth = await requireAuth(req, ["teacher", "admin"]);
  const tier = await db.membershipTier.findUnique({
    where: { id },
    select: { id: true, teacherId: true },
  });
  if (!tier) throw new ApiError(404, "Membership tier not found.", "not_found");
  if (tier.teacherId !== auth.user.id && auth.user.role !== "admin") {
    throw new ApiError(403, "You can only manage your own tiers.", "forbidden");
  }
  return auth;
}

const tierUpdateSchema = tierSchema.partial().extend({ active: z.boolean().optional() });

export const PATCH = route(async (req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const auth = await requireOwnTier(req, id);
  const body = await parseBody(req, tierUpdateSchema);

  await db.membershipTier.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.priceLkr !== undefined ? { priceLkr: body.priceLkr } : {}),
      ...(body.perks !== undefined
        ? { perks: body.perks.length > 0 ? JSON.stringify(body.perks) : null }
        : {}),
      ...(body.active !== undefined ? { active: body.active } : {}),
    },
  });

  await writeAudit(auth.user.id, "tier.update", id, {});
  return ok({ updated: true });
});

export const DELETE = route(async (req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const auth = await requireOwnTier(req, id);

  const memberCount = await db.membership.count({ where: { tierId: id, status: "active" } });
  if (memberCount > 0) {
    throw new ApiError(
      400,
      `This tier has ${memberCount} active member${memberCount === 1 ? "" : "s"}. Deactivate it instead of deleting.`,
      "tier_has_members",
    );
  }

  await db.membershipTier.delete({ where: { id } });
  await writeAudit(auth.user.id, "tier.delete", id, {});
  return ok({ deleted: true });
});
