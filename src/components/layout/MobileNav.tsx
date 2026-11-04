"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/format";

export function MobileNav({ role }: { role: string | null }) {
  const pathname = usePathname();

  const items: Array<{ href: string; label: string; icon: string }> = [
    { href: "/", label: "Home", icon: "home" },
    { href: "/explore", label: "Explore", icon: "search" },
    { href: "/reels", label: "Reels", icon: "film" },
  ];

  if (role === "teacher") {
    items.push({ href: "/studio", label: "Studio", icon: "video" });
  } else if (role === "admin" || role === "moderator") {
    items.push({ href: "/admin", label: "Admin", icon: "shield" });
  } else if (role) {
    items.push({ href: "/feed", label: "Feed", icon: "compass" });
  }

  items.push(
    role
      ? { href: "/dashboard", label: "Me", icon: "user" }
      : { href: "/login", label: "Log in", icon: "user" },
  );

  return (
    <nav
      className="glass-strong fixed inset-x-3 bottom-3 z-40 rounded-3xl px-2 py-1.5 lg:hidden"
      style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-14 flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 transition-colors",
                active ? "text-brand-600" : "text-ink-400 hover:text-ink-700",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon name={item.icon} size={20} strokeWidth={active ? 2.3 : 1.8} />
              <span className={cn("text-[10px] font-bold", active && "text-brand-700")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
