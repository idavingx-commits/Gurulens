import Link from "next/link";
import { redirect } from "next/navigation";

import { Icon } from "@/components/ui/icons";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, SectionHeader, Stat } from "@/components/ui/primitives";
import { getCurrentUser } from "@/lib/auth";
import { SUPER_ADMIN_ROLES } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import {
  isFreeForNow,
  parsePlanFeatures,
  parsePlanLimits,
  PLAN_AUDIENCE_MAP,
  PLAN_AUDIENCES,
  planAudience,
  planPriceLabel,
} from "@/lib/plan-catalog";

export const metadata = { title: "Plans · Admin" };

export default async function AdminPlansPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/plans");
  if (!SUPER_ADMIN_ROLES.includes(user.role)) redirect("/admin");

  const plans = await db.plan.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      _count: { select: { subscriptions: true } },
    },
  });

  const totalSubscribers = plans.reduce((sum, plan) => sum + plan._count.subscriptions, 0);
  const activePlans = plans.filter((plan) => plan.isActive).length;
  const freePlans = plans.filter((plan) => plan.priceLkr === 0).length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeader
          title="Plans & feature bundles"
          subtitle="Create plans, set limits, and assign any mix of existing or brand-new features."
        />
        <LinkButton href="/admin/plans/new" size="sm">
          <Icon name="plus" size={15} /> New plan
        </LinkButton>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Plans" value={plans.length} icon="crown" />
        <Stat label="Active" value={activePlans} icon="check-circle" />
        <Stat label="Free / launch" value={freePlans} icon="sparkles" />
        <Stat label="Subscribers" value={totalSubscribers} icon="users" />
      </div>

      {plans.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon="crown"
            title="No plans yet"
            description="Create the first plan and assign the features it should unlock."
            action={
              <LinkButton href="/admin/plans/new" size="sm">
                <Icon name="plus" size={14} /> Create a plan
              </LinkButton>
            }
          />
        </div>
      ) : (
        <div className="mt-6 space-y-7">
          {PLAN_AUDIENCES.map((audience) => {
            const group = plans.filter((plan) => planAudience(plan.type) === audience.id);
            if (group.length === 0) return null;
            return (
              <section key={audience.id}>
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`flex size-7 items-center justify-center rounded-lg ${audience.soft}`}
                  >
                    <Icon name={audience.icon} size={14} />
                  </span>
                  <h2 className="text-[14px] font-extrabold text-ink-900">{audience.label}</h2>
                  <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10.5px] font-bold text-ink-500">
                    {group.length}
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {group.map((plan) => {
                    const limits = parsePlanLimits(plan.limits);
                    const features = parsePlanFeatures(plan.features);
                    const price = planPriceLabel(plan.priceLkr, plan.billingCycle);
                    return (
                      <article
                        key={plan.id}
                        className={`card flex flex-col p-4 ${!plan.isActive ? "opacity-70" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h3 className="truncate text-[14px] font-extrabold text-ink-900">
                                {plan.name}
                              </h3>
                              <span
                                className={`rounded-chip px-1.5 py-0.5 text-[9.5px] font-black uppercase ${
                                  plan.isActive
                                    ? "bg-success-100 text-success-600"
                                    : "bg-ink-100 text-ink-400"
                                }`}
                              >
                                {plan.isActive ? "Live" : "Hidden"}
                              </span>
                              {isFreeForNow(plan.priceLkr, plan.billingCycle) ? (
                                <span className="rounded-chip bg-warn-100 px-1.5 py-0.5 text-[9.5px] font-black text-warn-600 uppercase">
                                  Free now
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-0.5 truncate text-[10.5px] font-semibold text-ink-400">
                              /{plan.slug} · {plan.type}
                            </p>
                          </div>
                          <span className="flex-none text-right">
                            <span className="block text-[14px] font-extrabold text-ink-900">
                              {price.primary}
                            </span>
                            <span className="block text-[9.5px] font-bold text-ink-400">
                              {price.suffix}
                            </span>
                          </span>
                        </div>

                        <p className="mt-2 line-clamp-2 text-[11.5px] leading-relaxed text-ink-500">
                          {plan.description ?? PLAN_AUDIENCE_MAP[planAudience(plan.type)].blurb}
                        </p>

                        <div className="mt-2.5 flex flex-wrap gap-1">
                          {Object.entries(limits)
                            .slice(0, 5)
                            .map(([key, value]) => (
                              <span
                                key={key}
                                className="rounded-full bg-ink-50 px-2 py-0.5 text-[9.5px] font-bold text-ink-500"
                              >
                                {value === -1 ? "∞" : value.toLocaleString()} {key.replace(/_/g, " ")}
                              </span>
                            ))}
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-2.5 text-[10.5px] font-semibold text-ink-400">
                          <span className="inline-flex items-center gap-1">
                            <Icon name="sparkles" size={11} /> {features.length} features
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Icon name="users" size={11} /> {plan._count.subscriptions} subscribed
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] text-ink-300">
                          Updated {formatDate(plan.updatedAt)}
                        </p>

                        <div className="mt-3 flex items-center gap-1.5">
                          <Link
                            href={`/admin/plans/${plan.id}`}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[11.5px] font-bold text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-700"
                          >
                            <Icon name="pencil" size={12} /> Edit plan
                          </Link>
                          <Link
                            href={`/pricing?plan=${plan.slug}`}
                            aria-label={`Preview ${plan.name} on pricing`}
                            className="flex size-8 items-center justify-center rounded-full border border-ink-200 text-ink-400 transition-colors hover:border-brand-300 hover:text-brand-600"
                          >
                            <Icon name="external" size={13} />
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-[11.5px] text-ink-400">
        Plans with subscribers cannot be deleted — deactivate them instead so current users keep
        access. Feature keys are flexible: adding a new key here immediately makes it available to
        every plan.
      </p>
    </div>
  );
}
