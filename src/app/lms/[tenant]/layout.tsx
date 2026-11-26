import Link from "next/link";
import type { CSSProperties } from "react";

import { LmsNav } from "@/components/lms/LmsNav";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icons";
import { getAuth } from "@/lib/auth";
import {
  getLmsAccess,
  getLmsBasePath,
  getLmsWorkspaceBySubdomain,
  lmsBrandColor,
  lmsInitials,
} from "@/lib/lms";

export default async function LmsTenantLayout({ children, params }: LayoutProps<"/lms/[tenant]">) {
  const { tenant } = (await params) as { tenant: string };
  const workspace = await getLmsWorkspaceBySubdomain(tenant);

  if (!workspace) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-ink-50 via-brand-50/40 to-accent-50/30 px-4 text-center">
        <span className="flex size-16 items-center justify-center rounded-3xl bg-white text-brand-600 shadow-xl ring-1 ring-ink-100">
          <Icon name="school" size={28} />
        </span>
        <h1 className="mt-5 text-2xl font-black tracking-tight text-ink-900">
          This learning hub isn&apos;t live yet
        </h1>
        <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-ink-500">
          <span className="font-bold">{tenant}.gurulens.us</span> has not been claimed. If you are a
          teacher, tuition institute or school, you can reserve it in minutes.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/lms"
            className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-[13px] font-bold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-700"
          >
            <Icon name="sparkles" size={15} /> Create your LMS
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-5 py-2.5 text-[13px] font-bold text-ink-700 hover:border-brand-300 hover:text-brand-700"
          >
            <Icon name="arrow-left" size={14} /> GuruLens home
          </Link>
        </div>
      </div>
    );
  }

  const auth = await getAuth();
  const access = await getLmsAccess(workspace, auth?.user ?? null);
  const base = await getLmsBasePath(workspace.subdomain);
  const brand = lmsBrandColor(workspace.brandColor);
  const logoKey = workspace.logoKey ?? workspace.organization?.logoKey ?? null;
  const name = workspace.name;

  return (
    <div
      className="flex min-h-dvh flex-col bg-ink-50/70"
      style={{ "--lms-brand": brand } as CSSProperties}
    >
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${brand}, #6d5bff)` }} />

      <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <Link href={base || "/"} className="flex min-w-0 flex-none items-center gap-2.5">
            {logoKey ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/media/${logoKey}`}
                alt=""
                className="size-9 rounded-xl object-cover ring-1 ring-ink-100"
              />
            ) : (
              <span
                className="flex size-9 flex-none items-center justify-center rounded-xl text-[12px] font-black text-white shadow-sm"
                style={{ backgroundColor: brand }}
              >
                {lmsInitials(name)}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-[14px] leading-tight font-extrabold text-ink-900">
                {name}
              </span>
              <span className="block text-[9.5px] font-bold tracking-[0.12em] text-ink-400 uppercase">
                Learning hub
              </span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden md:block">
              <LmsNav base={base} canManage={access.canManage} signedIn={Boolean(auth)} />
            </div>
            {auth ? (
              <Link
                href="/settings"
                className="flex size-8 flex-none items-center justify-center rounded-full ring-2 ring-white"
                title="Your GuruLens settings"
              >
                <Avatar
                  name={auth.user.name}
                  src={auth.user.avatarKey ? `/api/media/${auth.user.avatarKey}` : null}
                  size="sm"
                />
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-3 py-1.5 text-[11.5px] font-bold text-white md:hidden"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
        <div className="mx-auto w-full max-w-6xl px-4 pb-2 md:hidden">
          <LmsNav base={base} canManage={access.canManage} signedIn={Boolean(auth)} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 sm:py-7">{children}</main>

      <footer className="mt-8 border-t border-ink-100 bg-white/70">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-center sm:flex-row sm:px-6 sm:text-left">
          <p className="text-[11.5px] font-semibold text-ink-400">
            {name} · powered by{" "}
            <Link href="/" className="font-bold text-brand-600 hover:text-brand-700">
              GuruLens
            </Link>
          </p>
          <div className="flex items-center gap-3 text-[10.5px] font-semibold text-ink-400">
            <Link href="/terms" className="hover:text-ink-700">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-ink-700">
              Privacy
            </Link>
            <span className="inline-flex items-center gap-1">
              <Icon name="shield-check" size={11} className="text-success-600" /> Verified learning
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
