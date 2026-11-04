import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { cn } from "@/lib/format";

const FIELD =
  "w-full rounded-xl border border-ink-200 bg-white/80 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 transition-colors focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:opacity-60";

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD, className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(FIELD, "min-h-28 resize-y", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(FIELD, "appearance-none bg-white pr-9", className)} {...rest}>
      {children}
    </select>
  );
}

export function Label({ className, ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-[13px] font-semibold text-ink-700", className)}
      {...rest}
    />
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label?: string;
  htmlFor?: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div>
      {label ? <Label htmlFor={htmlFor}>{label}</Label> : null}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-danger-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function Checkbox({
  className,
  label,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink-700">
      <input
        type="checkbox"
        className={cn(
          "mt-0.5 size-4 flex-none cursor-pointer rounded border-ink-300 accent-brand-600",
          className,
        )}
        {...rest}
      />
      <span>{label}</span>
    </label>
  );
}

export function RadioCard({
  checked,
  onSelect,
  title,
  description,
  icon,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={checked}
      className={cn(
        "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all",
        checked
          ? "border-brand-400 bg-brand-50/80 ring-4 ring-brand-100"
          : "border-ink-200 bg-white/70 hover:border-ink-300",
      )}
    >
      {icon ? <span className="mt-0.5 flex-none text-brand-600">{icon}</span> : null}
      <span>
        <span className="block text-sm font-bold text-ink-900">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">{description}</span>
      </span>
    </button>
  );
}
