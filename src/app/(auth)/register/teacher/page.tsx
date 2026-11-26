import type { Metadata } from "next";

import { TeacherForm } from "@/components/auth/TeacherForm";
import { db } from "@/lib/db";
import { parsePlanFeatures, parsePlanLimits, planAudience } from "@/lib/plan-catalog";

export const metadata: Metadata = { title: "Teacher sign up" };

type Props = {
  searchParams: Promise<{ plan?: string }>;
};

export default async function TeacherRegisterPage({ searchParams }: Props) {
  const query = await searchParams;

  const [subjects, districts, grades, languages, allPlans] = await Promise.all([
    db.subject.findMany({ orderBy: { name: "asc" } }),
    db.district.findMany({ orderBy: { name: "asc" } }),
    db.grade.findMany({ orderBy: { order: "asc" } }),
    db.language.findMany({ orderBy: { name: "asc" } }),
    db.plan.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);

  const plans = allPlans
    .filter((plan) => planAudience(plan.type) === "teacher")
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

  return (
    <TeacherForm
      taxonomy={{
        subjects: subjects.map((s) => ({ slug: s.slug, name: s.name })),
        districts: districts.map((d) => ({ slug: d.slug, name: d.name })),
        grades: grades.map((g) => ({ slug: g.slug, name: g.name })),
        languages: languages.map((l) => ({ slug: l.slug, name: l.name })),
      }}
      plans={plans}
      initialPlanSlug={query.plan}
    />
  );
}
