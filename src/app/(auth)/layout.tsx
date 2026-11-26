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

const HIGHLIGHTS = [
  {
    icon: "shield-check",
    title: "Verified teachers, real classrooms",
    text: "Badges are granted after checks. Enrollment codes keep reviews honest.",
  },
  {
    icon: "sparkles",
    title: "Lessons, reels, quizzes & your own LMS",
    text: "Everything you need to teach, share and track progress — in one place.",
  },
  {
    icon: "crown",
    title: "100% free during launch",
    text: "Every plan is free while we finish local payments. No card needed today.",
  },
];

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const auth = await getAuth();
  if (auth) redirect("/");

  const [stats, spotlight] = await Promise.all([getPlatformStats(), getTopReviews(1)]);
  const quote = spotlight[0] ?? null;

  return (
    <div className="min-h-dvh bg-[#eef4ff] lg:grid lg:grid-cols-[1.06fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-ink-900 text-white lg:flex lg:flex-col">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -left-24 size-[28rem] rounded-full bg-brand-500/25 blur-[110px]" />
          <div className="absolute top-1/3 -right-32 size-[26rem] rounded-full bg-accent-500/25 blur-[120px]" />
          <div className="absolute -bottom-40 left-1/4 size-[30rem] rounded-full bg-brand-400/15 blur-[130px]" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
              backgroundSize: "54px 54px",
            }}
          />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        </div>

        <div className="relative flex flex-1 flex-col p-10 xl:p-14">
          <Logo dark />

          <div className="mt-12 max-w-lg">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-[11px] font-bold tracking-[0.14em] uppercase backdrop-blur-md">
              <span className="size-1.5 animate-pulse rounded-full bg-success-500" />
              Sri Lanka&apos;s teaching platform
            </span>

            <h1 className="mt-6 text-[46px] leading-[1.04] font-black tracking-[-0.03em] xl:text-[54px]">
              Teach boldly.
              <br />
              <span className="bg-gradient-to-r from-brand-300 via-white to-accent-300 bg-clip-text text-transparent">
                Learn deeply.
              </span>
            </h1>

            <p
              lang="si"
              className="font-si mt-5 max-w-md text-[15px] leading-[1.9] font-semibold text-white/70"
            >
              තහවුරු කළ ගුරුවරුන්, සැබෑ සිසු සමාලෝචන, පාඩම් වීඩියෝ සහ quizzes — ඔබේ ඉගෙනීමට
              විශ්වාසනීයම තැන.
            </p>

            <div className="mt-8 flex items-center gap-8">
              <BigStat value={stats.teacherCount} label="Teachers" icon="users" />
              <span className="h-9 w-px bg-white/15" />
              <BigStat value={stats.reviewCount} label="Reviews" icon="star" />
              <span className="h-9 w-px bg-white/15" />
              <BigStat value={stats.districtCount} label="Districts" icon="location" />
            </div>
          </div>

          <ul className="mt-10 grid max-w-lg gap-2.5">
            {HIGHLIGHTS.map((item) => (
              <li
                key={item.title}
                className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md transition-colors hover:bg-white/[0.09]"
              >
                <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-brand-400/30 to-accent-400/20 text-brand-200 ring-1 ring-white/10">
                  <Icon name={item.icon} size={19} />
                </span>
                <span>
                  <span className="block text-[13.5px] font-bold text-white">{item.title}</span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-white/55">
                    {item.text}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {quote ? (
            <figure className="mt-auto max-w-lg rounded-2xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur-md">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Icon key={n} name="star" size={14} className="text-amber-300" />
                ))}
                <span className="ml-2 text-[10.5px] font-bold tracking-wider text-white/45 uppercase">
                  From a real review
                </span>
              </div>
              <blockquote className="mt-2.5 text-[13px] leading-[1.75] text-white/80">
                &ldquo;{truncate(quote.feedback, 140)}&rdquo;
              </blockquote>
              <figcaption className="mt-3 flex items-center gap-2.5">
                <Avatar
                  name={quote.author.name}
                  src={quote.author.avatarKey ? `/api/media/${quote.author.avatarKey}` : null}
                  size="sm"
                />
                <span className="text-[12px] font-bold text-white/90">{quote.author.name}</span>
                <VerifiedTick className="size-4" />
              </figcaption>
            </figure>
          ) : null}
        </div>
      </aside>

      {/* Form panel */}
      <div className="relative flex min-h-dvh flex-col bg-[#f7f9ff]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-brand-100/70 via-brand-50/30 to-transparent"
        />

        <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <Logo className="lg:hidden" />
          <span className="hidden lg:block" />
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-ink-200/80 bg-white/70 px-3.5 py-2 text-[12px] font-bold text-ink-500 shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-700 hover:shadow-md"
          >
            <Icon name="arrow-left" size={14} />
            Back to home
          </Link>
        </header>

        <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-6 sm:px-8 sm:py-10">
          <div className="w-full max-w-[520px]">{children}</div>
        </main>

        <footer className="relative z-10 flex flex-col items-center gap-3 px-5 py-6 sm:flex-row sm:justify-between sm:px-10">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold tracking-[0.16em] text-ink-400 uppercase">
              Built by
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/ineshdev-dark.png"
              alt="IneshDev (Pvt) Ltd"
              className="h-5 w-auto opacity-60 transition-opacity hover:opacity-100"
              width={120}
              height={30}
            />
          </div>
          <div className="flex items-center gap-3 text-[10.5px] font-semibold text-ink-400">
            <span className="inline-flex items-center gap-1">
              <Icon name="lock" size={11} /> Secure sign-in
            </span>
            <span className="size-1 rounded-full bg-ink-300" />
            <span className="inline-flex items-center gap-1">
              <Icon name="check-circle" size={11} /> Free during launch
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

function BigStat({ value, label, icon }: { value: number; label: string; icon: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <Icon name={icon} size={15} className="text-brand-300" />
        <span className="text-[26px] leading-none font-black tabular-nums tracking-tight text-white">
          <CountUp value={value} />
        </span>
      </div>
      <div className="mt-1.5 text-[10px] font-bold tracking-[0.12em] text-white/45 uppercase">
        {label}
      </div>
    </div>
  );
}
