import type { Metadata } from "next";
import Link from "next/link";

import { Icon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Create your account" };

const OPTIONS = [
  {
    href: "/register/student",
    icon: "compass",
    emoji: "📚",
    title: "I'm a Student / Parent",
    si: "මම සිසුවෙක් / දෙමාපියෙක්",
    points: [
      "Discover teachers by subject, grade and district",
      "Follow teachers and watch lessons & reels",
      "Rate teachers you have actually learned from",
      "Attempt quizzes and save content",
    ],
    cta: "Create student account",
    theme: "brand" as const,
  },
  {
    href: "/register/teacher",
    icon: "video",
    emoji: "🎓",
    title: "I'm a Teacher",
    si: "මම ගුරුවරයෙක්",
    points: [
      "Build a professional YouTube-style profile",
      "Publish posts, lessons, reels and quizzes",
      "Request the Verified Teacher badge",
      "See insights on views, reach and reviews",
    ],
    cta: "Create teacher account",
    theme: "ink" as const,
  },
];

export default function RegisterChooserPage() {
  return (
    <div className="animate-fade-up">
      {/* Header card */}
      <div className="relative overflow-hidden rounded-3xl bg-white p-8 text-center shadow-xl ring-1 ring-ink-100">
        {/* Decorative gradient */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-brand-500 via-accent-500 to-brand-500"
        />

        <div className="relative">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-3xl shadow-lg shadow-brand-500/25">
            <span>👋</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-ink-900">
            Join <span className="text-shimmer bg-gradient-to-r from-brand-600 via-accent-500 to-brand-500 bg-clip-text text-transparent">GuruLens</span>
          </h1>
          <p
            lang="si"
            className="font-si mx-auto mt-3 max-w-md text-[14px] leading-[1.9] font-semibold text-ink-600"
          >
            ගුරුවරුන්ට සහ සිසුන්ට වෙන වෙනම account — ඔබට ගැලපෙන එක තෝරන්න.
          </p>
        </div>
      </div>

      {/* Option cards */}
      <div className="mt-6 grid gap-5">
        {OPTIONS.map((opt, idx) => {
          const student = opt.theme === "brand";
          return (
            <Link
              key={opt.href}
              href={opt.href}
              className={`group relative overflow-hidden rounded-[1.75rem] p-7 text-white shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] ${
                student
                  ? "bg-gradient-to-br from-brand-500 via-brand-600 to-accent-600"
                  : "bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900"
              }`}
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {/* Background decorations */}
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute -top-24 -right-20 size-64 rounded-full blur-3xl transition-transform duration-500 group-hover:scale-110 ${
                  student ? "bg-white/15" : "bg-brand-500/30"
                }`}
              />
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute -bottom-32 -left-20 size-72 rounded-full blur-3xl ${
                  student ? "bg-white/10" : "bg-accent-500/20"
                }`}
              />

              {/* Header */}
              <div className="relative flex items-center gap-4">
                <span
                  className={`flex size-14 flex-none items-center justify-center rounded-2xl text-2xl shadow-lg ${
                    student ? "bg-white/20" : "bg-white/10"
                  }`}
                >
                  {opt.emoji}
                </span>
                <div>
                  <h2 className="text-xl font-black tracking-tight">{opt.title}</h2>
                  <p lang="si" className="font-si text-[13px] font-bold text-white/75">
                    {opt.si}
                  </p>
                </div>
              </div>

              {/* Feature list */}
              <ul className="relative mt-5 space-y-2.5">
                {opt.points.map((p) => (
                  <li
                    key={p}
                    className="flex items-start gap-3 text-[13px] font-medium text-white/90"
                  >
                    <span
                      className={`mt-0.5 flex size-5 flex-none items-center justify-center rounded-full ${
                        student ? "bg-white/25" : "bg-brand-500/50"
                      }`}
                    >
                      <Icon name="check" size={12} strokeWidth={3} />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>

              {/* CTA button */}
              <div className="relative mt-6">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-bold shadow-xl transition-all group-hover:-translate-y-0.5 group-hover:shadow-2xl ${
                    student
                      ? "bg-white text-brand-700"
                      : "bg-white text-ink-900"
                  }`}
                >
                  {opt.cta}
                  <Icon name="arrow-right" size={16} strokeWidth={2.5} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Sign in link */}
      <div className="mt-8 text-center">
        <p className="text-sm text-ink-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="inline-flex items-center gap-1 font-bold text-brand-600 transition-colors hover:text-brand-700"
          >
            Sign in
            <Icon name="arrow-right" size={14} />
          </Link>
        </p>
      </div>

      {/* Terms note */}
      <p className="mt-4 text-center text-[11.5px] leading-relaxed text-ink-400">
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
