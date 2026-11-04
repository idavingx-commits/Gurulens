import Link from "next/link";

import { Logo } from "@/components/layout/Logo";
import { SearchBar } from "@/components/layout/SearchBar";
import { UserMenu } from "@/components/layout/UserMenu";
import { Icon } from "@/components/ui/icons";
import { LinkButton } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";

const NAV = [
  { href: "/explore", label: "Explore Teachers", icon: "users" },
  { href: "/reels", label: "Reels", icon: "film" },
  { href: "/feed", label: "Feed", icon: "compass" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40">
      <div className="glass rounded-none border-x-0 border-t-0">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:gap-5">
          <Logo className="flex-none" />

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            {NAV.filter((item) => item.href !== "/feed" || user).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold text-ink-600 transition-colors hover:bg-white/70 hover:text-ink-900"
              >
                <Icon name={item.icon} size={15} />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto hidden min-w-0 flex-1 justify-end sm:flex">
            <SearchBar className="w-full max-w-sm" />
          </div>

          <div className="ml-auto flex items-center gap-2 sm:ml-0">
            <Link
              href="/explore"
              className="rounded-full p-2.5 text-ink-500 transition-colors hover:bg-white/70 hover:text-ink-900 sm:hidden"
              aria-label="Search teachers"
            >
              <Icon name="search" size={19} />
            </Link>

            {user ? (
              <UserMenu
                user={{ id: user.id, name: user.name, role: user.role, avatarKey: user.avatarKey }}
              />
            ) : (
              <>
                <LinkButton href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                  Log in
                </LinkButton>
                <LinkButton href="/register" size="sm">
                  Get started
                </LinkButton>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
