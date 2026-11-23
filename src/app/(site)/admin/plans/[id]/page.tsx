import { notFound, redirect } from "next/navigation";

import { Icon } from "@/components/ui/icons";
import { getCurrentUser } from "@/lib/auth";
import { SUPER_ADMIN_ROLES } from "@/lib/constants";
import { db } from "@/lib/db";
import {
  parsePlanFeatures,
  parsePlanLimits,
  planAudience,
} from "@/lib/plan-catalog";
import { PlanEditor, type EditablePlan } from "../plan-editor";

type Props = { params: Promise<{ id: string }> };

export const metadata = { title: "Edit plan · Admin" };

export default async function EditPlanPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/plans");
  if (!SUPER_ADMIN_ROLES.includes(user.role)) redirect("/admin");

  const { id } = await params;
  const plan = await db.plan.findUnique({
    where: { id },
    include: { _count: { select: { subscriptions: true } } },
  });
  if (!plan) notFound();

  const editable: EditablePlan = {
    id: plan.id,
    name: plan.name,
    slug: plan.slug,
    type: planAudience(plan.type),
    description: plan.description ?? "",
    priceLkr: plan.priceLkr,
    billingCycle: plan.billingCycle as EditablePlan["billingCycle"],
    limits: parsePlanLimits(plan.limits),
    features: parsePlanFeatures(plan.features),
    sortOrder: plan.sortOrder,
    isActive: plan.isActive,
    subscriberCount: plan._count.subscriptions,
    updatedAt: plan.updatedAt.toISOString(),
  };

  return (
    <div>
      <div className="mb-4">
        <p className="flex items-center gap-1 text-[12px] font-bold text-ink-400">
          <Icon name="crown" size={13} /> Admin / Plans / {plan.name}
        </p>
        <h1 className="mt-1 text-xl font-extrabold tracking-tight text-ink-900">
          Edit {plan.name}
        </h1>
        <p className="mt-0.5 text-[12.5px] text-ink-500">
          Changes apply to new activations immediately. Existing subscribers keep their current
          entitlements until they switch plans.
        </p>
      </div>
      <PlanEditor plan={editable} />
    </div>
  );
}
