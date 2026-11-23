/**
 * Email verification with a 6-digit code.
 * Works with a session (right after signup) OR with just the email address
 * (returning later from the login gate) — a successful email-path verify
 * signs the user in.
 */

import { type NextRequest } from "next/server";
import { z } from "zod";

import { ApiError, ok, parseBody, route } from "@/lib/api";
import { createSession, getAuth, setSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { isMailConfigured, sendEmail, verificationEmailHtml } from "@/lib/mail";
import { clientIp, rateLimit, sameOrigin } from "@/lib/rate-limit";
import { issueCode, verifyCode } from "@/lib/verification";

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("verify"),
    email: z.string().trim().toLowerCase().email().max(254).optional(),
    code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code."),
  }),
  z.object({
    action: z.literal("resend"),
    email: z.string().trim().toLowerCase().email().max(254).optional(),
  }),
]);

async function resolveUser(req: NextRequest, email?: string) {
  const auth = await getAuth();
  if (auth) {
    const user = await db.user.findUnique({
      where: { id: auth.user.id },
      select: { id: true, email: true, role: true, emailVerified: true },
    });
    if (!user) throw new ApiError(401, "Please sign in again.", "unauthenticated");
    return { user, authed: true };
  }
  if (!email) {
    throw new ApiError(400, "Enter your email address.", "email_required");
  }
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, emailVerified: true },
  });
  // Do not reveal whether an account exists.
  if (!user) throw new ApiError(400, "That code has expired. Request a new one.", "code_expired");
  return { user, authed: false };
}

export const GET = route(async (req: NextRequest) => {
  const auth = await getAuth();
  const email = new URL(req.url).searchParams.get("email")?.toLowerCase();
  const user = auth
    ? await db.user.findUnique({
        where: { id: auth.user.id },
        select: { emailVerified: true },
      })
    : email
      ? await db.user.findUnique({ where: { email }, select: { emailVerified: true } })
      : null;
  return ok({
    emailVerified: user?.emailVerified ?? false,
    mailConfigured: isMailConfigured(),
  });
});

export const POST = route(async (req: NextRequest) => {
  if (!sameOrigin(req)) throw new ApiError(403, "Invalid request origin.", "origin");
  const body = await parseBody(req, bodySchema);
  const { user, authed } = await resolveUser(req, body.email);

  if (body.action === "verify") {
    await verifyCode("email_signup", { userId: user.id, email: user.email }, body.code);
    await db.user.update({ where: { id: user.id }, data: { emailVerified: true } });

    let signedIn = authed;
    if (!authed) {
      const session = await createSession(user.id, {
        userAgent: req.headers.get("user-agent"),
        ip: clientIp(req),
      });
      await setSessionCookie(session.token, session.expiresAt, session.csrfToken);
      signedIn = true;
    }
    return ok({ verified: true, signedIn, role: user.role });
  }

  // resend
  const ip = clientIp(req);
  const ipLimit = rateLimit(`verify-resend:ip:${ip}`, 8, 10 * 60 * 1000);
  const emailLimit = rateLimit(`verify-resend:email:${user.email}`, 3, 10 * 60 * 1000);
  if (!ipLimit.ok || !emailLimit.ok) {
    throw new ApiError(429, "Too many codes requested. Please wait a few minutes.", "rate_limited");
  }

  const code = await issueCode("email_signup", { userId: user.id, email: user.email });
  const { sent } = await sendEmail({
    to: user.email,
    subject: "Your GuruLens verification code",
    html: verificationEmailHtml(code),
  });

  return ok({
    sent,
    mailConfigured: isMailConfigured(),
    // Local development convenience only — never exposed in production.
    devCode: !isMailConfigured() && process.env.NODE_ENV !== "production" ? code : undefined,
  });
});
