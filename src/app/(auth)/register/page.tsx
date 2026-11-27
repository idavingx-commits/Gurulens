import type { Metadata } from "next";
import Link from "next/link";

import { Icon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Create your account" };

const OPTIONS = [
  {
    href: "/register/student",
    icon: "compass",
    eyebrow: "For learners & parents",
    title: "Student / Parent",
    si: "මම සිසුවෙක් / දෙමාපියෙක්",
    points: [
      "Find teachers by subject, grade & district",
      "Watch lessons, reels and attempt quizzes",
      "Review teachers you actually learned from",
    ],
    cta: "Create student account",
    theme: "light" as const,
    badge: "Free forever",
  },
  {
    href: "/register/teacher",
    icon: "video",
    eyebrow: "For educators & institutes",
    title: "Teacher",
    si: "මම ගුරුවරයෙක්",
    points: [
      "Professional profile with verified badge",
      "Classes, channels, posts, reels & quizzes",
      "Your own LMS on a branded subdomain",
    ],
    cta: "Create teacher account",
    theme: "dark" as const,
    badge: "All plans free",
  },
];

const ORG_OPTIONS = [
  {
    href: "/register/school",
    icon: "school",
    title: "School",
    si: "පාසලක් ලියාපදිංචි කරන්න",
    blurb: "Campus profile, staff & student accounts, timetables and a branded LMS.",
    accent: "from-success-500 to-brand-600",
  },
  {
    href: "/register/institute",
    icon: "users",
    title: "Tuition institute",
    si: "ටියුෂන් ආයතනයක් ලියාපදිංචි කරන්න",
    blurb: "Multiple teachers, branches, classes, fee-ready plans and your own learning hub.",
    accent: "from-accent-500 to-brand-600",
  },
] as const;

export default function RegisterChooserPage() {
  return (
    <div className="animate-fade-up space-y-5">
      <div className="relative overflow-hidden rounded-[1.9rem] border border-white bg-white/95 p-7 text-center shadow-[0_24px_70px_-32px_rgba(10,27,61,0.3)] ring-1 ring-ink-100/80 sm:p-8">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-brand-500 via-accent-500 to-brand-500"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 left-1/2 size-48 -translate-x-1/2 rounded-full bg-brand-100/70 blur-3xl"
        />

        <div className="relative">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-600 text-white shadow-lg shadow-brand-500/25 ring-4 ring-white">
            <Icon name="user-plus" size={26} strokeWidth={2.1} />
          </div>
          <h1 className="mt-4 text-[28px] leading-tight font-black tracking-tight text-ink-900">
            Join{" "}
            <span className="bg-gradient-to-r from-brand-600 via-accent-500 to-brand-500 bg-clip-text text-transparent">
              GuruLens
            </span>
          </h1>
          <p
            lang="si"
            className="font-si mx-auto mt-2 max-w-sm text-[13px] leading-[1.8] font-semibold text-ink-500"
          >
            ගුරුවරුන්ට සහ සිසුන්ට වෙන වෙනම account — ඔබට ගැලපෙන එක තෝරන්න.
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-success-100 px-3 py-1 text-[10.5px] font-black tracking-[0.08em] text-success-600 uppercase">
            <Icon name="sparkles" size={11} strokeWidth={2.6} />
            100% free during launch · no card needed
          </span>
        </div>
      </div>

      <div className="grid gap-4">
        {OPTIONS.map((opt) => {
          const dark = opt.theme === "dark";
          return (
            <Link
              key={opt.href}
              href={opt.href}
              className={`group relative overflow-hidden rounded-[1.6rem] p-5 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl sm:p-6 ${
                dark
                  ? "bg-gradient-to-br from-ink-900 via-ink-800 to-brand-900 text-white ring-1 ring-ink-800"
                  : "border border-white bg-white/95 text-ink-900 ring-1 ring-ink-100"
              }`}
            >
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute -top-20 -right-16 size-48 rounded-full blur-3xl transition-transform duration-500 group-hover:scale-110 ${
                  dark ? "bg-brand-500/30" : "bg-brand-100/80"
                }`}
              />

              <div className="relative flex items-start gap-4">
                <span
                  className={`flex size-12 flex-none items-center justify-center rounded-2xl shadow-lg ${
                    dark
                      ? "bg-white/10 text-brand-200 ring-1 ring-white/15"
                      : "bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-brand-500/25"
                  }`}
                >
                  <Icon name={opt.icon} size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-black tracking-[0.12em] uppercase ${
                        dark ? "text-brand-300" : "text-brand-600"
                      }`}
                    >
                      {opt.eyebrow}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9.5px] font-black uppercase ${
                        dark ? "bg-success-500/20 text-success-100" : "bg-success-100 text-success-600"
                      }`}
                    >
                      {opt.badge}
                    </span>
                  </div>
                  <h2 className="mt-1 text-[19px] leading-tight font-black tracking-tight">
                    {opt.title}
                  </h2>
                  <p
                    lang="si"
                    className={`font-si text-[11.5px] font-bold ${
                      dark ? "text-white/55" : "text-ink-400"
                    }`}
                  >
                    {opt.si}
                  </p>
                </div>
              </div>

              <ul className="relative mt-4 grid gap-1.5">
                {opt.points.map((p) => (
                  <li
                    key={p}
                    className={`flex items-start gap-2 text-[12.5px] leading-snug ${
                      dark ? "text-white/75" : "text-ink-600"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex size-4 flex-none items-center justify-center rounded-full ${
                        dark ? "bg-brand-500/30 text-brand-200" : "bg-success-100 text-success-600"
                      }`}
                    >
                      <Icon name="check" size={10} strokeWidth={3.2} />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>

              <span
                className={`relative mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12.5px] font-bold transition-all group-hover:gap-3 ${
                  dark ? "bg-white text-ink-900" : "bg-ink-900 text-white"
                }`}
              >
                {opt.cta}
                <Icon name="arrow-right" size={14} strokeWidth={2.6} />
              </span>
            </Link>
          );
        })}
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-ink-200/70 bg-white/70 p-4">
        <span className="flex size-9 flex-none items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Icon name="school" size={17} />
        </span>
        <p className="text-[12px] leading-relaxed text-ink-500">
          <span className="font-bold text-ink-700">Joining a school?</span> Pick your account type
          above and add your school, admission number or staff ID during sign-up. Your school
          approves it before class timetables unlock.
        </p>
      </div>

      <section className="relative overflow-hidden rounded-[1.6rem] border border-white bg-gradient-to-br from-brand-50 via-white to-accent-50 p-5 shadow-lg ring-1 ring-ink-100/80 sm:p-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-14 size-44 rounded-full bg-accent-100/70 blur-3xl"
        />
        <div className="relative">
          <div className="flex items-start gap-3.5">
            <span className="flex size-11 flex-none items-center justify-center rounded-2xl bg-white text-brand-600 shadow-sm ring-1 ring-ink-100">
              <Icon name="school" size={21} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[18px] leading-tight font-black tracking-tight text-ink-900">
                  Register your organization
                </h2>
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[9px] font-black tracking-wide text-brand-700 uppercase">
                  Schools & institutes
                </span>
              </div>
              <p
                lang="si"
                className="font-si text-[11.5px] leading-[1.8] font-bold text-ink-500"
              >
                පාසලක් හෝ ටියුෂන් ආයතනයක් නම්, ඔබේ campus එක සහ branded LMS එක එකවර ආරම්භ කරන්න.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {ORG_OPTIONS.map((org) => (
              <Link
                key={org.href}
                href={org.href}
                className="group relative overflow-hidden rounded-2xl border border-white bg-white/90 p-4 ring-1 ring-ink-100 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex size-9 flex-none items-center justify-center rounded-xl bg-gradient-to-br ${org.accent} text-white shadow-sm`}
                  >
                    <Icon name={org.icon} size={17} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[13.5px] font-extrabold text-ink-900">{org.title}</h3>
                    <p lang="si" className="font-si truncate text-[10.5px] font-bold text-ink-400">
                      {org.si}
                    </p>
                  </div>
                  <Icon
                    name="arrow-right"
                    size={14}
                    className="ml-auto flex-none text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600"
                  />
                </div>
                <p className="mt-2 text-[11.5px] leading-relaxed text-ink-500">{org.blurb}</p>
              </Link>
            ))}
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-[10.5px] font-semibold text-ink-400">
            <Icon name="sparkles" size={11} className="text-brand-500" />
            Includes a free branded hub at yourname.gurulens.us during launch.
          </p>
        </div>
      </section>

      <div className="text-center">
        <p className="text-sm text-ink-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="inline-flex items-center gap-1 font-bold text-brand-600 transition-colors hover:text-brand-700"
          >
            Sign in
            <Icon name="arrow-right" size={13} />
          </Link>
        </p>
      </div>

      <p className="text-center text-[11px] leading-relaxed text-ink-400">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="font-semibold text-ink-600 underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/guidelines" className="font-semibold text-ink-600 underline">
          Community Guidelines
        </Link>
        . You must be 13 or older.
      </p>
    </div>
  );
}
