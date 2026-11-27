import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { Logo } from "@/components/layout/Logo";
import { LmsClaimForm } from "@/components/lms/LmsClaimForm";
import { ContactChannels, ContactCtaCard } from "@/components/marketing/contact-panel";
import { Icon } from "@/components/ui/icons";
import { SectionHeader } from "@/components/ui/primitives";
import { getAuth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "GuruLens LMS — your own learning hub on your own subdomain",
  description:
    "Launch a full learning management system for your private tuition classes, institute or school at <yourname>.gurulens.us. Courses, lessons, learners and progress tracking.",
  alternates: { canonical: "/lms" },
};

const AUDIENCES = [
  {
    icon: "user",
    title: "Private teachers",
    body: "Run your own classes, publish lessons and track every learner's progress from one branded hub.",
    points: ["Your own subdomain", "Course builder", "Progress tracking"],
  },
  {
    icon: "school",
    title: "Tuition institutes",
    body: "Give every lecturer a place to publish courses and keep students enrolled, notified and moving forward.",
    points: ["Multiple courses", "Announcements", "Learner approvals"],
  },
  {
    icon: "grid",
    title: "Schools",
    body: "Bring the whole campus online with a private hub for classes, resources and announcements.",
    points: ["Campus branding", "Members-only courses", "Verified learning"],
  },
] as const;

const STEPS = [
  {
    icon: "key",
    title: "Claim your address",
    body: "Pick a name like acme.gurulens.us. It is reserved for you the moment you claim it — no domain to buy.",
    tag: "About 2 minutes",
  },
  {
    icon: "book",
    title: "Build your first course",
    body: "Add modules and lessons with text, video and durations. Draft first, publish when you are ready.",
    tag: "Modules & lessons",
  },
  {
    icon: "users",
    title: "Invite your learners",
    body: "Students enroll in one click. Public courses open instantly, member courses need your approval.",
    tag: "Public or members-only",
  },
  {
    icon: "target",
    title: "Track progress",
    body: "See enrollment, lesson completion and course progress across your whole hub from one dashboard.",
    tag: "Live learner insights",
  },
] as const;

const FEATURES = [
  {
    icon: "globe",
    title: "Branded subdomain",
    body: "Your hub lives at yourname.gurulens.us — a real, shareable address for your students.",
  },
  {
    icon: "video",
    title: "Rich lessons",
    body: "Write lessons, attach video links and set durations. Preview lessons are open to everyone.",
  },
  {
    icon: "shield-check",
    title: "Members-only access",
    body: "Keep courses private to enrolled learners, or open them to the public to attract new students.",
  },
  {
    icon: "bell",
    title: "Announcements",
    body: "Pin updates to the top of your hub so no learner misses a schedule change.",
  },
  {
    icon: "chart",
    title: "Progress & completion",
    body: "Learners mark lessons complete and finish courses — you watch completion rates rise.",
  },
  {
    icon: "lock",
    title: "Plan-based limits",
    body: "Free plans include starter limits. Upgrade any time as your hub grows.",
  },
] as const;

const HERO_STATS = [
  { value: "1", label: "Claim to go live", icon: "zap" },
  { value: "∞", label: "Learners welcome", icon: "users" },
  { value: "100%", label: "Launch offer", icon: "sparkles" },
  { value: "LKR 0", label: "Setup fees", icon: "credit-card" },
] as const;

const HERO_CARDS = [
  {
    icon: "globe",
    title: "Your own branded address",
    body: "Your hub opens at yourname.gurulens.us. It is included free — there is no domain to buy.",
  },
  {
    icon: "book-open",
    title: "Courses, lessons & learners",
    body: "Build modules, publish lessons, enroll students and keep every class in one place.",
  },
  {
    icon: "chart",
    title: "Progress you can actually see",
    body: "Lesson completion, course progress and announcements for every learner, live.",
  },
] as const;

export default async function LmsLandingPage() {
  const auth = await getAuth();

  return (
    <div className="aurora min-h-dvh">
      <header className="glass sticky top-0 z-40 rounded-none border-x-0 border-t-0">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="rounded-full bg-gradient-to-r from-brand-600 to-accent-500 px-2 py-0.5 text-[9.5px] font-black tracking-[0.14em] text-white uppercase shadow-sm">
              LMS
            </span>
          </div>
          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {[
              { href: "#features", label: "Features" },
              { href: "#how", label: "Roadmap" },
              { href: "#audiences", label: "Who it's for" },
              { href: "/contact", label: "Contact" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-1.5 text-[12.5px] font-bold text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <Link
              href={auth ? "/dashboard" : "/login"}
              className="hidden rounded-full border border-ink-200 bg-white px-4 py-2 text-[12.5px] font-bold text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-700 sm:inline-flex"
            >
              {auth ? "Dashboard" : "Sign in"}
            </Link>
            <a
              href="#claim"
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-brand-500 to-brand-600 px-4 py-2 text-[12.5px] font-bold text-white shadow-[0_6px_20px_rgba(0,118,214,0.35)] transition-all hover:brightness-105"
            >
              Claim your hub
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* Hero — full-bleed brand panel matching the auth experience */}
        <section className="relative overflow-hidden bg-ink-900 text-white">
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

          <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 pt-12 pb-14 sm:px-6 sm:pt-16 sm:pb-20 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-14">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-[10.5px] font-bold tracking-[0.14em] uppercase backdrop-blur-md">
                <span className="size-1.5 animate-pulse rounded-full bg-success-500" />
                Full LMS · your own subdomain
              </span>

              <h1 className="mt-5 text-[36px] leading-[1.04] font-black tracking-[-0.03em] sm:text-[52px] xl:text-[58px]">
                Launch your hub.
                <br />
                <span className="bg-gradient-to-r from-brand-300 via-white to-accent-300 bg-clip-text text-transparent">
                  Teach without limits.
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-[14px] leading-relaxed text-white/70 sm:text-[15px]">
                A complete learning management system for private teachers, tuition institutes and
                schools. Build courses, publish lessons, enroll learners and track progress — all
                from your own branded address.
              </p>
              <p
                lang="si"
                className="font-si mt-2.5 max-w-xl text-[13px] leading-[1.9] font-semibold text-white/55"
              >
                ඔබේම ලිපිනයකින් පාඩම්, සිසුන් සහ ප්‍රගතිය එකම තැනකින් කළමනාකරණය කරන්න.
              </p>

              <div className="mt-6 flex flex-wrap gap-2.5">
                <a
                  href="#claim"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[13px] font-black text-ink-900 shadow-lg transition-transform hover:-translate-y-0.5"
                >
                  <Icon name="zap" size={15} /> Claim your subdomain
                </a>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-3 text-[13px] font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                >
                  <Icon name="star" size={15} /> See plans — free for now
                </Link>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4 sm:gap-x-6">
                {HERO_STATS.map((stat) => (
                  <div key={stat.label} className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.08em] text-brand-300 uppercase">
                      <Icon name={stat.icon} size={12} />
                      {stat.label}
                    </div>
                    <div className="mt-1.5 text-[26px] leading-none font-black tracking-tight tabular-nums sm:text-[30px]">
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <ul className="grid gap-2.5">
              {HERO_CARDS.map((card) => (
                <li
                  key={card.title}
                  className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md transition-colors hover:bg-white/[0.09]"
                >
                  <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-brand-400/30 to-accent-400/20 text-brand-200 ring-1 ring-white/10">
                    <Icon name={card.icon} size={19} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-bold text-white">{card.title}</span>
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-white/55">
                      {card.body}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
          {/* Features */}
          <section id="features" className="scroll-mt-24 pt-14">
            <SectionHeader
              title="Everything a real LMS needs"
              subtitle="Courses, lessons, learners and progress — built in, no plugins."
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="group card p-5 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg"
                >
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100">
                    <Icon name={feature.icon} size={20} />
                  </span>
                  <h3 className="mt-3 text-[14.5px] font-extrabold text-ink-900">{feature.title}</h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-500">{feature.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Roadmap */}
          <section id="how" className="scroll-mt-24 pt-14">
            <SectionHeader
              title="Your LMS roadmap"
              subtitle="From claiming an address to watching learners finish courses — one clear path."
            />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white bg-white/80 p-5 shadow-sm ring-1 ring-ink-100/70 sm:p-7">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full bg-brand-100/60 blur-3xl"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-accent-100/50 blur-3xl"
              />

              <ol className="relative grid gap-6 lg:grid-cols-4 lg:gap-4">
                <span
                  aria-hidden="true"
                  className="absolute top-6 bottom-6 left-6 w-px bg-gradient-to-b from-brand-200 via-accent-200 to-transparent lg:top-6 lg:right-8 lg:bottom-auto lg:left-8 lg:h-px lg:w-auto lg:bg-gradient-to-r"
                />
                {STEPS.map((step, index) => (
                  <li key={step.title} className="relative flex gap-4 lg:block">
                    <div className="relative z-10 flex size-12 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-600 text-white shadow-lg shadow-brand-500/25 ring-4 ring-white">
                      <Icon name={step.icon} size={20} />
                      <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-white text-[9px] font-black text-brand-700 ring-1 ring-brand-100">
                        {index + 1}
                      </span>
                    </div>
                    <div className="min-w-0 lg:mt-4">
                      <span className="text-[9px] font-black tracking-[0.16em] text-brand-500 uppercase">
                        Step {index + 1}
                      </span>
                      <h3 className="mt-1 text-[14px] leading-snug font-extrabold text-ink-900">
                        {step.title}
                      </h3>
                      <p className="mt-1 text-[12px] leading-relaxed text-ink-500">{step.body}</p>
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-ink-50 px-2 py-0.5 text-[9.5px] font-bold text-ink-500 ring-1 ring-ink-100">
                        <Icon name="clock" size={9} /> {step.tag}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* Audiences */}
          <section id="audiences" className="scroll-mt-24 pt-14">
            <SectionHeader
              title="Built for how you teach"
              subtitle="One platform that fits a single tutor and a full campus."
            />
            <div className="grid gap-4 md:grid-cols-3">
              {AUDIENCES.map((audience) => (
                <div key={audience.title} className="card flex flex-col p-5">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-600 text-white shadow-lg shadow-brand-500/25">
                    <Icon name={audience.icon} size={22} />
                  </span>
                  <h3 className="mt-3 text-[15px] font-extrabold text-ink-900">{audience.title}</h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-500">{audience.body}</p>
                  <ul className="mt-4 space-y-2 border-t border-ink-100 pt-4">
                    {audience.points.map((point) => (
                      <li
                        key={point}
                        className="flex items-center gap-2 text-[12px] font-semibold text-ink-600"
                      >
                        <span className="flex size-4 flex-none items-center justify-center rounded-full bg-success-100 text-success-600">
                          <Icon name="check" size={10} strokeWidth={3} />
                        </span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* Claim form */}
          <section id="claim" className="scroll-mt-24 pt-14">
            <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
              <div>
                <SectionHeader
                  title="Claim your subdomain"
                  subtitle="Reserve the address for your hub in under a minute."
                />
                <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-accent-50/70 p-4">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 flex-none items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm ring-1 ring-brand-100">
                      <Icon name="globe" size={15} />
                    </span>
                    <p className="text-[10px] font-black tracking-[0.12em] text-brand-700 uppercase">
                      No domain purchase needed
                    </p>
                  </div>
                  <div className="mt-3 space-y-2">
                    {[
                      { label: "Campus page", value: "gurulens.us/campus/your-school" },
                      { label: "Learning hub", value: "your-school.gurulens.us" },
                    ].map((address) => (
                      <div
                        key={address.label}
                        className="flex flex-wrap items-center justify-between gap-1 rounded-xl border border-white bg-white/80 px-3 py-2 shadow-sm"
                      >
                        <span className="text-[9.5px] font-black tracking-wide text-ink-400 uppercase">
                          {address.label}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-ink-700">
                          {address.value}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2.5 text-[11px] leading-relaxed text-ink-500">
                    Both addresses are included free during launch. Pick the hub name you like — you
                    can change it later from settings.
                  </p>
                </div>

                <div className="mt-3 space-y-3">
                  {[
                    {
                      icon: "check",
                      title: "100% free during launch",
                      body: "Every plan is free right now. Payment will only be introduced later, with advance notice.",
                    },
                    {
                      icon: "shield-check",
                      title: "Yours as long as you use it",
                      body: "Your subdomain stays reserved for your hub. Change it later from settings if you need to.",
                    },
                    {
                      icon: "sparkles",
                      title: "Upgrade any time",
                      body: "Start on the free tier and move to a larger plan as your learner count grows.",
                    },
                  ].map((note) => (
                    <div
                      key={note.title}
                      className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-white/70 p-4"
                    >
                      <span className="flex size-9 flex-none items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                        <Icon name={note.icon} size={16} />
                      </span>
                      <div>
                        <h3 className="text-[13px] font-extrabold text-ink-900">{note.title}</h3>
                        <p className="mt-0.5 text-[12px] leading-relaxed text-ink-500">{note.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <LmsClaimForm signedIn={Boolean(auth)} />
            </div>
          </section>

          <section id="contact" className="scroll-mt-24 pt-14">
            <SectionHeader
              title="Talk to the GuruLens team"
              subtitle="Plans, school or institute onboarding, partnerships and investment."
            />
            <ContactChannels />
            <div className="mt-4">
              <ContactCtaCard
                topic="partnership"
                title="Bring your campus online with GuruLens"
                body="We can help you set up staff accounts, your campus page and a branded learning hub — free during launch."
              />
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
