import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/constants";

/**
 * Optimistic route protection only (cookie presence).
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

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
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
  matcher: [
    "/studio/:path*",
    "/admin/:path*",
    "/feed",
    "/saved",
    "/dashboard",
    "/settings",
    "/notifications",
  ],
};
