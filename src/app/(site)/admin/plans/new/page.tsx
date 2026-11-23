import { redirect } from "next/navigation";

import { Icon } from "@/components/ui/icons";
import { getCurrentUser } from "@/lib/auth";
import { SUPER_ADMIN_ROLES } from "@/lib/constants";
import { PlanEditor } from "../plan-editor";

export const metadata = { title: "New plan · Admin" };

export default async function NewPlanPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/plans/new");
  if (!SUPER_ADMIN_ROLES.includes(user.role)) redirect("/admin");

  return (
    <div>
      <div className="mb-4">
        <p className="flex items-center gap-1 text-[12px] font-bold text-ink-400">
          <Icon name="crown" size={13} /> Admin / Plans / New
        </p>
        <h1 className="mt-1 text-xl font-extrabold tracking-tight text-ink-900">
          Create a subscription plan
        </h1>
        <p className="mt-0.5 text-[12.5px] text-ink-500">
          Set the audience, limits and feature bundle. New plans appear on the pricing page
          immediately when they are visible.
        </p>
      </div>
      <PlanEditor />
    </div>
  );
}
