import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/constants";

/**
 * Optimistic route protection only (cookie presence) plus subdomain routing.
 * Real authorization always happens server-side in layouts and API routes.
 */

const PROTECTED_PREFIXES = [
  "/studio",
  "/admin",
  "/feed",
  "/saved",
  "/dashboard",
  "/settings",
  "/notifications",
];

/**
 * Paths that always belong to the main GuruLens site, even on a tenant
 * subdomain. Everything else is rewritten into /lms/<tenant>/…
 */
const MAIN_SITE_PREFIXES = [
  "/api",
  "/_next",
  "/brand",
  "/login",
  "/register",
  "/verify-email",
  "/terms",
  "/privacy",
  "/guidelines",
  "/support",
  "/about",
  "/pricing",
  "/lms",
  "/teacher",
  "/teachers",
  "/campus",
  "/channel",
  "/channels",
  "/post",
  "/reels",
  "/explore",
  "/feed",
  "/saved",
  "/settings",
  "/notifications",
  "/dashboard",
  "/classhub",
  "/classes",
  "/classpulse",
  "/guardian",
  "/studio",
  "/admin",
  "/search",
];

const FILE_PATHS = [
  "/favicon.ico",
  "/icon.png",
  "/apple-icon.png",
  "/manifest.webmanifest",
  "/robots.txt",
  "/sitemap.xml",
];

function isMainSitePath(pathname: string): boolean {
  if (FILE_PATHS.includes(pathname)) return true;
  return MAIN_SITE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function rootDomain(): string {
  return (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "gurulens.us").toLowerCase();
}

/** Extract the tenant slug from `<tenant>.gurulens.us` (or `<tenant>.localhost`). */
function tenantFromHost(rawHost: string | null): string | null {
  if (!rawHost) return null;
  const host = rawHost.split(",")[0]!.trim().split(":")[0]!.toLowerCase();
  const root = rootDomain();
  if (host.endsWith(`.${root}`)) {
    const sub = host.slice(0, -(root.length + 1));
    if (sub && !sub.includes(".") && sub !== "www") return sub;
  }
  if (host.endsWith(".localhost")) {
    const sub = host.slice(0, -".localhost".length);
    if (sub && !sub.includes(".") && sub !== "www") return sub;
  }
  return null;
}

function rewriteToTenant(req: NextRequest, tenant: string, pathname: string) {
  const url = req.nextUrl.clone();
  url.pathname = `/lms/${tenant}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ---- Tenant subdomains -------------------------------------------------
  const tenant = tenantFromHost(req.headers.get("host"));
  if (tenant && !isMainSitePath(pathname)) {
    return rewriteToTenant(req, tenant, pathname);
  }

  // Local development fallback: /?tenant=my-hub or /courses?tenant=my-hub
  if (process.env.NODE_ENV !== "production") {
    const host = (req.headers.get("host") ?? "").split(":")[0]!.toLowerCase();
    const devTenant = req.nextUrl.searchParams.get("tenant");
    if (
      devTenant &&
      (host === "localhost" || host === "127.0.0.1") &&
      !pathname.startsWith("/lms") &&
      !isMainSitePath(pathname)
    ) {
      const url = req.nextUrl.clone();
      url.searchParams.delete("tenant");
      url.pathname = `/lms/${devTenant.toLowerCase()}${pathname === "/" ? "" : pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  // ---- Optimistic auth gate ---------------------------------------------
  const hasSession = req.cookies.has(SESSION_COOKIE);
  if (
    !hasSession &&
    PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
