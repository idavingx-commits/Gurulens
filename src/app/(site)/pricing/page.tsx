import type { Metadata } from "next";

import { ContactCtaCard } from "@/components/marketing/contact-panel";
import { getAuth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/constants";
import { parsePlanFeatures, parsePlanLimits } from "@/lib/plan-catalog";
import { getActivePlans, getUserSubscription } from "@/lib/subscriptions";
import { PricingPlans, type PricingPlan } from "./pricing-plans";

export const metadata: Metadata = {
  title: "Plans & Pricing",
  description:
    "Simple plans for Sri Lankan teachers, tuition institutes and schools. Every plan is free during the GuruLens launch.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    type: "website",
    title: "GuruLens Plans & Pricing",
    description:
      "Find the right plan for your classroom, institute or school. Free during launch.",
    url: "/pricing",
    images: [{ url: "/brand/og-default.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "GuruLens Plans & Pricing",
    description: "Find the right plan for your classroom, institute or school. Free during launch.",
    images: ["/brand/og-default.png"],
  },
};

export default async function PricingPage() {
  const auth = await getAuth();
  const plans = await getActivePlans();

  const subscription = auth ? await getUserSubscription(auth.user.id) : null;

  const normalized: PricingPlan[] = plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    slug: plan.slug,
    type: plan.type,
    description: plan.description,
    priceLkr: plan.priceLkr,
    billingCycle: plan.billingCycle,
    limits: parsePlanLimits(plan.limits),
    features: parsePlanFeatures(plan.features),
  }));

  const currentSlug =
    subscription && subscription.status !== "free"
      ? ((subscription.plan as { slug?: string } | null)?.slug ?? null)
      : normalized.find((plan) => plan.slug === "free")?.slug ?? null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-14 sm:px-6">
      <PricingPlans
        plans={normalized}
        currentSlug={currentSlug}
        isAuthed={Boolean(auth)}
        isAdmin={Boolean(auth && ADMIN_ROLES.includes(auth.user.role))}
      />

      <div className="mt-8">
        <ContactCtaCard topic="pricing" />
      </div>
    </div>
  );
}
