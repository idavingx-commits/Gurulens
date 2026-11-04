"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/format";

const ITEMS = [
  { href: "/admin", label: "Overview", icon: "grid" },
  { href: "/admin/verification", label: "Verification", icon: "shield" },
  { href: "/admin/reports", label: "Reports", icon: "flag" },
  { href: "/admin/users", label: "Users", icon: "users" },
  { href: "/admin/badges", label: "Badges", icon: "award" },
] as const;

export function AdminNav({
  pendingVerifications,
  openReports,
}: {
  pendingVerifications: number;
  openReports: number;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin sections"
      className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
    >
      {ITEMS.map((item) => {
        const active =
          item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        const count =
          item.href === "/admin/verification"
            ? pendingVerifications
            : item.href === "/admin/reports"
              ? openReports
              : 0;
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
            {count > 0 ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10.5px] font-extrabold leading-none",
                  active ? "bg-white/20 text-white" : "bg-danger-100 text-danger-600",
                )}
              >
                {count > 99 ? "99+" : count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
