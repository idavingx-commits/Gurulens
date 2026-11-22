import Link from "next/link";

import { Icon } from "@/components/ui/icons";

const ITEMS = [
  { key: "overview", label: "Overview", icon: "grid", href: "" },
  { key: "classes", label: "Classes", icon: "book-open", href: "/classes" },
  { key: "channels", label: "Channels", icon: "radio", href: "/channels" },
  { key: "timetable", label: "Timetable", icon: "calendar", href: "/timetable" },
  { key: "people", label: "People", icon: "users", href: "/people" },
] as const;

export type CampusNavKey =
  | "overview"
  | "classes"
  | "channels"
  | "timetable"
  | "people"
  | "insights"
  | "manage";

/** Shared campus sub-navigation. Scrolls horizontally on small screens. */
export function CampusNav({
  slug,
  active,
  canManage,
}: {
  slug: string;
  active: CampusNavKey;
  canManage: boolean;
}) {
  const base = `/campus/${slug}`;
  const items = [
    ...ITEMS.map((item) => ({ ...item, href: `${base}${item.href}` })),
    ...(canManage
      ? [
          {
            key: "insights" as const,
            label: "Insights",
            icon: "chart",
            href: `${base}/insights`,
          },
          {
            key: "manage" as const,
            label: "Manage",
            icon: "settings",
            href: `${base}/manage`,
          },
        ]
      : []),
  ];

  return (
    <nav
      aria-label="Campus sections"
      className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
    >
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex flex-none items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition-colors ${
              isActive
                ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                : "border-ink-200 bg-white/80 text-ink-600 hover:border-brand-300 hover:text-brand-700"
            }`}
          >
            <Icon name={item.icon} size={13} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
