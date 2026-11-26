"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError } from "@/lib/client";
import { cn } from "@/lib/format";
import {
  formatPlanLimit,
  isFreeForNow,
  isFreeTierPlan,
  isHighlightedPlan,
  PLAN_AUDIENCE_MAP,
  PLAN_AUDIENCES,
  PLAN_FEATURE_GROUPS,
  PLAN_LIMITS,
  planAudience,
  planFeatureLabel,
  planOfferLabel,
  planPriceLabel,
  type PlanAudience,
  type PlanLimitKey,
} from "@/lib/plan-catalog";

export type PricingPlan = {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  priceLkr: number;
  billingCycle: string;
  limits: Record<string, number>;
  features: string[];
};

type Props = {
  plans: PricingPlan[];
  currentSlug: string | null;
  isAuthed: boolean;
  isAdmin: boolean;
};

function PlanAction({
  plan,
  isAuthed,
  isCurrent,
}: {
  plan: PricingPlan;
  isAuthed: boolean;
  isCurrent: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const free = isFreeForNow(plan.priceLkr, plan.billingCycle);
  const audience = planAudience(plan.type);

  async function activate() {
    if (busy) return;
    setBusy(true);
    try {
      await apiFetch("/api/subscriptions", {
        method: "POST",
        body: { planSlug: plan.slug },
      });
      toast.success(`${plan.name} is now active on your account.`);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof ClientApiError ? err.message : "Could not activate this plan.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (isCurrent) {
    return (
      <Button type="button" variant="outline" disabled className="w-full justify-center">
        <Icon name="check-circle" size={15} /> Current plan
      </Button>
    );
  }

  if (free) {
    if (!isAuthed) {
      const href =
        audience === "campus"
          ? "/login?redirect=/campus/create"
          : `/register/teacher?plan=${plan.slug}`;
      return (
        <Link
          href={href}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-[13px] font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-brand-700"
        >
          <Icon name="zap" size={15} /> Start free
        </Link>
      );
    }
    return (
      <Button
        type="button"
        onClick={() => void activate()}
        disabled={busy}
        className="w-full justify-center"
      >
        {busy ? (
          <>
            <Icon name="loader" size={15} className="animate-spin" /> Activating…
          </>
        ) : (
          <>
            <Icon name="zap" size={15} /> Start free
          </>
        )}
      </Button>
    );
  }

  return (
    <Link
      href={`/support?plan=${plan.slug}`}
      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-ink-200 bg-white px-5 py-2.5 text-[13px] font-bold text-ink-800 transition-colors hover:border-brand-300 hover:text-brand-700"
    >
      <Icon name="message" size={15} /> Talk to us
    </Link>
  );
}

function PlanCard({
  plan,
  isAuthed,
  isCurrent,
}: {
  plan: PricingPlan;
  isAuthed: boolean;
  isCurrent: boolean;
}) {
  const audience = PLAN_AUDIENCE_MAP[planAudience(plan.type)];
  const price = planPriceLabel(plan.priceLkr, plan.billingCycle);
  const highlighted = isHighlightedPlan(plan.slug);
  const limitKeys: PlanLimitKey[] = ["channels", "classes", "storage_mb"];
  if (plan.limits.teachers !== undefined) limitKeys.push("teachers");
  else if (plan.limits.branches !== undefined) limitKeys.push("branches");
  else if (plan.limits.students !== undefined) limitKeys.push("students");
  else if (plan.limits.students_per_class !== undefined) limitKeys.push("students_per_class");

  const shownFeatures = plan.features.slice(0, 6);

  return (
    <article
      className={cn(
        "card-premium relative flex flex-col overflow-hidden",
        highlighted && "ring-2 ring-brand-500/60",
        isCurrent && "ring-2 ring-success-500/60",
      )}
    >
      <div className={cn("h-1.5 w-full bg-gradient-to-r", audience.gradient)} />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-chip px-2.5 py-1 text-[10px] font-black tracking-[0.1em] uppercase",
                audience.soft,
              )}
            >
              <Icon name={audience.icon} size={11} strokeWidth={2.8} />
              {audience.shortLabel}
            </span>
            <h3 className="mt-2.5 text-[17px] leading-tight font-extrabold text-ink-900">
              {plan.name}
            </h3>
            <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-[12.5px] leading-relaxed text-ink-500">
              {plan.description ?? audience.blurb}
            </p>
          </div>
          {isCurrent ? (
            <span className="flex-none rounded-full bg-success-100 px-2.5 py-1 text-[10px] font-black text-success-600 uppercase">
              Active
            </span>
          ) : highlighted ? (
            <span className="flex-none rounded-full bg-brand-600 px-2.5 py-1 text-[10px] font-black text-white uppercase shadow-sm">
              Popular
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex items-end gap-1.5">
          <span className="text-[28px] leading-none font-extrabold tracking-tight text-ink-900">
            {price.primary}
          </span>
          <span className="pb-1 text-[12px] font-bold text-ink-400">{price.suffix}</span>
        </div>
        {price.note ? (
          <p className="mt-1.5 inline-flex items-center gap-1 text-[10.5px] font-bold text-warn-600">
            <Icon name="sparkles" size={11} /> {price.note}
          </p>
        ) : (
          <p className="mt-1.5 text-[10.5px] font-semibold text-ink-300">
            No card required during launch
          </p>
        )}
        <p
          className={cn(
            "mt-2 inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 text-[9.5px] font-black tracking-wide uppercase",
            isFreeTierPlan(plan.slug)
              ? "bg-success-100 text-success-600"
              : "bg-warn-100 text-warn-600",
          )}
        >
          <Icon
            name={isFreeTierPlan(plan.slug) ? "check-circle" : "clock"}
            size={10}
            strokeWidth={2.6}
          />
          {planOfferLabel(plan.slug)}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-1.5">
          {limitKeys.map((key) => {
            const meta = PLAN_LIMITS.find((limit) => limit.key === key);
            if (!meta) return null;
            const value = plan.limits[key];
            if (value === undefined) return null;
            return (
              <span
                key={key}
                className="flex items-center gap-1.5 rounded-xl bg-ink-50 px-2.5 py-1.5 text-[11px] font-bold text-ink-600"
                title={meta.hint}
              >
                <Icon name={meta.icon} size={12} className={audience.accent} />
                {formatPlanLimit(key, value)}
                <span className="font-semibold text-ink-400">{meta.shortLabel}</span>
              </span>
            );
          })}
        </div>

        <ul className="mt-4 flex-1 space-y-1.5">
          {shownFeatures.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-[12px] leading-snug text-ink-600">
              <Icon
                name="check"
                size={13}
                strokeWidth={3}
                className="mt-0.5 flex-none text-success-600"
              />
              <span>{planFeatureLabel(feature)}</span>
            </li>
          ))}
          {plan.features.length > shownFeatures.length ? (
            <li className="pl-5 text-[11.5px] font-semibold text-ink-400">
              + {plan.features.length - shownFeatures.length} more features
            </li>
          ) : null}
          {plan.features.length === 0 ? (
            <li className="text-[11.5px] font-semibold text-ink-400">
              Core tools for getting started.
            </li>
          ) : null}
        </ul>

        <div className="mt-5">
          <PlanAction plan={plan} isAuthed={isAuthed} isCurrent={isCurrent} />
        </div>
      </div>
    </article>
  );
}

function CompareTable({ plans }: { plans: PricingPlan[] }) {
  const limitRows = PLAN_LIMITS.filter((limit) =>
    plans.some((plan) => plan.limits[limit.key] !== undefined),
  );
  const featureKeys = [...new Set(plans.flatMap((plan) => plan.features))].sort((a, b) =>
    planFeatureLabel(a).localeCompare(planFeatureLabel(b)),
  );

  return (
    <details className="card group mt-8 overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
        <span className="flex items-center gap-2 text-[14px] font-extrabold text-ink-900">
          <Icon name="list" size={16} className="text-brand-600" />
          Compare everything included
        </span>
        <span className="flex items-center gap-1 text-[11.5px] font-bold text-ink-400">
          Open table
          <Icon
            name="chevron-down"
            size={14}
            className="transition-transform group-open:rotate-180"
          />
        </span>
      </summary>
      <div className="overflow-x-auto border-t border-ink-100">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="bg-ink-50/70">
              <th className="px-4 py-2.5 text-[11px] font-black tracking-wide text-ink-400 uppercase">
                Included
              </th>
              {plans.map((plan) => (
                <th
                  key={plan.id}
                  className="px-3 py-2.5 text-[11.5px] font-extrabold text-ink-800"
                >
                  {plan.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {limitRows.map((limit) => (
              <tr key={limit.key} className="border-t border-ink-100">
                <td className="px-4 py-2 text-[12px] font-bold text-ink-600">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name={limit.icon} size={12} className="text-ink-400" />
                    {limit.label}
                  </span>
                </td>
                {plans.map((plan) => (
                  <td key={plan.id} className="px-3 py-2 text-[12px] font-semibold text-ink-700">
                    {plan.limits[limit.key] === undefined
                      ? "—"
                      : formatPlanLimit(limit.key, plan.limits[limit.key]!)}
                  </td>
                ))}
              </tr>
            ))}
            {featureKeys.map((feature) => (
              <tr key={feature} className="border-t border-ink-100">
                <td className="px-4 py-2 text-[12px] font-semibold text-ink-600">
                  {planFeatureLabel(feature)}
                </td>
                {plans.map((plan) => (
                  <td key={plan.id} className="px-3 py-2">
                    {plan.features.includes(feature) ? (
                      <Icon
                        name="check-circle"
                        size={15}
                        className="text-success-600"
                        aria-label="Included"
                      />
                    ) : (
                      <span className="text-ink-300">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function PricingPlans({ plans, currentSlug, isAuthed, isAdmin }: Props) {
  const currentPlan = plans.find((plan) => plan.slug === currentSlug) ?? null;
  const initialAudience = currentPlan
    ? planAudience(currentPlan.type)
    : plans[0]
      ? planAudience(plans[0].type)
      : "teacher";
  const [audience, setAudience] = useState<PlanAudience>(initialAudience);

  const byAudience = useMemo(() => {
    const groups: Record<PlanAudience, PricingPlan[]> = {
      teacher: [],
      institute: [],
      campus: [],
    };
    // Preserve the server's sortOrder (admins control ordering).
    for (const plan of plans) groups[planAudience(plan.type)].push(plan);
    return groups;
  }, [plans]);

  const activePlans = byAudience[audience];
  const audienceMeta = PLAN_AUDIENCE_MAP[audience];

  return (
    <div className="pb-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-ink-900 via-brand-800 to-accent-700 px-5 py-7 text-white shadow-xl sm:px-9 sm:py-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-16 size-80 rounded-full bg-brand-400/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-20 size-80 rounded-full bg-accent-400/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-chip bg-white/15 px-3 py-1 text-[10px] font-black tracking-[0.16em] uppercase backdrop-blur-sm">
              <Icon name="crown" size={11} /> GuruLens plans
            </span>
            <h1 className="mt-3 text-3xl leading-[1.08] font-extrabold tracking-tight sm:text-[40px]">
              Every plan is{" "}
              <span className="bg-gradient-to-r from-brand-200 via-white to-success-100 bg-clip-text text-transparent">
                100% free
              </span>{" "}
              during launch.
            </h1>
            <p
              lang="si"
              className="font-si mt-3 max-w-xl text-[13.5px] leading-[1.85] font-semibold text-white/75"
            >
              ගුරුවරුන්, ටියුෂන් ආයතන සහ පාසල් සඳහා සැලසුම් — දැන් සියල්ලම නොමිලේ. ගෙවීම් පද්ධතිය
              එන අලුත් update එකේදී පමණක් ක්‍රියාත්මක වේ.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-chip bg-success-500 px-3 py-1.5 text-[11px] font-black text-white shadow-sm">
                <Icon name="sparkles" size={12} /> No card required
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-chip bg-white/12 px-3 py-1.5 text-[11px] font-bold text-white/90 backdrop-blur-sm">
                <Icon name="refresh" size={12} /> Switch any time
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-chip bg-white/12 px-3 py-1.5 text-[11px] font-bold text-white/90 backdrop-blur-sm">
                <Icon name="shield-check" size={12} /> Keep your content
              </span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-5 shadow-xl backdrop-blur-md">
            <div className="flex items-end gap-2">
              <span className="text-[58px] leading-none font-black tracking-[-0.05em] sm:text-[66px]">
                100%
              </span>
              <span className="pb-2 text-[18px] font-black tracking-[0.18em] text-success-100">
                OFF
              </span>
            </div>
            <p className="mt-1 text-[13px] font-bold text-white/90">
              Teachers · Institutes · Schools
            </p>
            <div className="mt-3 space-y-2 text-[11.5px] font-semibold text-white/75">
              <p className="flex items-start gap-2">
                <Icon name="check-circle" size={13} className="mt-0.5 flex-none text-success-100" />
                Subscriptions are free right now — every feature included.
              </p>
              <p className="flex items-start gap-2">
                <Icon name="clock" size={13} className="mt-0.5 flex-none text-warn-100" />
                Payment will be required in a future update, never today.
              </p>
              <p className="flex items-start gap-2">
                <Icon name="info" size={13} className="mt-0.5 flex-none text-brand-200" />
                We&apos;ll announce billing well before it begins.
              </p>
            </div>
            <p className="mt-3 rounded-xl bg-ink-900/35 px-3 py-2 text-[10.5px] leading-relaxed font-semibold text-white/65">
              Teachers, tuition institutes and campuses each get a limited free version that stays
              free after launch.
            </p>
          </div>
        </div>
      </section>

      {/* Launch pricing explainer */}
      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: "zap",
            title: "Free for now",
            text: "Start any plan with zero payment. Your limits and features activate immediately.",
            tone: "text-success-600 bg-success-100",
          },
          {
            icon: "credit-card",
            title: "Paid in a future update",
            text: "Payments are not live yet. When they are, existing accounts get advance notice.",
            tone: "text-warn-600 bg-warn-100",
          },
          {
            icon: "shield-check",
            title: "Limited free versions",
            text: "Teacher, institute and campus free tiers stay free — with sensible limits.",
            tone: "text-brand-600 bg-brand-50",
          },
        ].map((item) => (
          <div key={item.title} className="card flex items-start gap-3 p-4">
            <span className={`flex size-9 flex-none items-center justify-center rounded-xl ${item.tone}`}>
              <Icon name={item.icon} size={16} />
            </span>
            <div>
              <p className="text-[12.5px] font-extrabold text-ink-900">{item.title}</p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-500">{item.text}</p>
            </div>
          </div>
        ))}
      </section>

      {isAdmin ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-2.5">
          <p className="text-[12px] font-semibold text-brand-800">
            You are an admin. Plans, limits and feature bundles are fully editable.
          </p>
          <Link
            href="/admin/plans"
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3.5 py-1.5 text-[12px] font-bold text-white transition-colors hover:bg-brand-700"
          >
            <Icon name="settings" size={13} /> Manage plans
          </Link>
        </div>
      ) : null}

      {/* Audience tabs */}
      <div
        role="tablist"
        aria-label="Plan audience"
        className="mt-5 grid gap-2 sm:grid-cols-3"
      >
        {PLAN_AUDIENCES.map((item) => {
          const active = audience === item.id;
          const count = byAudience[item.id].length;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setAudience(item.id)}
              className={cn(
                "group flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all",
                active
                  ? "border-transparent bg-ink-900 text-white shadow-lg"
                  : "border-ink-200 bg-white/80 text-ink-700 hover:border-brand-300 hover:bg-white",
              )}
            >
              <span
                className={cn(
                  "flex size-9 flex-none items-center justify-center rounded-xl transition-colors",
                  active ? "bg-white/15 text-white" : "bg-ink-100 text-ink-500 group-hover:bg-brand-50 group-hover:text-brand-600",
                )}
              >
                <Icon name={item.icon} size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[13px] font-extrabold">
                  {item.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[9.5px] font-black",
                      active ? "bg-white/15 text-white/80" : "bg-ink-100 text-ink-400",
                    )}
                  >
                    {count}
                  </span>
                </span>
                <span
                  className={cn(
                    "mt-0.5 block truncate text-[11px] font-medium",
                    active ? "text-white/60" : "text-ink-400",
                  )}
                >
                  {item.blurb}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Plan cards */}
      <section className="mt-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-[18px] font-extrabold tracking-tight text-ink-900">
              {audienceMeta.label}
            </h2>
            <p className="text-[12px] text-ink-500">{audienceMeta.blurb}</p>
          </div>
          <span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-ink-400">
            <Icon name="credit-card" size={12} /> Billed {audience === "campus" ? "per campus" : "per account"}
          </span>
        </div>

        {activePlans.length === 0 ? (
          <div className="card p-8 text-center">
            <span className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
              <Icon name="crown" size={20} />
            </span>
            <p className="mt-3 text-[14px] font-bold text-ink-800">Plans are being prepared</p>
            <p className="mt-1 text-[12.5px] text-ink-500">
              Talk to us and we will set up the right plan for you.
            </p>
            <Link
              href="/support"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-[12.5px] font-bold text-white"
            >
              <Icon name="message" size={14} /> Contact GuruLens
            </Link>
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-4",
              activePlans.length === 1
                ? "max-w-md"
                : activePlans.length === 2
                  ? "md:grid-cols-2"
                  : "md:grid-cols-2 xl:grid-cols-3",
            )}
          >
            {activePlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isAuthed={isAuthed}
                isCurrent={plan.slug === currentSlug}
              />
            ))}
          </div>
        )}
      </section>

      <CompareTable plans={activePlans} />

      {/* Feature groups */}
      <section className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-accent-100 text-accent-700">
            <Icon name="sparkles" size={15} />
          </span>
          <div>
            <h2 className="text-[16px] font-extrabold tracking-tight text-ink-900">
              Built around how you teach
            </h2>
            <p className="text-[12px] text-ink-500">
              Feature bundles grow with you — no surprise add-ons.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PLAN_FEATURE_GROUPS.filter((group) =>
            group.features.some((feature) => feature.groups.includes(audience)),
          ).map((group) => (
            <div key={group.id} className="card p-4">
              <span className="flex size-8 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Icon name={group.icon} size={15} />
              </span>
              <h3 className="mt-2 text-[13px] font-extrabold text-ink-900">{group.title}</h3>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-500">
                {group.description}
              </p>
              <ul className="mt-2 space-y-1">
                {group.features
                  .filter((feature) => feature.groups.includes(audience))
                  .slice(0, 4)
                  .map((feature) => (
                    <li
                      key={feature.key}
                      className="flex items-start gap-1.5 text-[11.5px] text-ink-600"
                    >
                      <Icon
                        name="check"
                        size={11}
                        strokeWidth={3}
                        className="mt-0.5 flex-none text-success-600"
                      />
                      {feature.label}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-8">
        <h2 className="text-[16px] font-extrabold tracking-tight text-ink-900">
          Plan questions
        </h2>
        <div className="mt-3 space-y-2">
          {[
            {
              q: "Are the prices final—and when do I pay?",
              a: "Not yet. Subscriptions are 100% free during our launch while we finalise Sri Lankan payments. Payment will be required in a future update. We will announce the date, pricing and grace period well in advance — nothing is charged today and no card is stored.",
            },
            {
              q: "Is there a free version that stays free?",
              a: "Yes. The GuruLens Free teacher plan, Institute Starter and Campus Starter are limited free versions. They remain free after the launch offer, with sensible limits on channels, classes and LMS courses.",
            },
            {
              q: "What do teachers, institutes and schools get?",
              a: "Teachers get a professional profile, classes, channels and a personal LMS subdomain. Institutes add multi-teacher dashboards, fees and branches. Schools add grades, timetables, staff/student IDs and a branded campus LMS.",
            },
            {
              q: "Can I change plans later?",
              a: "Yes. Starting a new plan replaces the old active plan on the same account. Your content, classes and channels stay exactly where they are.",
            },
            {
              q: "What happens if I hit a limit?",
              a: "You keep everything you have created. You simply cannot add more channels, classes or teacher seats until you move to a plan with more room.",
            },
            {
              q: "Do schools need student accounts?",
              a: "School staff and students get school-specific accounts. Public visitors can still see the school profile, published posts and class pages.",
            },
            {
              q: "Who decides what is in a plan?",
              a: "GuruLens admins manage plan limits and feature bundles from the admin console, so we can adjust a plan without rebuilding the website.",
            },
          ].map((item) => (
            <details key={item.q} className="card group px-4 py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[12.5px] font-bold text-ink-800">
                {item.q}
                <Icon
                  name="chevron-down"
                  size={14}
                  className="flex-none text-ink-400 transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="mt-2 text-[12px] leading-relaxed text-ink-500">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
