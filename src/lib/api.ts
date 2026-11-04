import { NextResponse, type NextRequest } from "next/server";
import type { ZodType } from "zod";

import { getAuth, safeEqual, type AuthContext } from "@/lib/auth";
import { CSRF_HEADER, type Role } from "@/lib/constants";
import { sameOrigin } from "@/lib/rate-limit";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(status: number, message: string, code?: string): NextResponse {
  return NextResponse.json({ ok: false, error: message, code }, { status });
}

type RouteCtx = { params: Promise<Record<string, string>> };

/**
 * Wraps a route handler with uniform error handling.
 * Handlers throw ApiError for expected failures.
 */
export function route<C extends RouteCtx = RouteCtx>(
  handler: (req: NextRequest, ctx: C) => Promise<Response>,
) {
  return async (req: NextRequest, ctx: C): Promise<Response> => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) return fail(err.status, err.message, err.code);
      console.error("[api:error]", err);
      return fail(500, "Something went wrong. Please try again.");
    }
  };
}

/**
 * Server-side authorization gate for API routes.
 * - Verifies request origin for state-changing methods.
 * - Requires a valid session, optional role restriction.
 * - Verifies the CSRF token for every non-GET request.
 */
export async function requireAuth(req: Request, roles?: readonly Role[]): Promise<AuthContext> {
  if (!sameOrigin(req)) {
    throw new ApiError(403, "Invalid request origin.", "origin");
  }

  const auth = await getAuth();
  if (!auth) throw new ApiError(401, "Please sign in to continue.", "unauthenticated");

  if (roles && roles.length > 0 && !roles.includes(auth.user.role)) {
    throw new ApiError(403, "You do not have permission to do this.", "forbidden");
  }

  const method = req.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    const token = req.headers.get(CSRF_HEADER);
    if (!token || !safeEqual(token, auth.csrfToken)) {
      throw new ApiError(403, "Security check failed. Refresh the page and try again.", "csrf");
    }
  }

  return auth;
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError(400, "Invalid request body.", "bad_json");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = first?.path?.join(".") ?? "";
    throw new ApiError(
      400,
      first ? (path ? `${path}: ${first.message}` : first.message) : "Invalid input.",
      "validation",
    );
  }
  return parsed.data;
}
