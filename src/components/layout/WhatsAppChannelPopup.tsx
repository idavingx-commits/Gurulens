"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/icons";

const CHANNEL_URL = "https://chat.whatsapp.com/Fe8Z0LIzB779B0PaB9hVQl";
const STORAGE_KEY = "gl_wa_popup_seen";
const SHOW_DELAY_MS = 1500;

/**
 * Promo pop-up inviting visitors to the official GuruLens WhatsApp channel.
 * Shown once per browser session, a moment after the page loads.
 */
export function WhatsAppChannelPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      /* storage unavailable — still show */
    }
    if (seen) return;
    const t = window.setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  function close() {
    setOpen(false);
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wa-popup-title"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={close}
        className="animate-fade-up absolute inset-0 cursor-default bg-ink-900/50 backdrop-blur-sm"
      />

      <div className="animate-scale-up relative w-full max-w-[26rem] overflow-hidden rounded-[1.75rem] bg-white shadow-2xl ring-1 ring-brand-100">
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-full bg-white/90 text-ink-700 shadow-md ring-1 ring-ink-100 backdrop-blur transition hover:bg-white hover:text-ink-900"
        >
          <Icon name="x" size={18} />
        </button>

        <a href={CHANNEL_URL} target="_blank" rel="noopener noreferrer" onClick={close}>
          <Image
            src="/promo/whatsapp-channel.jpg"
            alt="GuruLens official WhatsApp Channel — get the latest updates, announcements and educational insights"
            width={1254}
            height={1254}
            priority
            className="block h-auto w-full"
          />
        </a>

        <div className="bg-gradient-to-b from-brand-50/60 to-white px-5 pt-4 pb-5">
          <h2 id="wa-popup-title" className="sr-only">
            Join the GuruLens WhatsApp Channel
          </h2>
          <a
            href={CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={close}
            className="glow-pulse flex w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-brand-600 via-brand-500 to-accent-500 px-6 py-3.5 text-[15px] font-bold text-white shadow-lg shadow-brand-500/30 transition hover:scale-[1.02] hover:shadow-xl active:scale-[0.99]"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current">
              <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35ZM12.04 21.5h-.01a9.43 9.43 0 0 1-4.8-1.32l-.35-.2-3.57.93.95-3.48-.22-.36a9.42 9.42 0 0 1-1.45-5.03c0-5.2 4.24-9.44 9.46-9.44a9.4 9.4 0 0 1 9.44 9.45c0 5.21-4.24 9.45-9.45 9.45Zm8.04-17.49A11.29 11.29 0 0 0 12.04.67C5.77.67.68 5.76.67 12.02c0 2 .52 3.96 1.52 5.68L.57 23.33l5.77-1.51a11.33 11.33 0 0 0 5.7 1.45h.01c6.26 0 11.36-5.09 11.36-11.35 0-3.03-1.18-5.88-3.33-8.03Z" />
            </svg>
            Join Channel
            <Icon name="arrow-right" size={18} />
          </a>
          <button
            type="button"
            onClick={close}
            className="mt-2.5 w-full text-center text-[13px] font-semibold text-ink-500 transition hover:text-ink-700"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
