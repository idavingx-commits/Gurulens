import { type NextRequest } from "next/server";
import { z } from "zod";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { SUPER_ADMIN_ROLES } from "@/lib/constants";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

const planBodySchema = z.object({
  name: z.string().trim().min(2, "Plan name is required.").max(80),
  slug: z
    .string()
    .trim()
    .min(2, "Slug is required.")
    .max(80)
    .regex(/^[a-z0-9][a-z0-9_-]*$/, "Use lowercase letters, numbers, dashes or underscores."),
  type: z.enum(["teacher", "institute", "campus"]),
  description: z.string().trim().max(300).optional(),
  priceLkr: z.number().int().min(0).max(10_000_000),
  billingCycle: z.enum(["monthly", "yearly", "lifetime"]),
  limits: z.record(z.string(), z.number().int().min(-1).max(10_000_000)),
  features: z.array(z.string().trim().min(1).max(80)).max(120),
  sortOrder: z.number().int().min(0).max(9999),
  isActive: z.boolean(),
});

function normalizeFeatures(features: string[]) {
  return [...new Set(features.map((feature) => feature.trim().toLowerCase()).filter(Boolean))];
}

export const PATCH = route(async (request: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(request, SUPER_ADMIN_ROLES);
  const { id } = await ctx.params;
  const body = await parseBody(request, planBodySchema);

  const existing = await db.plan.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Plan not found.", "not_found");

  const slugOwner = await db.plan.findUnique({ where: { slug: body.slug } });
  if (slugOwner && slugOwner.id !== id) {
    throw new ApiError(409, "Another plan already uses that slug.", "slug_taken");
  }

  const plan = await db.plan.update({
    where: { id },
    data: {
      name: body.name,
      slug: body.slug,
      type: body.type,
      description: body.description || null,
      priceLkr: body.priceLkr,
      billingCycle: body.billingCycle,
      limits: JSON.stringify(body.limits),
      features: JSON.stringify(normalizeFeatures(body.features)),
      sortOrder: body.sortOrder,
      isActive: body.isActive,
    },
  });

  await writeAudit(auth.user.id, "plan.update", plan.id, {
    name: plan.name,
    slug: plan.slug,
    type: plan.type,
    priceLkr: plan.priceLkr,
    isActive: plan.isActive,
  });

  return ok({ plan });
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(request, SUPER_ADMIN_ROLES);
  const { id } = await ctx.params;

  const plan = await db.plan.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true, _count: { select: { subscriptions: true } } },
  });
  if (!plan) throw new ApiError(404, "Plan not found.", "not_found");

  if (plan._count.subscriptions > 0) {
    throw new ApiError(
      400,
      "This plan has subscribers. Deactivate it instead so existing users keep their access.",
      "plan_in_use",
    );
  }

  await db.plan.delete({ where: { id } });
  await writeAudit(auth.user.id, "plan.delete", plan.id, {
    name: plan.name,
    slug: plan.slug,
  });

  return ok({ deleted: true });
});
