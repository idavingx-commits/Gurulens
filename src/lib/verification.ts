/**
 * One-time verification codes (email signup + phone OTP).
 * Codes are 6 digits, hashed at rest, expire in 10 minutes and allow at most
 * 5 attempts. Counters live in the DB so they survive Worker isolates.
 */

import { randomInt } from "crypto";

import { ApiError } from "./api";
import { hashToken, safeEqual } from "./auth";
import { db } from "./db";

export const CODE_TTL_MINUTES = 10;
export const MAX_ATTEMPTS = 5;

export type CodePurpose = "email_signup" | "phone";

export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

type Target = { userId?: string | null; email?: string | null; phone?: string | null };

function targetWhere(purpose: CodePurpose, target: Target) {
  return {
    purpose,
    consumedAt: null,
    ...(target.userId ? { userId: target.userId } : {}),
    ...(target.email ? { email: target.email.toLowerCase() } : {}),
    ...(target.phone ? { phone: target.phone } : {}),
  };
}

/** Invalidate previous codes and issue a fresh one. Returns the plain code. */
export async function issueCode(purpose: CodePurpose, target: Target): Promise<string> {
  const code = generateCode();
  const now = new Date();
  await db.verificationCode.updateMany({
    where: targetWhere(purpose, target),
    data: { consumedAt: now },
  });
  await db.verificationCode.create({
    data: {
      userId: target.userId ?? null,
      email: target.email?.toLowerCase() ?? null,
      phone: target.phone ?? null,
      purpose,
      codeHash: hashToken(code),
      expiresAt: new Date(now.getTime() + CODE_TTL_MINUTES * 60 * 1000),
    },
  });
  return code;
}

/** Verify a code; consumes it on success. Throws ApiError on failure. */
export async function verifyCode(
  purpose: CodePurpose,
  target: Target,
  code: string,
): Promise<void> {
  if (!/^\d{6}$/.test(code)) {
    throw new ApiError(400, "Enter the 6-digit code.", "bad_code");
  }
  const record = await db.verificationCode.findFirst({
    where: targetWhere(purpose, target),
    orderBy: { createdAt: "desc" },
  });
  if (!record || record.expiresAt.getTime() < Date.now()) {
    throw new ApiError(400, "That code has expired. Request a new one.", "code_expired");
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    await db.verificationCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
    throw new ApiError(429, "Too many attempts. Request a new code.", "code_locked");
  }
  await db.verificationCode.update({
    where: { id: record.id },
    data: { attempts: { increment: 1 } },
  });
  if (!safeEqual(record.codeHash, hashToken(code))) {
    throw new ApiError(400, "That code is incorrect. Check and try again.", "code_invalid");
  }
  await db.verificationCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });
}

/** Normalize a Sri Lankan mobile number to +947XXXXXXXX. */
export function normalizeLkPhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  const international = digits.match(/^\+?94(7\d{8})$/);
  if (international) return `+94${international[1]}`;
  const local = digits.match(/^0(7\d{8})$/);
  if (local) return `+94${local[1]}`;
  return null;
}
