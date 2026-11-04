import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { Icon } from "@/components/ui/icons";
import { getCurrentUser } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/constants";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Admin Console" };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!ADMIN_ROLES.includes(user.role)) redirect("/dashboard");

  const [pendingVerifications, openReports] = await Promise.all([
    db.verificationRequest.count({
      where: { status: { in: ["pending", "in_review", "more_info"] } },
    }),
    db.report.count({ where: { status: "open" } }),
  ]);

  return (
    <div className="relative isolate mx-auto w-full max-w-6xl px-4 pt-6 pb-10 sm:px-6">
      {/* Background blobs — ink tones for admin */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10">
        <div className="animate-float-slow absolute -top-32 right-[8%] size-[26rem] rounded-full bg-ink-400/8 blur-3xl" />
        <div className="animate-float-slower absolute top-80 -left-40 size-[28rem] rounded-full bg-brand-400/6 blur-3xl" />
      </div>

      <div className="animate-fade-up mb-5 flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-ink-800 to-ink-900 text-white shadow-[0_8px_20px_rgba(10,27,61,0.3)]">
          <Icon name="shield" size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Admin Console</h1>
          <p lang="si" className="font-si text-[13.5px] font-semibold text-ink-500">
            GuruLens සෑම සිසුවෙකුටම ආරක්ෂිත හා විශ්වාසදායක ලෙස තබාගන්න.
          </p>
        </div>
      </div>
      <AdminNav pendingVerifications={pendingVerifications} openReports={openReports} />
      <div className="reveal mt-6">{children}</div>
    </div>
  );
}
