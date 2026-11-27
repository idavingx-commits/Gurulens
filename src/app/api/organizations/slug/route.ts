import { type NextRequest } from "next/server";

import { ok, route } from "@/lib/api";
import { db } from "@/lib/db";

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;

/** Public availability check for a campus URL slug. */
export const GET = route(async (request: NextRequest) => {
  const raw = (new URL(request.url).searchParams.get("slug") ?? "").trim().toLowerCase();

  if (!raw) return ok({ available: false, reason: "Choose a URL slug.", normalized: "" });
  if (!SLUG_PATTERN.test(raw)) {
    return ok({
      available: false,
      reason: "Use 3–50 lowercase letters, numbers or dashes.",
      normalized: raw,
    });
  }

  const existing = await db.organization.findUnique({
    where: { slug: raw },
    select: { id: true },
  });

  return ok({
    available: !existing,
    reason: existing ? "That campus URL is already taken." : null,
    normalized: raw,
  });
});
