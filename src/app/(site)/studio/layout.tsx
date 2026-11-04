import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { StudioNav } from "@/components/studio/StudioNav";
import { Icon } from "@/components/ui/icons";
import { getCurrentUser } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/constants";

export const metadata: Metadata = { title: "Teacher Studio" };

export default async function StudioLayout({ children }: LayoutProps<"/studio">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/studio");
  if (user.role !== "teacher" && !ADMIN_ROLES.includes(user.role)) redirect("/dashboard");

  return (
    <div className="relative isolate mx-auto w-full max-w-5xl px-4 pt-6 pb-10 sm:px-6">
      {/* Background blobs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10">
        <div className="animate-float-slow absolute -top-32 right-[8%] size-[26rem] rounded-full bg-brand-400/10 blur-3xl" />
        <div className="animate-float-slower absolute top-80 -left-40 size-[28rem] rounded-full bg-accent-500/8 blur-3xl" />
      </div>

      <div className="animate-fade-up mb-5 flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-[0_8px_20px_rgba(0,118,214,0.3)]">
          <Icon name="video" size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Teacher Studio</h1>
          <p lang="si" className="font-si text-[13.5px] font-semibold text-ink-500">
            පාඩම් publish කරන්න, quizzes පවත්වන්න, ඔබේ පන්තිය වර්ධනය කරන්න.
          </p>
        </div>
      </div>
      <StudioNav />
      <div className="reveal mt-6">{children}</div>
    </div>
  );
}
