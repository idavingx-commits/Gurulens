import { type NextRequest } from "next/server";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { notify, writeAudit, writeModerationAction } from "@/lib/audit";
import { ADMIN_ROLES, BADGE_KEYS } from "@/lib/constants";
import { db } from "@/lib/db";
import { adminVerificationActionSchema, verificationStatusSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (req: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(req, ADMIN_ROLES);
  const { id } = await ctx.params;
  const body = await parseBody(req, adminVerificationActionSchema);

  const request = await db.verificationRequest.findUnique({
    where: { id },
    select: { id: true, teacherId: true, status: true },
  });
  if (!request) throw new ApiError(404, "Verification request not found.", "not_found");
  if (request.status === "approved" || request.status === "rejected") {
    throw new ApiError(400, "This request has already been decided.", "already_decided");
  }

  const teacher = await db.user.findUnique({
    where: { id: request.teacherId },
    select: { id: true, name: true, teacherProfile: { select: { handle: true } } },
  });
  if (!teacher) throw new ApiError(404, "Teacher not found.", "not_found");
  const handle = teacher.teacherProfile?.handle;

  if ((body.action === "more_info" || body.action === "reject") && !body.reason?.trim()) {
    throw new ApiError(400, "A reason is required for this action.", "reason_required");
  }

  // status mapping: admin action -> request + profile status
  const statusMap: Record<string, { request: string; profile: string }> = {
    in_review: { request: "in_review", profile: "in_review" },
    more_info: { request: "more_info", profile: "more_info" },
    approve: { request: "approved", profile: "verified" },
    reject: { request: "rejected", profile: "rejected" },
  };
  const mapped = statusMap[body.action]!;

  await db.$transaction(async (tx) => {
    await tx.verificationRequest.update({
      where: { id },
      data: {
        status: mapped.request,
        reviewerId: auth.user.id,
        ...(body.reason ? { actionReason: body.reason.trim() } : {}),
      },
    });
    await tx.teacherProfile.update({
      where: { userId: teacher.id },
      data: {
        verifiedStatus: mapped.profile,
        ...(body.action === "approve" ? { verifiedAt: new Date() } : {}),
      },
    });
  });

  if (body.action === "approve") {
    const badge = await db.badge.findUnique({
      where: { key: BADGE_KEYS.verified },
      select: { id: true },
    });
    if (badge) {
      const existing = await db.badgeGrant.findFirst({
        where: { badgeId: badge.id, userId: teacher.id },
        select: { id: true, active: true },
      });
      if (existing) {
        if (!existing.active) {
          await db.badgeGrant.update({
            where: { id: existing.id },
            data: { active: true, revokedAt: null, grantedById: auth.user.id },
          });
        }
      } else {
        await db.badgeGrant.create({
          data: {
            badgeId: badge.id,
            userId: teacher.id,
            grantedById: auth.user.id,
            reason: "Teacher verification approved",
          },
        });
      }
    }
  }

  const notifyMap: Record<string, { title: string; body: string }> = {
    in_review: {
      title: "Your verification is being reviewed",
      body: "A moderator has started reviewing your verification evidence.",
    },
    more_info: {
      title: "More information needed for verification",
      body: body.reason?.trim() ?? "",
    },
    approve: {
      title: "You are now a verified teacher!",
      body: "Your profile has the blue tick. Students will see it on your profile and posts.",
    },
    reject: {
      title: "Verification not approved",
      body: body.reason?.trim() ?? "",
    },
  };
  await notify(
    teacher.id,
    "verification",
    notifyMap[body.action]!.title,
    notifyMap[body.action]!.body,
    handle ? "/studio/verification" : "/dashboard",
  );

  await writeModerationAction(auth.user.id, "verification", id, body.action, body.reason ?? null);
  await writeAudit(auth.user.id, `verification.${body.action}`, id, {
    teacherId: teacher.id,
    reason: body.reason ?? null,
  });

  const validStatus = verificationStatusSchema.safeParse(mapped.profile);
  return ok({
    reviewed: true,
    requestStatus: mapped.request,
    profileStatus: validStatus.success ? validStatus.data : mapped.profile,
  });
});
