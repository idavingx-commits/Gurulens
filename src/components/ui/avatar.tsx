import { cn, initials } from "@/lib/format";

const SIZES = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
  xl: "size-20 text-2xl",
  "2xl": "size-28 text-4xl",
} as const;

export type AvatarSize = keyof typeof SIZES;

export function Avatar({
  name,
  src,
  size = "md",
  className,
  ring = false,
}: {
  name: string;
  src?: string | null;
  size?: AvatarSize;
  className?: string;
  ring?: boolean;
}) {
  const base = cn(
    "relative flex flex-none items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-500 to-accent-500 font-bold text-white",
    SIZES[size],
    ring && "ring-4 ring-white shadow-lift",
    className,
  );

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={name} className={cn(base, "object-cover")} loading="lazy" />
    );
  }

  return (
    <span className={base} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
