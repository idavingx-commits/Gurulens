"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/format";

const ITEMS = [
  { href: "/studio", label: "Overview", icon: "grid" },
  { href: "/studio/posts", label: "Posts", icon: "pencil" },
  { href: "/studio/quizzes", label: "Quizzes", icon: "target" },
  { href: "/studio/audience", label: "Audience", icon: "users" },
  { href: "/studio/verification", label: "Verification", icon: "shield" },
] as const;

export function StudioNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Studio sections"
      className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
    >
      {ITEMS.map((item) => {
        const active =
          item.href === "/studio" ? pathname === "/studio" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex flex-none items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-bold transition-all",
              active
                ? "border-ink-900 bg-ink-900 text-white shadow-sm"
                : "border-ink-200 bg-white/70 text-ink-600 hover:border-brand-300 hover:text-brand-700",
            )}
          >
            <Icon name={item.icon} size={15} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
