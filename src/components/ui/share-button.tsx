"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { buttonClass } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/format";

type ShareButtonProps = {
  /** Site-relative path (for example `/teacher/kamal`) or a full URL. */
  path: string;
  /** Page title used in the native share sheet and on social posts. */
  title?: string;
  /** Optional message that accompanies the link. Defaults to the title. */
  text?: string;
  label?: string;
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md";
  iconOnly?: boolean;
  className?: string;
};

const MENU_WIDTH = 272;
const MENU_HEIGHT = 390;

function shareUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).toString();
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.18-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.07c.15.2 2.1 3.2 5.08 4.49.7.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.42.25-.69.25-1.29.18-1.41-.08-.12-.28-.2-.57-.35M12.05 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.89 9.89-9.89 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.89-9.88 9.89m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45c6.55 0 11.89-5.34 11.89-11.9 0-3.17-1.24-6.16-3.48-8.41" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.89h-2.33v6.99A10 10 0 0 0 22 12Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor" aria-hidden="true">
      <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.68l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64Z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
      <path d="m23.91 3.79-3.61 17.05c-.25 1.21-.98 1.5-2 .94l-5.5-4.07-2.66 2.57c-.3.3-.55.56-1.12.56-.57 0-.47-.21-.66-.75l-1.5-4.9-4.78-1.5c-1.04-.33-1.06-1.04.22-1.54l18.7-7.2c.87-.32 1.65.2 1.37 1.44Z" />
    </svg>
  );
}

function OptionIcon({
  tone,
  children,
}: {
  tone: "brand" | "ink" | "success" | "accent";
  children: React.ReactNode;
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-600",
    ink: "bg-ink-100 text-ink-700",
    success: "bg-success-50 text-success-600",
    accent: "bg-accent-50 text-accent-600",
  } as const;
  return (
    <span className={cn("flex size-8 flex-none items-center justify-center rounded-xl", tones[tone])}>
      {children}
    </span>
  );
}

export function ShareButton({
  path,
  title,
  text,
  label = "Share",
  variant = "outline",
  size = "sm",
  iconOnly = false,
  className,
}: ShareButtonProps) {
  const toast = useToast();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) return;

    function closeOnOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function closeOnMove() {
      setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("scroll", closeOnMove, true);
    window.addEventListener("resize", closeOnMove);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("scroll", closeOnMove, true);
      window.removeEventListener("resize", closeOnMove);
    };
  }, [open]);

  function placeMenu() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.min(
      Math.max(8, rect.right - MENU_WIDTH),
      Math.max(8, window.innerWidth - MENU_WIDTH - 8),
    );
    const top =
      rect.bottom + 8 + MENU_HEIGHT > window.innerHeight
        ? Math.max(8, rect.top - MENU_HEIGHT - 8)
        : rect.bottom + 8;
    setPosition({ top, left });
  }

  function getMessage() {
    return text ?? title ?? "Check this out on GuruLens";
  }

  async function nativeShare() {
    const url = shareUrl(path);
    setOpen(false);
    try {
      await navigator.share({ title: title ?? document.title, text: getMessage(), url });
    } catch {
      // The user dismissed the sheet — nothing to do.
    }
  }

  function openMenu() {
    if (
      typeof navigator !== "undefined" &&
      "share" in navigator &&
      window.matchMedia("(pointer: coarse)").matches
    ) {
      void nativeShare();
      return;
    }
    placeMenu();
    setOpen(true);
  }

  function social(network: "whatsapp" | "facebook" | "x" | "telegram") {
    const url = shareUrl(path);
    const message = getMessage();
    const links = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      x: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(message)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(message)}`,
    } as const;
    setOpen(false);
    window.open(links[network], "_blank", "noopener,noreferrer,width=640,height=640");
  }

  function shareByEmail() {
    const url = shareUrl(path);
    const subject = encodeURIComponent(title ?? "Check this out on GuruLens");
    const body = encodeURIComponent(`${getMessage()}\n\n${url}`);
    setOpen(false);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  async function copyLink() {
    const url = shareUrl(path);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied. Share it anywhere.");
    } catch {
      window.prompt("Copy this link", url);
    }
    setOpen(false);
  }

  const nativeShareAvailable = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openMenu}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={iconOnly ? label : undefined}
        className={buttonClass(
          variant,
          size,
          cn(iconOnly && "aspect-square !px-0", "relative", className),
        )}
      >
        <Icon name="share" size={size === "sm" ? 14 : 16} />
        {iconOnly ? null : label}
      </button>

      {open && position
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label="Share options"
              style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
              className="animate-fade-up fixed z-[90] rounded-2xl border border-ink-100 bg-white p-2 shadow-[0_24px_60px_rgba(13,26,45,0.22)]"
            >
              <p className="px-2.5 pt-1 pb-2 text-[10px] font-black tracking-[0.15em] text-ink-400 uppercase">
                Share this page
              </p>

              {nativeShareAvailable ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void nativeShare()}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-semibold text-ink-700 transition-colors hover:bg-ink-50"
                >
                  <OptionIcon tone="brand">
                    <Icon name="share" size={15} />
                  </OptionIcon>
                  More options…
                </button>
              ) : null}

              <button
                type="button"
                role="menuitem"
                onClick={() => social("whatsapp")}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-semibold text-ink-700 transition-colors hover:bg-ink-50"
              >
                <OptionIcon tone="success">
                  <WhatsAppIcon />
                </OptionIcon>
                WhatsApp
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => social("facebook")}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-semibold text-ink-700 transition-colors hover:bg-ink-50"
              >
                <OptionIcon tone="brand">
                  <FacebookIcon />
                </OptionIcon>
                Facebook
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => social("x")}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-semibold text-ink-700 transition-colors hover:bg-ink-50"
              >
                <OptionIcon tone="ink">
                  <XIcon />
                </OptionIcon>
                X (Twitter)
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => social("telegram")}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-semibold text-ink-700 transition-colors hover:bg-ink-50"
              >
                <OptionIcon tone="accent">
                  <TelegramIcon />
                </OptionIcon>
                Telegram
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={shareByEmail}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-semibold text-ink-700 transition-colors hover:bg-ink-50"
              >
                <OptionIcon tone="accent">
                  <Icon name="mail" size={15} />
                </OptionIcon>
                Email
              </button>

              <div className="my-1 h-px bg-ink-100" />

              <button
                type="button"
                role="menuitem"
                onClick={() => void copyLink()}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-semibold text-ink-700 transition-colors hover:bg-ink-50"
              >
                <OptionIcon tone="ink">
                  <Icon name="copy" size={15} />
                </OptionIcon>
                Copy link
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
