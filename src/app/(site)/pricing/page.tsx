/**
 * Pricing Page
 * Subscription plans and features
 */

import Link from "next/link";
import { getAuth } from "@/lib/auth";
import { getActivePlans, getUserSubscription } from "@/lib/subscriptions";
import { Button, LinkButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/format";

export const metadata = {
  title: "Pricing | GuruLens",
  description: "Choose the perfect plan for your teaching needs",
};

const PLAN_COLORS: Record<string, string> = {
  free: "from-gray-400 to-gray-500",
  teacher_pro: "from-blue-500 to-blue-600",
  institute: "from-purple-500 to-purple-600",
  institute_plus: "from-purple-600 to-purple-700",
  campus_pilot: "from-green-500 to-green-600",
  campus_pro: "from-green-600 to-green-700",
};

function PlanCard({
  plan,
  isCurrentPlan,
  isLoggedIn,
}: {
  plan: any;
  isCurrentPlan: boolean;
  isLoggedIn: boolean;
}) {
  const limits = JSON.parse(plan.limits);
  const features = plan.features ? JSON.parse(plan.features) : [];

  return (
    <div
      className={cn(
        "relative rounded-2xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md",
        isCurrentPlan && "ring-2 ring-brand-500"
      )}
    >
      {isCurrentPlan && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">
          Current Plan
        </span>
      )}

      <div
        className={cn(
          "mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white",
          PLAN_COLORS[plan.type] || "from-gray-500 to-gray-600"
        )}
      >
        <Icon name={plan.type.includes("campus") ? "building" : plan.type.includes("institute") ? "users" : "user"} size={24} />
      </div>

      <h3 className="text-lg font-bold text-ink-900">{plan.name}</h3>
      <p className="mb-4 text-sm text-ink-500">{plan.description}</p>

      <div className="mb-6">
        <span className="text-3xl font-bold text-ink-900">
          {plan.priceLkr === 0 ? "Free" : `LKR ${plan.priceLkr.toLocaleString()}`}
        </span>
        {plan.priceLkr > 0 && (
          <span className="text-ink-500">/{plan.billingCycle}</span>
        )}
      </div>

      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Icon name="check" size={16} className="text-success-500" />
          <span>
            {limits.channels === -1 ? "Unlimited" : limits.channels} channels
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Icon name="check" size={16} className="text-success-500" />
          <span>
            {limits.classes === -1 ? "Unlimited" : limits.classes} classes
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Icon name="check" size={16} className="text-success-500" />
          <span>
            {limits.storage_mb >= 1000
              ? `${limits.storage_mb / 1000} GB`
              : `${limits.storage_mb} MB`}{" "}
            storage
          </span>
        </div>
        {limits.teachers && (
          <div className="flex items-center gap-2 text-sm">
            <Icon name="check" size={16} className="text-success-500" />
            <span>{limits.teachers} teachers</span>
          </div>
        )}
        {limits.branches && (
          <div className="flex items-center gap-2 text-sm">
            <Icon name="check" size={16} className="text-success-500" />
            <span>{limits.branches} branches</span>
          </div>
        )}
      </div>

      {isCurrentPlan ? (
        <Button variant="outline" className="w-full" disabled>
          Current Plan
        </Button>
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

  let currentSubscription = null;
  if (auth) {
    currentSubscription = await getUserSubscription(auth.user.id);
  }

  const teacherPlans = plans.filter((p) => ["free", "teacher_pro"].includes(p.type));
  const institutePlans = plans.filter((p) => ["institute", "institute_plus"].includes(p.type));
  const campusPlans = plans.filter((p) => ["campus_pilot", "campus_pro"].includes(p.type));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold text-ink-900">Choose Your Plan</h1>
        <p className="mx-auto max-w-2xl text-lg text-ink-600">
          Start free and upgrade as you grow. All plans include core features
          to help you teach better.
        </p>
      </div>

      {/* Current Plan Badge */}
      {currentSubscription && currentSubscription.status !== "free" && (
        <div className="mb-8 text-center">
          <span className="inline-block rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700">
            Current Plan: {currentSubscription.plan?.name}
            {currentSubscription.status === "trial" && " (Trial)"}
          </span>
        </div>
      )}

      {/* Teacher Plans */}
      <section className="mb-16">
        <div className="mb-8 text-center">
          <h2 className="mb-2 text-2xl font-bold text-ink-900">For Private Tuition Teachers</h2>
          <p className="text-ink-500">Perfect for individual teachers managing their own classes</p>
        </div>
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {teacherPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrentPlan={currentSubscription?.plan?.slug === plan.slug}
              isLoggedIn={!!auth}
            />
          ))}
        </div>
      </section>

      {/* Institute Plans */}
      <section className="mb-16">
        <div className="mb-8 text-center">
          <h2 className="mb-2 text-2xl font-bold text-ink-900">For Tuition Institutes</h2>
          <p className="text-ink-500">Manage multiple teachers, branches, and thousands of students</p>
        </div>
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {institutePlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrentPlan={currentSubscription?.plan?.slug === plan.slug}
              isLoggedIn={!!auth}
            />
          ))}
        </div>
      </section>

      {/* Campus Plans */}
      <section className="mb-16">
        <div className="mb-8 text-center">
          <h2 className="mb-2 text-2xl font-bold text-ink-900">GuruLens Campus for Schools</h2>
          <p className="text-ink-500">Complete school management solution with parent portals</p>
        </div>
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {campusPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrentPlan={currentSubscription?.plan?.slug === plan.slug}
              isLoggedIn={!!auth}
            />
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="text-center">
        <h2 className="mb-4 text-2xl font-bold text-ink-900">Questions?</h2>
        <p className="mb-4 text-ink-500">
          Contact us for custom enterprise plans or if you need help choosing the right plan.
        </p>
        <LinkButton href="/support" variant="outline">
          Contact Support
        </LinkButton>
      </section>
    </div>
  );
}
