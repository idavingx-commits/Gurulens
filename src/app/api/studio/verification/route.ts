import { type NextRequest } from "next/server";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { notify, writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { verificationRequestSchema } from "@/lib/validation";

export const POST = route(async (req: NextRequest) => {
  const auth = await requireAuth(req, ["teacher", "admin"]);

  const rl = rateLimit(`verify:${auth.user.id}`, 5, 24 * 60 * 60 * 1000);
  if (!rl.ok) {
    throw new ApiError(429, "Too many requests. Please try again tomorrow.", "rate_limited");
  }

  const body = await parseBody(req, verificationRequestSchema);

  const profile = await db.teacherProfile.findUnique({
    where: { userId: auth.user.id },
    select: { id: true, verifiedStatus: true },
  });
  if (!profile) throw new ApiError(404, "Teacher profile not found.", "not_found");
  if (profile.verifiedStatus === "verified") {
    throw new ApiError(400, "Your profile is already verified.", "already_verified");
  }

  const openRequest = await db.verificationRequest.findFirst({
    where: { teacherId: auth.user.id, status: { in: ["pending", "in_review", "more_info"] } },
    select: { id: true },
  });
  if (openRequest) {
    throw new ApiError(409, "You already have a verification request in progress.", "request_open");
  }

  let evidenceKey: string | null = null;
  if (body.evidenceMediaId) {
    const media = await db.media.findUnique({
      where: { id: body.evidenceMediaId },
      select: { id: true, ownerId: true },
    });
    if (!media || media.ownerId !== auth.user.id) {
      throw new ApiError(400, "Invalid evidence file.", "bad_evidence");
    }
    evidenceKey = media.id;
  }

  const request = await db.verificationRequest.create({
    data: {
      teacherId: auth.user.id,
      status: "pending",
      evidenceNote: body.evidenceNote ?? null,
      evidenceKey,
    },
    select: { id: true, status: true, createdAt: true },
  });

  await db.teacherProfile.update({
    where: { id: profile.id },
    data: { verifiedStatus: "pending" },
  });

  await writeAudit(auth.user.id, "verification.request", request.id, {});
  await notify(
    auth.user.id,
    "verification",
    "Verification request submitted",
    "Our moderators will review your documents and get back to you soon.",
    "/studio/verification",
  );

  return ok({ request }, { status: 201 });
});
