import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/components/layout/Logo";
import { Avatar } from "@/components/ui/avatar";
import { CountUp } from "@/components/ui/count-up";
import { Icon } from "@/components/ui/icons";
import { VerifiedTick } from "@/components/ui/primitives";
import { getAuth } from "@/lib/auth";
import { getPlatformStats, getTopReviews } from "@/lib/data";
import { truncate } from "@/lib/format";

const BULLETS = [
  { icon: "shield-check", text: "Verified badge සහිත ගුරුවරුන් — අපිම පරීක්ෂා කරලා." },
  { icon: "star", text: "Enrollment code එකකින් තහවුරු කළ සැබෑ reviews පමණයි." },
  { icon: "film", text: "Lessons, reels, videos සහ quizzes — සම්පූර්ණයෙන්ම නොමිලේ." },
];

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const auth = await getAuth();
  if (auth) redirect("/");

  const [stats, spotlight] = await Promise.all([getPlatformStats(), getTopReviews(1)]);
  const quote = spotlight[0] ?? null;

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/20">
      {/* Simple corner decorations - won't overlap content */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {/* Top-left decoration */}
        <div className="absolute -top-20 -left-20 size-40 rounded-full bg-gradient-to-br from-brand-400/20 to-accent-400/10 blur-3xl" />
        {/* Top-right decoration */}
        <div className="absolute -top-32 -right-32 size-64 rounded-full bg-gradient-to-bl from-accent-400/15 to-brand-400/10 blur-3xl" />
        {/* Bottom-left decoration */}
        <div className="absolute -bottom-32 -left-32 size-64 rounded-full bg-gradient-to-tr from-brand-400/15 to-accent-400/10 blur-3xl" />
        {/* Bottom-right decoration */}
        <div className="absolute -bottom-20 -right-20 size-40 rounded-full bg-gradient-to-tl from-accent-400/20 to-brand-400/10 blur-3xl" />
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #0a1b3d 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Small floating shapes - corners only, very subtle */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        {/* Book emoji - top left corner */}
        <div className="absolute top-8 left-6 hidden animate-float-slow text-4xl opacity-20 lg:block">📚</div>
        {/* Graduation cap - top right corner */}
        <div className="absolute top-12 right-8 hidden animate-float-slower text-3xl opacity-20 lg:block">🎓</div>
        {/* Lightbulb - bottom left */}
        <div className="absolute bottom-20 left-8 hidden animate-float-slow text-3xl opacity-20 lg:block">💡</div>
        {/* Apple - bottom right */}
        <div className="absolute bottom-12 right-10 hidden animate-float-slower text-3xl opacity-20 lg:block">🍎</div>
      </div>

      {/* Header */}
      <header className="relative z-50 flex items-center justify-between px-6 py-5 sm:px-10">
        <Logo />
        <Link
          href="/"
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-bold text-ink-600 shadow-md ring-1 ring-ink-100 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:text-brand-600"
        >
          <Icon name="arrow-left" size={16} />
          Back to home
        </Link>
      </header>

      {/* Main content */}
      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-start px-4 py-6 sm:px-8 sm:py-10 lg:py-12">
        <div className="grid w-full items-start gap-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,480px)]">
          {/* Brand showcase — desktop only */}
          <aside className="hidden lg:sticky lg:top-10 lg:block">
            {/* Badge */}
            <div className="inline-flex items-center gap-2.5 rounded-full bg-white px-4 py-2 shadow-md ring-1 ring-brand-100">
              <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-sm">
                <Icon name="sparkles" size={14} />
              </span>
              <span className="text-[13px] font-bold text-ink-700">
                Sri Lanka&apos;s #1 Teacher Platform
              </span>
              <VerifiedTick className="size-4" />
            </div>

            {/* Headline */}
            <h2 className="mt-8 text-[44px] leading-[1.08] font-black tracking-tight text-ink-900">
              Learn from teachers
              <br />
              <span className="text-shimmer bg-gradient-to-r from-brand-600 via-accent-500 to-brand-500 bg-clip-text text-transparent">
                you can trust.
              </span>
            </h2>

            {/* Sinhala subtitle */}
            <p
              lang="si"
              className="font-si mt-5 max-w-md text-[16px] leading-[1.9] font-semibold text-ink-600"
            >
              තහවුරු කළ ගුරුවරුන්, සැබෑ සිසු reviews, පාඩම් videos සහ quizzes — ඔබේ ඉගෙනීමට
              විශ්වාසනීය තැනක්.
            </p>

            {/* Stats */}
            <div className="mt-8 flex gap-8">
              <BigStat value={stats.teacherCount} label="Teachers" icon="users" />
              <BigStat value={stats.reviewCount} label="Reviews" icon="star" />
              <BigStat value={stats.districtCount} label="Districts" icon="location" />
            </div>

            {/* Feature bullets */}
            <ul className="mt-10 space-y-4">
              {BULLETS.map((b) => (
                <li key={b.text} className="flex items-start gap-4">
                  <span className="flex size-10 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/10 to-accent-500/10 text-brand-600 ring-1 ring-brand-200/50">
                    <Icon name={b.icon} size={20} />
                  </span>
                  <span
                    lang="si"
                    className="font-si pt-2 text-[14px] leading-[1.85] font-semibold text-ink-600"
                  >
                    {b.text}
                  </span>
                </li>
              ))}
            </ul>

            {/* Quote card */}
            {quote ? (
              <figure className="mt-10 max-w-md rounded-3xl bg-white p-6 shadow-lg ring-1 ring-ink-100">
                {/* Stars */}
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Icon key={n} name="star" size={18} className="text-warn-500" />
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="mt-4 text-[15px] leading-[1.85] text-ink-700">
                  &ldquo;{truncate(quote.feedback, 150)}&rdquo;
                </blockquote>

                {/* Author */}
                <figcaption className="mt-5 flex items-center gap-3 border-t border-ink-100 pt-5">
                  <Avatar
                    name={quote.author.name}
                    src={quote.author.avatarKey ? `/api/media/${quote.author.avatarKey}` : null}
                    size="md"
                    className="ring-2 ring-white shadow-md"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-ink-900">{quote.author.name}</div>
                    {quote.teacher.teacherProfile ? (
                      <Link
                        href={`/teacher/${quote.teacher.teacherProfile.handle}`}
                        className="text-[13px] text-ink-400 transition-colors hover:text-brand-600"
                      >
                        Student of {quote.teacher.name}
                      </Link>
                    ) : null}
                  </div>
                </figcaption>
              </figure>
            ) : null}
          </aside>

          {/* Form column - solid white background for clarity */}
          <div className="mx-auto w-full max-w-xl lg:mx-0">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex items-center justify-center gap-3 px-5 py-6">
        <span className="text-[11px] font-bold tracking-widest text-ink-400 uppercase">
          Built by
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/ineshdev-dark.png"
          alt="IneshDev (Pvt) Ltd"
          className="h-6 w-auto opacity-70 transition-opacity hover:opacity-100"
          width={120}
          height={30}
        />
      </footer>
    </div>
  );
}

function BigStat({ value, label, icon }: { value: number; label: string; icon: string }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-2">
        <Icon name={icon} size={18} className="text-brand-500" />
        <span className="text-3xl font-black tabular-nums text-ink-900">
          <CountUp value={value} />
        </span>
      </div>
      <div className="mt-1 text-[11px] font-bold tracking-wider text-ink-400 uppercase">
        {label}
      </div>
    </div>
  );
}
