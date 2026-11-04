import QRCode from "qrcode";
import { type NextRequest } from "next/server";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { generateTotpSecret, otpauthUrl, verifyTotp } from "@/lib/totp";
import { mfaActionSchema } from "@/lib/validation";

export const POST = route(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  const body = await parseBody(req, mfaActionSchema);

  const user = await db.user.findUnique({
    where: { id: auth.user.id },
    select: { email: true, mfaEnabled: true, mfaSecret: true, passwordHash: true },
  });
  if (!user) throw new ApiError(401, "Please sign in again.", "unauthenticated");

  if (body.action === "setup") {
    if (user.mfaEnabled) {
      throw new ApiError(400, "Two-factor authentication is already enabled.", "already_enabled");
    }

    const rl = rateLimit(`mfa:setup:${auth.user.id}`, 10, 60 * 60 * 1000);
    if (!rl.ok) {
      throw new ApiError(429, "Too many attempts. Please try again later.", "rate_limited");
    }

    const secret = generateTotpSecret();
    await db.user.update({ where: { id: auth.user.id }, data: { mfaSecret: secret } });

    const url = otpauthUrl(secret, user.email);
    const qrDataUrl = await QRCode.toDataURL(url, { width: 220, margin: 1 });

    return ok({ secret, otpauthUrl: url, qrDataUrl });
  }

  if (body.action === "enable") {
    if (user.mfaEnabled) {
      throw new ApiError(400, "Two-factor authentication is already enabled.", "already_enabled");
    }
    if (!user.mfaSecret) {
      throw new ApiError(400, "Start setup first — no pending secret found.", "no_secret");
    }

    const rl = rateLimit(`mfa:enable:${auth.user.id}`, 10, 15 * 60 * 1000);
    if (!rl.ok) {
      throw new ApiError(429, "Too many attempts. Please try again later.", "rate_limited");
    }

    if (!verifyTotp(user.mfaSecret, body.code)) {
      throw new ApiError(400, "That code is not valid. Check your authenticator app.", "bad_code");
    }

    await db.user.update({
      where: { id: auth.user.id },
      data: { mfaEnabled: true },
    });
    await writeAudit(auth.user.id, "mfa.enable", auth.user.id, {});
    return ok({ enabled: true });
  }

  // disable
  if (!user.mfaEnabled) {
    throw new ApiError(400, "Two-factor authentication is not enabled.", "not_enabled");
  }
  const valid = await verifyPassword(body.password, user.passwordHash);
  if (!valid) {
    throw new ApiError(400, "Your password is incorrect.", "wrong_password");
  }

  await db.user.update({
    where: { id: auth.user.id },
    data: { mfaEnabled: false, mfaSecret: null },
  });
  await writeAudit(auth.user.id, "mfa.disable", auth.user.id, {});
  return ok({ enabled: false });
});
