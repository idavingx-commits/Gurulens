import { type NextRequest } from "next/server";

import { ApiError, ok, parseBody, route } from "@/lib/api";
import { createSession, setSessionCookie, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { verifyTotp } from "@/lib/totp";
import { loginSchema } from "@/lib/validation";

export const POST = route(async (req: NextRequest) => {
  const ip = clientIp(req);
  const ipLimit = rateLimit(`login:ip:${ip}`, 15, 15 * 60 * 1000);
  if (!ipLimit.ok) {
    throw new ApiError(429, "Too many login attempts. Please try again in a few minutes.", "rate_limited");
  }

  const body = await parseBody(req, loginSchema);

  const emailLimit = rateLimit(`login:email:${body.email}`, 8, 15 * 60 * 1000);
  if (!emailLimit.ok) {
    throw new ApiError(429, "Too many login attempts for this account. Please wait and try again.", "rate_limited");
  }

  const user = await db.user.findUnique({ where: { email: body.email } });

  // Uniform error for unknown email / wrong password (no account enumeration).
  const invalid = new ApiError(401, "Incorrect email or password.", "invalid_credentials");
  if (!user) {
    // Burn comparable time to reduce timing signal.
    await verifyPassword(body.password, "$2a$11$abcdefghijklmnopqrstuvabcdefghijklmnopqrstuv");
    throw invalid;
  }

  const valid = await verifyPassword(body.password, user.passwordHash);
  if (!valid) throw invalid;

  if (user.status === "suspended") {
    throw new ApiError(403, "This account is suspended. Contact support for help.", "suspended");
  }
  if (user.status === "pending_deletion") {
    throw new ApiError(403, "This account is scheduled for deletion.", "pending_deletion");
  }

  const needsMfa = user.mfaEnabled && user.mfaSecret;

  if (needsMfa) {
    if (!body.totp) {
      throw new ApiError(401, "Enter your 6-digit authenticator code.", "mfa_required");
    }
    if (!verifyTotp(user.mfaSecret!, body.totp)) {
      throw new ApiError(401, "Invalid authenticator code. Try again.", "mfa_invalid");
    }
  }

  const session = await createSession(user.id, {
    userAgent: req.headers.get("user-agent"),
    ip,
  });
  await setSessionCookie(session.token, session.expiresAt, session.csrfToken);

  return ok({
    userId: user.id,
    role: user.role,
    name: user.name,
  });
});
