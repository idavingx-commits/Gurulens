import Link from "next/link";

import { Icon } from "@/components/ui/icons";
import {
  CONTACT_EMAIL,
  CONTACT_MAILTO,
  CONTACT_PHONE,
  CONTACT_PHONE_TEL,
  CONTACT_WHATSAPP,
  CONTACT_WHATSAPP_URL,
  contactMailto,
} from "@/lib/contact";
import { cn } from "@/lib/format";

const CHANNELS = [
  {
    href: CONTACT_MAILTO,
    icon: "mail",
    label: "Email",
    value: CONTACT_EMAIL,
    hint: "Plans, offers & investment",
    external: false,
  },
  {
    href: `tel:${CONTACT_PHONE_TEL}`,
    icon: "phone",
    label: "Call",
    value: CONTACT_PHONE,
    hint: "Mon–Sat, 9am–7pm",
    external: false,
  },
  {
    href: CONTACT_WHATSAPP_URL,
    icon: "message",
    label: "WhatsApp",
    value: CONTACT_WHATSAPP,
    hint: "Fastest response",
    external: true,
  },
] as const;

export function ContactChannels({
  tone = "light",
  className,
}: {
  tone?: "light" | "dark";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <div className={cn("grid gap-3 sm:grid-cols-3", className)}>
      {CHANNELS.map((channel) => (
        <a
          key={channel.label}
          href={channel.href}
          {...(channel.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className={cn(
            "group flex items-start gap-3 rounded-2xl border p-3.5 transition-all",
            dark
              ? "border-white/15 bg-white/10 text-white backdrop-blur-sm hover:-translate-y-0.5 hover:bg-white/15"
              : "border-ink-200/80 bg-white text-ink-900 shadow-sm hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md",
          )}
        >
          <span
            className={cn(
              "flex size-9 flex-none items-center justify-center rounded-xl",
              dark
                ? "bg-white/15 text-brand-200"
                : "bg-gradient-to-br from-brand-500 to-accent-600 text-white shadow-sm shadow-brand-500/25",
            )}
          >
            <Icon name={channel.icon} size={16} />
          </span>
          <span className="min-w-0">
            <span
              className={cn(
                "block text-[9.5px] font-black tracking-[0.12em] uppercase",
                dark ? "text-white/50" : "text-ink-400",
              )}
            >
              {channel.label}
            </span>
            <span className="mt-0.5 block truncate text-[12.5px] font-extrabold">
              {channel.value}
            </span>
            <span
              className={cn(
                "mt-0.5 block text-[10.5px] font-semibold",
                dark ? "text-white/55" : "text-ink-400",
              )}
            >
              {channel.hint}
            </span>
          </span>
          <Icon
            name="arrow-right"
            size={13}
            className={cn(
              "mt-1 ml-auto flex-none transition-transform group-hover:translate-x-0.5",
              dark ? "text-white/40" : "text-ink-300",
            )}
          />
        </a>
      ))}
    </div>
  );
}

export function ContactInline({
  tone = "light",
  className,
  text = "Questions about plans, offers or investing?",
}: {
  tone?: "light" | "dark";
  className?: string;
  text?: string;
}) {
  const dark = tone === "dark";
  return (
    <p
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11.5px] font-semibold",
        dark ? "text-white/55" : "text-ink-400",
        className,
      )}
    >
      <span>{text}</span>
      <a
        href={CONTACT_MAILTO}
        className={cn("font-bold underline-offset-2 hover:underline", dark ? "text-brand-200" : "text-brand-600")}
      >
        {CONTACT_EMAIL}
      </a>
      <span aria-hidden="true">·</span>
      <a
        href={`tel:${CONTACT_PHONE_TEL}`}
        className={cn("font-bold hover:underline", dark ? "text-white/80" : "text-ink-600")}
      >
        {CONTACT_PHONE}
      </a>
      <span aria-hidden="true">·</span>
      <a
        href={CONTACT_WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("font-bold hover:underline", dark ? "text-white/80" : "text-ink-600")}
      >
        WhatsApp {CONTACT_WHATSAPP}
      </a>
    </p>
  );
}

export function ContactCtaCard({
  topic = "pricing",
  title,
  body,
  className,
}: {
  topic?: "pricing" | "investment" | "partnership";
  title?: string;
  body?: string;
  className?: string;
}) {
  const subject =
    topic === "investment"
      ? "GuruLens investment enquiry"
      : topic === "partnership"
        ? "GuruLens partnership enquiry"
        : "GuruLens plan enquiry";
  const heading =
    title ??
    (topic === "investment"
      ? "Invest in Sri Lanka's education platform"
      : topic === "partnership"
        ? "Build with GuruLens"
        : "Talk to us about the right plan");
  const copy =
    body ??
    (topic === "investment"
      ? "GuruLens is built by IneshDev (Pvt) Ltd. Ask for the investor deck, traction and roadmap."
      : topic === "partnership"
        ? "Schools, tuition institutes and education partners can launch a branded hub with us."
        : "We will help you choose a teacher, institute or campus plan — every plan is free during launch.");

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] border border-white bg-gradient-to-br from-ink-900 via-ink-800 to-brand-900 p-6 text-white shadow-xl sm:p-8",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-12 size-56 rounded-full bg-brand-500/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 -left-10 size-56 rounded-full bg-accent-500/25 blur-3xl"
      />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[9.5px] font-black tracking-[0.14em] uppercase backdrop-blur-sm">
            <Icon name={topic === "investment" ? "chart" : topic === "partnership" ? "users" : "message"} size={11} />
            {topic === "investment" ? "Investment" : topic === "partnership" ? "Partnerships" : "Pricing & offers"}
          </span>
          <h2 className="mt-2.5 max-w-xl text-[21px] leading-tight font-black tracking-tight sm:text-[25px]">
            {heading}
          </h2>
          <p className="mt-1.5 max-w-xl text-[12.5px] leading-relaxed text-white/65">{copy}</p>
          <p
            lang="si"
            className="font-si mt-2 max-w-xl text-[12px] leading-[1.85] font-semibold text-white/50"
          >
            මිල ගණන්, විශේෂ ඉදිරිපත් කිරීම් හෝ ආයෝජන ගැන කතා කරන්න — අපි සතුටින් උදව් කරන්නෙමු.
          </p>
        </div>
        <div className="flex flex-none flex-wrap items-center gap-2">
          <a
            href={contactMailto(subject)}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[12px] font-black text-ink-900 shadow-lg transition-transform hover:-translate-y-0.5"
          >
            <Icon name="mail" size={14} /> {topic === "investment" ? "Request the deck" : "Email us"}
          </a>
          <a
            href={CONTACT_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2.5 text-[12px] font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            <Icon name="message" size={14} /> WhatsApp
          </a>
          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11.5px] font-bold text-white/60 transition-colors hover:text-white"
          >
            All contact options <Icon name="arrow-right" size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}
