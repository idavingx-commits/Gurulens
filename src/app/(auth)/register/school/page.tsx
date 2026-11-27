import type { Metadata } from "next";

import { OrganizationForm } from "@/components/auth/OrganizationForm";
import { db } from "@/lib/db";
import { parsePlanFeatures, parsePlanLimits, planAudience } from "@/lib/plan-catalog";

export const metadata: Metadata = {
  title: "Register your school",
  description:
    "Create a GuruLens school account — campus profile, staff and student accounts, timetables and a branded LMS at yourname.gurulens.us.",
};

type Props = {
  searchParams: Promise<{ plan?: string }>;
};

export default async function SchoolRegisterPage({ searchParams }: Props) {
  const query = await searchParams;

  const allPlans = await db.plan.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const plans = allPlans
    .filter((plan) => planAudience(plan.type) === "campus")
    .map((plan) => ({
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      description: plan.description,
      priceLkr: plan.priceLkr,
      billingCycle: plan.billingCycle,
      limits: parsePlanLimits(plan.limits),
      features: parsePlanFeatures(plan.features),
    }));

  return <OrganizationForm type="school" plans={plans} initialPlanSlug={query.plan} />;
}
