import { ok, requireAuth, route } from "@/lib/api";
import { clearSessionCookie, destroySession } from "@/lib/auth";

export const POST = route(async (req) => {
  const auth = await requireAuth(req);
  await destroySession(auth.sessionId);
  await clearSessionCookie();
  return ok({ signedOut: true });
});
