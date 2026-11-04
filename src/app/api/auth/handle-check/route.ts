import { type NextRequest } from "next/server";

import { ok, route } from "@/lib/api";
import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const GET = route(async (req: NextRequest) => {
  const limit = rateLimit(`handle-check:${clientIp(req)}`, 30, 60 * 1000);
  if (!limit.ok) return ok({ available: false });

  const handle = (req.nextUrl.searchParams.get("handle") ?? "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{2,29}$/.test(handle)) {
    return ok({ available: false, reason: "invalid" });
  }

  const existing = await db.teacherProfile.findUnique({ where: { handle } });
  return ok({ available: !existing });
});
