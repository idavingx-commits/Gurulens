import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAuth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/constants";
import { CreateOrganizationForm } from "./create-organization-form";

export const metadata: Metadata = { title: "Register organization" };

export default async function CreateCampusPage() {
  const auth = await getAuth();
  if (!auth) redirect("/login?redirect=/campus/create");
  if (auth.user.role !== "teacher" && !ADMIN_ROLES.includes(auth.user.role)) {
    redirect("/campus");
  }

  const isAdmin = ADMIN_ROLES.includes(auth.user.role);

  return (
    <div className="mx-auto w-full max-w-xl px-4 pt-8 pb-12 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Register organization</h1>
        <p className="mt-1 text-[13px] text-ink-500">
          {isAdmin
            ? "Add a school or institute to GuruLens Campus. You become its owner."
            : "Register your tuition institute. Schools must be added by GuruLens admins."}
        </p>
      </div>

      <CreateOrganizationForm allowSchool={isAdmin} />
    </div>
  );
}
