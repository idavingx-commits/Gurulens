import Link from "next/link";

import { Logo } from "@/components/layout/Logo";

const COLUMNS: Array<{ title: string; links: Array<{ href: string; label: string }> }> = [
  {
    title: "Platform",
    links: [
      { href: "/explore", label: "Explore Teachers" },
      { href: "/reels", label: "Reels" },
      { href: "/feed", label: "Social Feed" },
      { href: "/register/teacher", label: "Join as a Teacher" },
    ],
  },
  {
    title: "Trust & Safety",
    links: [
      { href: "/guidelines", label: "Community Guidelines" },
      { href: "/about#verification", label: "Verified Badge Rules" },
      { href: "/support", label: "Report & Appeals" },
      { href: "/about#ranking", label: "How Rankings Work" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About GuruLens" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/support", label: "Support" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-16 overflow-hidden bg-ink-900 text-ink-200">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(700px 320px at 85% 0%, rgba(0,148,253,0.22), transparent 60%), radial-gradient(500px 260px at 5% 100%, rgba(109,91,255,0.18), transparent 60%)",
        }}
      />
      <div className="relative mx-auto w-full max-w-6xl px-4 pt-14 pb-28 lg:pb-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo dark />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-300">
              Sri Lanka&apos;s education-first teacher discovery and social platform. Find the right
              teacher for you — with honest, verified student experiences.
            </p>
            <p className="mt-4 text-xs leading-relaxed text-ink-400">
              Ratings reflect verified student experiences. They are community signals, not a
              guarantee of exam results.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="text-xs font-bold tracking-widest text-ink-400 uppercase">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-ink-200 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-6 border-t border-white/10 pt-7 sm:flex-row sm:items-center">
          <p className="text-xs text-ink-400">
            © {new Date().getFullYear()} GuruLens · IneshDev (Pvt) Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold tracking-wide text-ink-400 uppercase">
              Designed &amp; developed by
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/ineshdev-white.png"
              alt="IneshDev (Pvt) Ltd"
              className="h-8 w-auto opacity-90"
              width={160}
              height={40}
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
