/**
 * Pure LMS helpers shared by both server and client code.
 *
 * Kept separate from `@/lib/lms` so client components can import formatting
 * and validation helpers without dragging in `next/headers`, `db` or other
 * server-only modules.
 */

export const LMS_ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "gurulens.us";

export const RESERVED_SUBDOMAINS = new Set([
  "www",
  "api",
  "app",
  "admin",
  "mail",
  "email",
  "smtp",
  "support",
  "help",
  "status",
  "cdn",
  "assets",
  "static",
  "media",
  "auth",
  "login",
  "logout",
  "register",
  "signup",
  "lms",
  "learn",
  "blog",
  "docs",
  "dev",
  "staging",
  "test",
  "demo",
  "gurulens",
]);

export const SUBDOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;

export type LmsLimits = {
  courses: number;
  lessons: number;
  students: number;
};

export function normalizeSubdomain(raw: string): string {
  return raw.trim().toLowerCase().replace(/\.gurulens\.us$/i, "");
}

export function validateSubdomain(raw: string): string | null {
  const value = normalizeSubdomain(raw);
  if (value.length < 3) return "Use at least 3 characters.";
  if (value.length > 30) return "Use 30 characters or fewer.";
  if (!SUBDOMAIN_PATTERN.test(value)) {
    return "Use lowercase letters, numbers and dashes only (start and end with a letter or number).";
  }
  if (RESERVED_SUBDOMAINS.has(value)) return "That name is reserved. Choose another one.";
  return null;
}

export function lmsLimitLabel(value: number): string {
  return value === -1 ? "Unlimited" : String(value);
}

export function lmsWithin(limit: number, used: number): boolean {
  return limit === -1 || used < limit;
}

/** Brand colour fallback + a readable foreground colour. */
export function lmsBrandColor(value: string | null | undefined): string {
  return /^#[0-9a-f]{6}$/i.test(value ?? "") ? value! : "#0094fd";
}

export function lmsInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "GL";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}
