import Link from "next/link";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Icon } from "@/components/ui/icons";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <span className="flex size-16 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-lg">
          <Icon name="compass" size={28} />
        </span>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink-900">
          This page went to another class
        </h1>
        <p className="mt-2 max-w-md text-[14px] leading-relaxed text-ink-500">
          The page you were looking for doesn&apos;t exist or may have been removed. Try exploring
          teachers or heading back home.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className={buttonClass("primary", "md")}>
            <Icon name="home" size={15} />
            Back home
          </Link>
          <Link href="/explore" className={buttonClass("outline", "md")}>
            <Icon name="compass" size={15} />
            Explore teachers
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
