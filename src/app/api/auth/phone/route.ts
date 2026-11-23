/**
 * Phone OTP (Sri Lankan mobile numbers, normalized to +947XXXXXXXX).
 * send  — issues a 6-digit code and dispatches it through the SMS hook.
 * verify — checks the code and marks the number verified on the account.
 */

import { type NextRequest } from "next/server";
import { z } from "zod";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { isSmsConfigured, sendSms } from "@/lib/sms";
import { rateLimit } from "@/lib/rate-limit";
import { issueCode, normalizeLkPhone, verifyCode } from "@/lib/verification";

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("send"),
    phone: z.string().trim().min(9).max(20),
  }),
  z.object({
    action: z.literal("verify"),
    phone: z.string().trim().min(9).max(20),
    code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code."),
  }),
]);

export const POST = route(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  const body = await parseBody(req, bodySchema);

  const phone = normalizeLkPhone(body.phone);
  if (!phone) {
    throw new ApiError(400, "Enter a valid Sri Lankan mobile number (e.g. 077 123 4567).", "bad_phone");
  }

  const owner = await db.user.findUnique({ where: { phone }, select: { id: true } });
  if (owner && owner.id !== auth.user.id) {
    throw new ApiError(409, "This number is already linked to another account.", "phone_taken");
  }

  if (body.action === "send") {
    const rl = rateLimit(`phone-otp:${auth.user.id}`, 5, 10 * 60 * 1000);
    if (!rl.ok) {
      throw new ApiError(429, "Too many codes requested. Please wait a few minutes.", "rate_limited");
    }
    const code = await issueCode("phone", { userId: auth.user.id, phone });
    const { sent } = await sendSms({
      to: phone,
      message: `Your GuruLens verification code is ${code}. It expires in 10 minutes.`,
    });
    return ok({
      sent,
      smsConfigured: isSmsConfigured(),
      devCode: !isSmsConfigured() && process.env.NODE_ENV !== "production" ? code : undefined,
    });
  }

  await verifyCode("phone", { userId: auth.user.id, phone }, body.code);
  await db.user.update({
    where: { id: auth.user.id },
    data: { phone, phoneVerified: true },
  });
  await writeAudit(auth.user.id, "user.phone.verify", auth.user.id, { phone });
  return ok({ phoneVerified: true, phone });
});
