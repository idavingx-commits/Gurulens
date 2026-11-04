import { type NextRequest } from "next/server";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { notify, writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { claimCodeSchema } from "@/lib/validation";

export const POST = route(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  const body = await parseBody(req, claimCodeSchema);

  const rl = rateLimit(`claim:${auth.user.id}`, 10, 60 * 60 * 1000);
  if (!rl.ok) {
    throw new ApiError(429, "Too many attempts. Please try again later.", "rate_limited");
  }

  const code = await db.enrollmentCode.findUnique({
    where: { code: body.code.toUpperCase() },
    select: {
      id: true,
      teacherId: true,
      maxUses: true,
      uses: true,
      expiresAt: true,
      teacher: { select: { id: true, name: true, role: true, status: true } },
    },
  });

  if (!code || code.teacher.role !== "teacher" || code.teacher.status !== "active") {
    throw new ApiError(404, "That enrollment code was not found.", "invalid_code");
  }
  if (code.teacherId === auth.user.id) {
    throw new ApiError(400, "You cannot claim your own enrollment code.", "self_claim");
  }
  if (code.expiresAt && code.expiresAt.getTime() < Date.now()) {
    throw new ApiError(410, "That enrollment code has expired.", "code_expired");
  }
  if (code.uses >= code.maxUses) {
    throw new ApiError(410, "That enrollment code has reached its usage limit.", "code_exhausted");
  }

  const existing = await db.reviewEligibility.findUnique({
    where: { teacherId_studentId: { teacherId: code.teacherId, studentId: auth.user.id } },
  });

  if (existing && existing.status === "verified") {
    return ok({ alreadyVerified: true, teacherName: code.teacher.name });
  }

  await db.$transaction(async (tx) => {
    const fresh = await tx.enrollmentCode.findUnique({
      where: { id: code.id },
      select: { uses: true, maxUses: true },
    });
    if (!fresh || fresh.uses >= fresh.maxUses) {
      throw new ApiError(410, "That enrollment code has reached its usage limit.", "code_exhausted");
    }

    await tx.enrollmentCode.update({
      where: { id: code.id },
      data: { uses: { increment: 1 } },
    });

    if (existing) {
      await tx.reviewEligibility.update({
        where: { id: existing.id },
        data: { status: "verified", codeId: code.id },
      });
    } else {
      await tx.reviewEligibility.create({
        data: {
          teacherId: code.teacherId,
          studentId: auth.user.id,
          codeId: code.id,
          status: "verified",
        },
      });
    }
  });

  await writeAudit(auth.user.id, "eligibility.claim", code.id, { teacherId: code.teacherId });
  await notify(
    code.teacherId,
    "eligibility",
    `${auth.user.name} verified with your enrollment code`,
    "They can now leave a review on your profile.",
    null,
  );

  return ok({ verified: true, teacherId: code.teacherId, teacherName: code.teacher.name });
});
