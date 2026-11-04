import type { ReactNode } from "react";

import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/format";

export function Card({
  className,
  children,
  glass = false,
}: {
  className?: string;
  children: ReactNode;
  glass?: boolean;
}) {
  return (
    <div className={cn(glass ? "glass rounded-card" : "card", className)}>{children}</div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
  icon,
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "success" | "warn" | "danger" | "accent";
  className?: string;
  icon?: string;
}) {
  const tones = {
    neutral: "bg-ink-100 text-ink-600",
    brand: "bg-brand-50 text-brand-700",
    success: "bg-success-100 text-success-600",
    warn: "bg-warn-100 text-warn-600",
    danger: "bg-danger-100 text-danger-600",
    accent: "bg-accent-100 text-accent-700",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-chip px-2.5 py-1 text-[11px] font-bold tracking-wide",
        tones[tone],
        className,
      )}
    >
      {icon ? <Icon name={icon} size={12} strokeWidth={2.4} /> : null}
      {children}
    </span>
  );
}

export function VerifiedTick({
  className,
  title = "Verified Teacher",
  live = false,
}: {
  className?: string;
  title?: string;
  live?: boolean;
}) {
  return (
    <span
      className={cn("verified-tick", live && "verified-tick-live", className)}
      title={title}
      role="img"
      aria-label={title}
    >
      <span className="vt-seal" aria-hidden="true">
        <span className="vt-shine" />
      </span>
      <svg className="vt-check" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="m8.4 12.4 2.4 2.4 4.8-4.8"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function Chip({
  children,
  active = false,
  className,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-chip border px-3.5 py-1.5 text-[13px] font-semibold transition-all",
        active
          ? "border-brand-400 bg-brand-500 text-white shadow-[0_4px_14px_rgba(0,118,214,0.3)]"
          : "border-ink-200 bg-white/70 text-ink-600 hover:border-brand-300 hover:text-brand-700",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Stat({
  label,
  value,
  icon,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  icon?: string;
  hint?: string;
  tone?: "default" | "warn" | "danger";
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <div
        className={cn(
          "flex items-center gap-2",
          tone === "danger" ? "text-danger-600" : tone === "warn" ? "text-warn-600" : "text-ink-400",
        )}
      >
        {icon ? <Icon name={icon} size={15} /> : null}
        <span className="text-[11px] font-bold tracking-wider uppercase">{label}</span>
      </div>
      <div className="mt-1.5 text-2xl font-extrabold text-ink-900 tabular-nums">{value}</div>
      {hint ? <div className="mt-0.5 text-xs text-ink-400">{hint}</div> : null}
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-4", className)}>
      <div>
        <h2 className="text-lg font-extrabold tracking-tight text-ink-900">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-[13px] text-ink-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon = "sparkles",
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="glass flex flex-col items-center rounded-card px-6 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon name={icon} size={26} />
      </span>
      <h3 className="mt-4 text-base font-bold text-ink-900">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-500">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function ProgressBar({
  value,
  max = 100,
  className,
  tone = "brand",
}: {
  value: number;
  max?: number;
  className?: string;
  tone?: "brand" | "success" | "warn" | "danger";
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const tones = {
    brand: "bg-gradient-to-r from-brand-500 to-accent-500",
    success: "bg-success-500",
    warn: "bg-warn-500",
    danger: "bg-danger-500",
  } as const;
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-ink-100", className)}>
      <div className={cn("h-full rounded-full transition-all", tones[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function InfoNote({
  children,
  tone = "brand",
  icon = "info",
  className,
}: {
  children: ReactNode;
  tone?: "brand" | "warn" | "danger";
  icon?: string;
  className?: string;
}) {
  const tones = {
    brand: "border-brand-200 bg-brand-50/70 text-brand-800",
    warn: "border-warn-500/30 bg-warn-100/60 text-warn-600",
    danger: "border-danger-500/30 bg-danger-100/60 text-danger-600",
  } as const;
  return (
    <div className={cn("flex items-start gap-2.5 rounded-2xl border p-3.5 text-[13px] leading-relaxed", tones[tone], className)}>
      <Icon name={icon} size={16} className="mt-0.5 flex-none" />
      <div>{children}</div>
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-ink-100", className)} />;
}
