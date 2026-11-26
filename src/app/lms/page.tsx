import type { Metadata } from "next";
import Link from "next/link";

import { LmsClaimForm } from "@/components/lms/LmsClaimForm";
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
    title: "Claim your subdomain",
    body: "Pick a name like acme.gurulens.us. It's reserved for you the moment you claim it.",
  },
  {
    icon: "book",
    title: "Build courses",
    body: "Add modules and lessons with text, video and durations. Draft first, publish when ready.",
  },
  {
    icon: "users",
    title: "Invite learners",
    body: "Students enroll in one click. Public courses open instantly, member courses need approval.",
  },
  {
    icon: "target",
    title: "Track everything",
    body: "See enrollment, lesson completion and course progress across your whole hub.",
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

export default async function LmsLandingPage() {
  const auth = await getAuth();

  return (
    <div className="min-h-dvh bg-gradient-to-b from-ink-50 via-white to-brand-50/40">
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-600 text-white shadow-md">
              <Icon name="sparkles" size={16} />
            </span>
            <span className="text-[15px] font-black tracking-tight text-ink-900">GuruLens LMS</span>
          </Link>
          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {[
              { href: "#features", label: "Features" },
              { href: "#how", label: "How it works" },
              { href: "#audiences", label: "Who it's for" },
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
              className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-4 py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-ink-800"
            >
              Claim your hub
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[2rem] bg-ink-900 px-5 py-10 text-white shadow-2xl sm:px-10 sm:py-14">
          <div
            aria-hidden="true"
            className="absolute -top-24 -right-16 size-80 rounded-full bg-brand-500/30 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-24 -left-16 size-72 rounded-full bg-accent-500/25 blur-3xl"
          />

          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-[10px] font-black tracking-[0.14em] uppercase backdrop-blur-sm">
              <Icon name="globe" size={12} /> Full LMS · your own subdomain
            </span>
            <h1 className="mt-4 text-[32px] leading-[1.08] font-black tracking-tight sm:text-[46px]">
              Launch your learning hub at{" "}
              <span className="bg-gradient-to-r from-brand-300 to-accent-300 bg-clip-text text-transparent">
                yourname.gurulens.us
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-white/70 sm:text-[15px]">
              A complete learning management system for private teachers, tuition institutes and
              schools. Build courses, publish lessons, enroll learners and track progress — all from
              your own branded address.
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

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { value: "1", label: "Claim to go live" },
                { value: "∞", label: "Learners welcome" },
                { value: "100%", label: "Launch offer" },
                { value: "0", label: "Setup fees" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3 text-center backdrop-blur-sm"
                >
                  <div className="text-[20px] leading-none font-black">{stat.value}</div>
                  <div className="mt-1.5 text-[9px] font-bold tracking-[0.1em] text-white/55 uppercase">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-24 pt-14">
          <SectionHeader
            title="Everything a real LMS needs"
            subtitle="Courses, lessons, learners and progress — built in, no plugins."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                  <Icon name={feature.icon} size={20} />
                </span>
                <h3 className="mt-3 text-[14.5px] font-extrabold text-ink-900">{feature.title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-500">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-24 pt-14">
          <SectionHeader title="Live in four steps" subtitle="From claim to first enrolled learner." />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <div key={step.title} className="relative card p-5">
                <span className="absolute top-4 right-4 text-[34px] leading-none font-black text-ink-100">
                  {index + 1}
                </span>
                <span className="flex size-11 items-center justify-center rounded-2xl bg-accent-50 text-accent-600">
                  <Icon name={step.icon} size={20} />
                </span>
                <h3 className="mt-3 text-[14.5px] font-extrabold text-ink-900">{step.title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-500">{step.body}</p>
              </div>
            ))}
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
                    <li key={point} className="flex items-center gap-2 text-[12px] font-semibold text-ink-600">
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
              <div className="space-y-3">
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
                  <div key={note.title} className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-white/70 p-4">
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

        <p className="mt-16 text-center text-[12px] text-ink-400">
          Questions?{" "}
          <Link href="/contact" className="font-bold text-brand-600 hover:text-brand-700">
            Talk to the GuruLens team
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
