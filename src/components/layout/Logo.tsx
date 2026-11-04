import Link from "next/link";

import { cn } from "@/lib/format";

export function Logo({
  className,
  wordmark = true,
  dark = false,
}: {
  className?: string;
  wordmark?: boolean;
  dark?: boolean;
}) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-2.5 transition-opacity hover:opacity-90", className)}
      aria-label="GuruLens home"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dark ? "/brand/gurulens-white.png" : "/brand/gurulens-icon.png"}
        alt=""
        className="h-9 w-auto"
        width={36}
        height={40}
      />
      {wordmark ? (
        <span
          className={cn(
            "text-[19px] font-extrabold tracking-tight",
            dark ? "text-white" : "text-ink-900",
          )}
        >
          Guru<span className={dark ? "text-brand-300" : "text-brand-600"}>Lens</span>
        </span>
      ) : null}
    </Link>
  );
}
