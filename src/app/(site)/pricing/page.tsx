import type { Metadata } from "next";

import { LinkButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Badge, SectionHeader } from "@/components/ui/primitives";
import { getAuth } from "@/lib/auth";
import { getActivePlans, getUserSubscription } from "@/lib/subscriptions";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Choose the perfect plan for your teaching needs",
};

type PlanCardPlan = {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  priceLkr: number;
  billingCycle: string;
  limits: string;
};

function PlanCard({
  plan,
  isCurrent,
}: {
  plan: PlanCardPlan;
  isCurrent: boolean;
}) {
  const limits = JSON.parse(plan.limits);

  return (
    <div className={`card relative p-6 ${isCurrent ? "ring-2 ring-brand-500" : ""}`}>
      {isCurrent && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white">
          Current Plan
        </span>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-bold text-ink-900">{plan.name}</h3>
        <p className="mt-1 text-sm text-ink-500">{plan.description}</p>
      </div>

      <div className="mb-6">
        <span className="text-3xl font-extrabold text-ink-900">
          {plan.priceLkr === 0 ? "Free" : `LKR ${plan.priceLkr.toLocaleString()}`}
        </span>
        {plan.priceLkr > 0 && (
          <span className="text-sm text-ink-500">/{plan.billingCycle}</span>
        )}
      </div>

      <ul className="mb-6 space-y-2">
        <li className="flex items-center gap-2 text-sm">
          <Icon name="check" size={16} className="text-success-500" />
          {limits.channels === -1 ? "Unlimited" : limits.channels} channels
        </li>
        <li className="flex items-center gap-2 text-sm">
          <Icon name="check" size={16} className="text-success-500" />
          {limits.classes === -1 ? "Unlimited" : limits.classes} classes
        </li>
        <li className="flex items-center gap-2 text-sm">
          <Icon name="check" size={16} className="text-success-500" />
          {limits.storage_mb >= 1000 ? `${limits.storage_mb / 1000} GB` : `${limits.storage_mb} MB`} storage
        </li>
        {limits.teachers && (
          <li className="flex items-center gap-2 text-sm">
            <Icon name="check" size={16} className="text-success-500" />
            {limits.teachers} teachers
          </li>
        )}
        {limits.branches && (
          <li className="flex items-center gap-2 text-sm">
            <Icon name="check" size={16} className="text-success-500" />
            {limits.branches} branches
          </li>
        )}
      </ul>

      {isCurrent ? (
        <button disabled className="w-full rounded-xl bg-ink-100 px-4 py-2.5 text-sm font-bold text-ink-500">
          Current Plan
        </button>
      ) : plan.priceLkr === 0 ? (
        <LinkButton href="/register/teacher" variant="outline" className="w-full">
          Get Started
        </LinkButton>
      ) : (
        <LinkButton href={`/support?plan=${plan.slug}`} className="w-full">
          Contact Sales
        </LinkButton>
      )}
    </div>
  );
}

export default async function PricingPage() {
  const auth = await getAuth();
  const plans = await getActivePlans();

  let subscription = null;
  if (auth) {
    subscription = await getUserSubscription(auth.user.id);
  }

  const teacherPlans = plans.filter((p) => ["free", "teacher_pro"].includes(p.type));
  const institutePlans = plans.filter((p) => ["institute", "institute_plus"].includes(p.type));
  const campusPlans = plans.filter((p) => ["campus_pilot", "campus_pro"].includes(p.type));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-10 pb-16 sm:px-6">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
          Choose Your Plan
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-ink-500">
          Start free and upgrade as you grow. All plans include core features to help you teach better.
        </p>
      </div>

      {/* Current Plan Badge */}
      {subscription && subscription.status !== "free" && (
        <div className="mb-8 text-center">
          <Badge tone="brand">
            Current: {subscription.plan?.name}
            {subscription.status === "trial" && " (Trial)"}
          </Badge>
        </div>
      )}

      {/* Teacher Plans */}
      <section className="mb-16">
        <SectionHeader
          title="For Private Tuition Teachers"
          subtitle="Perfect for individual teachers managing their own classes"
          className="mb-6 text-center"
        />
        <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
          {teacherPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={subscription?.plan?.slug === plan.slug}
            />
          ))}
        </div>
      </section>

      {/* Institute Plans */}
      <section className="mb-16">
        <SectionHeader
          title="For Tuition Institutes"
          subtitle="Manage multiple teachers, branches, and thousands of students"
          className="mb-6 text-center"
        />
        <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
          {institutePlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={subscription?.plan?.slug === plan.slug}
            />
          ))}
        </div>
      </section>

      {/* Campus Plans */}
      <section className="mb-16">
        <SectionHeader
          title="GuruLens Campus for Schools"
          subtitle="Complete school management solution with parent portals"
          className="mb-6 text-center"
        />
        <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
          {campusPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={subscription?.plan?.slug === plan.slug}
            />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center">
        <h2 className="text-xl font-bold text-ink-900">Questions?</h2>
        <p className="mt-2 text-sm text-ink-500">
          Contact us for custom enterprise plans or help choosing the right plan.
        </p>
        <LinkButton href="/support" variant="outline" className="mt-4">
          Contact Support
        </LinkButton>
      </section>
    </div>
  );
}
