"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/format";

const ITEMS = [
  { key: "", label: "Home", icon: "home" },
  { key: "/courses", label: "Courses", icon: "book-open" },
  { key: "/dashboard", label: "My learning", icon: "target" },
] as const;

export function LmsNav({
  base,
  canManage,
  signedIn,
}: {
  base: string;
  canManage: boolean;
  signedIn: boolean;
}) {
  const pathname = usePathname();
  const relative = base && pathname.startsWith(base) ? pathname.slice(base.length) : pathname;

  const items = [
    ...ITEMS,
    ...(canManage ? [{ key: "/manage", label: "Manage", icon: "settings" as const }] : []),
  ];

  return (
    <nav className="flex items-center gap-1 overflow-x-auto">
      {items.map((item) => {
        const href = `${base}${item.key}` || "/";
        const active =
          item.key === ""
            ? relative === "/" || relative === ""
            : relative === item.key || relative.startsWith(`${item.key}/`);
        return (
          <Link
            key={item.key}
            href={href}
            className={cn(
              "inline-flex flex-none items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors",
              active
                ? "bg-ink-900 text-white shadow-sm"
                : "text-ink-500 hover:bg-ink-100 hover:text-ink-800",
            )}
          >
            <Icon name={item.icon} size={13} />
            <span className="hidden sm:inline">{item.label}</span>
            <span className="sm:hidden">{item.label === "My learning" ? "Learning" : item.label}</span>
          </Link>
        );
      })}
      {!signedIn ? (
        <Link
          href="/login"
          className="ml-1 inline-flex flex-none items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1.5 text-[12px] font-bold text-white transition-colors hover:bg-brand-700"
        >
          Sign in
        </Link>
      ) : null}
    </nav>
  );
}
