import { type NextRequest } from "next/server";
import { z } from "zod";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { SUPER_ADMIN_ROLES } from "@/lib/constants";
import { db } from "@/lib/db";

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

export const POST = route(async (request: NextRequest) => {
  const auth = await requireAuth(request, SUPER_ADMIN_ROLES);
  const body = await parseBody(request, planBodySchema);

  const existing = await db.plan.findUnique({ where: { slug: body.slug } });
  if (existing) {
    throw new ApiError(409, "A plan with that slug already exists.", "slug_taken");
  }

  const plan = await db.plan.create({
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

  await writeAudit(auth.user.id, "plan.create", plan.id, {
    name: plan.name,
    slug: plan.slug,
    type: plan.type,
    priceLkr: plan.priceLkr,
  });

  return ok({ plan }, { status: 201 });
});
