import type { Metadata } from "next";
import Link from "next/link";

import { ContactChannels, ContactCtaCard } from "@/components/marketing/contact-panel";
import { Icon } from "@/components/ui/icons";
import {
  CONTACT_COMPANY,
  CONTACT_EMAIL,
  CONTACT_MAILTO,
  CONTACT_PHONE,
  CONTACT_PHONE_TEL,
  CONTACT_TOPICS,
  CONTACT_WHATSAPP,
  CONTACT_WHATSAPP_URL,
  contactMailto,
} from "@/lib/contact";

export const metadata: Metadata = {
  title: "Contact GuruLens — pricing, offers & investment",
  description:
    "Talk to GuruLens (IneshDev Pvt Ltd) about plans, launch offers, school and institute onboarding, partnerships or investing. Email info@gurulens.us, call 0742366672 or WhatsApp 0764001179.",
  alternates: { canonical: "/contact" },
  openGraph: {
    type: "website",
    title: "Contact GuruLens",
    description:
      "Pricing, launch offers, partnerships and investment — email info@gurulens.us, call 0742366672 or WhatsApp 0764001179.",
    url: "/contact",
    images: [{ url: "/brand/og-default.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact GuruLens",
    description: "Pricing, offers, partnerships and investment. Talk to IneshDev (Pvt) Ltd.",
    images: ["/brand/og-default.png"],
  },
};

const REASONS = [
  {
    icon: "crown",
    title: "Choosing a plan",
    body: "Teacher, institute or school — we will help you match a plan to your classes and budget.",
  },
  {
    icon: "sparkles",
    title: "Launch offers",
    body: "Every plan is free during launch. Ask what happens when paid plans begin.",
  },
  {
    icon: "school",
    title: "Campus onboarding",
    body: "We can help set up your school or tuition institute, staff accounts and branded LMS hub.",
  },
  {
    icon: "chart",
    title: "Investment",
    body: "Request the investor deck, current traction and the product roadmap for GuruLens.",
  },
] as const;

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-16 sm:px-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-ink-900 via-brand-800 to-accent-700 px-5 py-9 text-white shadow-2xl sm:px-10 sm:py-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-16 size-80 rounded-full bg-brand-400/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 -left-16 size-80 rounded-full bg-accent-400/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative grid gap-7 lg:grid-cols-[1.25fr_1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-black tracking-[0.16em] uppercase backdrop-blur-sm">
              <Icon name="message" size={12} /> Contact GuruLens
            </span>
            <h1 className="mt-4 text-[34px] leading-[1.05] font-black tracking-tight sm:text-[48px]">
              Let&apos;s find the right{" "}
              <span className="bg-gradient-to-r from-brand-200 via-white to-success-100 bg-clip-text text-transparent">
                next step
              </span>
              .
            </h1>
            <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-white/75 sm:text-[15px]">
              Questions about plans, launch offers, onboarding your school or institute, or investing
              in Sri Lanka&apos;s education-first learning platform? Talk to the team at{" "}
              <span className="font-bold text-white">{CONTACT_COMPANY}</span>.
            </p>
            <p
              lang="si"
              className="font-si mt-2.5 max-w-xl text-[13px] leading-[1.9] font-semibold text-white/55"
            >
              මිල ගණන්, විශේෂ ඉදිරිපත් කිරීම්, පාසල් හෝ ටියුෂන් ආයතන සම්බන්ධ කිරීම සහ ආයෝජන ගැන
              අප හා කතා කරන්න.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={contactMailto("GuruLens enquiry")}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[12.5px] font-black text-ink-900 shadow-lg transition-transform hover:-translate-y-0.5"
              >
                <Icon name="mail" size={15} /> Email the team
              </a>
              <a
                href={CONTACT_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-[12.5px] font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <Icon name="message" size={15} /> WhatsApp us
              </a>
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-white/20 bg-white/10 p-4 shadow-xl backdrop-blur-md">
            <p className="px-1 text-[9.5px] font-black tracking-[0.16em] text-white/50 uppercase">
              Direct contact
            </p>
            <div className="mt-2.5 space-y-2">
              <a
                href={CONTACT_MAILTO}
                className="flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-2.5 transition-colors hover:bg-white/15"
              >
                <span className="flex size-8 flex-none items-center justify-center rounded-xl bg-white/15 text-brand-200">
                  <Icon name="mail" size={14} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[9px] font-black tracking-wide text-white/45 uppercase">
                    Email
                  </span>
                  <span className="block truncate text-[12.5px] font-extrabold">{CONTACT_EMAIL}</span>
                </span>
              </a>
              <a
                href={`tel:${CONTACT_PHONE_TEL}`}
                className="flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-2.5 transition-colors hover:bg-white/15"
              >
                <span className="flex size-8 flex-none items-center justify-center rounded-xl bg-white/15 text-brand-200">
                  <Icon name="phone" size={14} />
                </span>
                <span>
                  <span className="block text-[9px] font-black tracking-wide text-white/45 uppercase">
                    Call
                  </span>
                  <span className="block text-[12.5px] font-extrabold">{CONTACT_PHONE}</span>
                </span>
              </a>
              <a
                href={CONTACT_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-2.5 transition-colors hover:bg-white/15"
              >
                <span className="flex size-8 flex-none items-center justify-center rounded-xl bg-white/15 text-brand-200">
                  <Icon name="message" size={14} />
                </span>
                <span>
                  <span className="block text-[9px] font-black tracking-wide text-white/45 uppercase">
                    WhatsApp
                  </span>
                  <span className="block text-[12.5px] font-extrabold">{CONTACT_WHATSAPP}</span>
                </span>
              </a>
            </div>
            <p className="mt-3 px-1 text-[10.5px] leading-relaxed font-semibold text-white/45">
              We usually reply within one working day. For urgent class or account issues, WhatsApp is
              fastest.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-5">
        <ContactChannels />
      </section>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <span className="text-[10px] font-black tracking-[0.16em] text-brand-600 uppercase">
              What can we help with?
            </span>
            <h2 className="mt-1 text-[23px] font-black tracking-tight text-ink-900">
              Pick the conversation
            </h2>
          </div>
          <p className="max-w-sm text-[12px] leading-relaxed text-ink-500">
            Tell us a little about your school, institute or investment interest and we will route you
            to the right person.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {REASONS.map((reason) => (
            <div key={reason.title} className="card-premium p-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Icon name={reason.icon} size={18} />
              </span>
              <h3 className="mt-3 text-[14px] font-extrabold text-ink-900">{reason.title}</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-500">{reason.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-3">
        {CONTACT_TOPICS.map((topic) => (
          <article key={topic.id} className="card flex flex-col p-5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-600 text-white shadow-sm shadow-brand-500/25">
              <Icon name={topic.icon} size={18} />
            </span>
            <h2 className="mt-3 text-[15px] font-extrabold text-ink-900">{topic.title}</h2>
            <p className="mt-1.5 flex-1 text-[12px] leading-relaxed text-ink-500">{topic.body}</p>
            <a
              href={contactMailto(
                topic.subject,
                topic.id === "investment"
                  ? "Hi GuruLens team,\n\nPlease share the investor deck and current traction for GuruLens.\n\nName:\nOrganisation:\nPhone:\n"
                  : undefined,
              )}
              className="mt-4 inline-flex items-center gap-1.5 text-[11.5px] font-black tracking-wide text-brand-600 uppercase hover:text-brand-700"
            >
              {topic.cta} <Icon name="arrow-right" size={12} strokeWidth={2.6} />
            </a>
          </article>
        ))}
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <ContactCtaCard topic="investment" />
        <div className="card p-5 sm:p-6">
          <h2 className="text-[16px] font-extrabold text-ink-900">Before you write</h2>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-500">
            Many answers are already on the site:
          </p>
          <ul className="mt-3 space-y-2.5">
            {[
              { href: "/pricing", label: "Plans & launch pricing", icon: "crown" },
              { href: "/lms", label: "Branded LMS for schools & institutes", icon: "globe" },
              { href: "/register/school", label: "Register a school", icon: "school" },
              { href: "/register/institute", label: "Register a tuition institute", icon: "users" },
              { href: "/support", label: "Support, reports & appeals", icon: "shield-check" },
            ].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-2.5 rounded-xl border border-ink-100 bg-ink-50/60 px-3 py-2.5 text-[12.5px] font-bold text-ink-700 transition-colors hover:border-brand-200 hover:bg-brand-50/60 hover:text-brand-700"
                >
                  <Icon name={item.icon} size={14} className="text-brand-600" />
                  {item.label}
                  <Icon name="arrow-right" size={12} className="ml-auto text-ink-300" />
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[11px] leading-relaxed text-ink-400">
            GuruLens is built by {CONTACT_COMPANY}. We never ask for your password by email, phone or
            WhatsApp.
          </p>
        </div>
      </section>
    </div>
  );
}
