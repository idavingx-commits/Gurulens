import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/format";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "accent" | "success";
type Size = "xs" | "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-150 select-none whitespace-nowrap active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

const SIZES: Record<Size, string> = {
  xs: "h-7 px-3 text-xs",
  sm: "h-9 px-4 text-[13px]",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-7 text-[15px]",
};

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-[0_6px_20px_rgba(0,118,214,0.35)] hover:brightness-105 hover:shadow-[0_8px_26px_rgba(0,118,214,0.45)]",
  secondary: "glass text-ink-800 hover:bg-white/85",
  outline:
    "border border-ink-200 bg-white/70 text-ink-700 hover:border-brand-300 hover:text-brand-700",
  ghost: "text-ink-600 hover:bg-ink-100/70 hover:text-ink-900",
  danger: "bg-danger-500 text-white hover:bg-danger-600",
  accent:
    "bg-gradient-to-b from-accent-500 to-accent-600 text-white shadow-[0_6px_20px_rgba(90,71,232,0.32)] hover:brightness-105",
  success: "bg-success-500 text-white hover:bg-success-600",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string): string {
  return cn(BASE, SIZES[size], VARIANTS[variant], extra);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...rest} />;
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
