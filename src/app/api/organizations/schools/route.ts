/**
 * Public school lookup for registration / join forms.
 * Returns schools with their grade-section groups so a student can pick
 * their class while registering.
 */

import { type NextRequest } from "next/server";

import { ok, route } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getPublicSchools } from "@/lib/school";

export const GET = route(async (req: NextRequest) => {
  const rl = rateLimit(`schools-lookup:${clientIp(req)}`, 60, 60 * 1000);
  if (!rl.ok) {
    return ok({ schools: [] });
  }
  const schools = await getPublicSchools();
  return ok({ schools });
});
