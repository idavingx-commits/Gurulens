/**
 * Admin action on a channel verification request.
 * The :id param is the ChannelVerificationRequest id.
 *
 * actions: in_review | request_info | approve | reject
 */

import { type NextRequest } from "next/server";
import { z } from "zod";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { notify, writeAudit, writeModerationAction } from "@/lib/audit";
import { ADMIN_ROLES } from "@/lib/constants";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  action: z.enum(["in_review", "request_info", "approve", "reject"]),
  reason: z.string().trim().max(300).optional(),
});

export const POST = route(async (req: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(req, ADMIN_ROLES);
  const { id } = await ctx.params;
  const body = await parseBody(req, bodySchema);

  const request = await db.channelVerificationRequest.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      channel: {
        select: {
          id: true,
          name: true,
          slug: true,
          ownerId: true,
          ownerType: true,
          organizationId: true,
        },
      },
    },
  });
  if (!request) throw new ApiError(404, "Verification request not found.", "not_found");
  if (request.status === "approved" || request.status === "rejected") {
    throw new ApiError(400, "This request has already been decided.", "already_decided");
  }

  if ((body.action === "request_info" || body.action === "reject") && !body.reason) {
    throw new ApiError(400, "A reason is required for this action.", "reason_required");
  }

  // action -> request status + channel verifiedStatus
  const statusMap: Record<string, { request: string; channel: string }> = {
    in_review: { request: "in_review", channel: "in_review" },
    request_info: { request: "pending", channel: "pending" },
    approve: { request: "approved", channel: "verified" },
    reject: { request: "rejected", channel: "rejected" },
  };
  const mapped = statusMap[body.action]!;

  await db.$transaction(async (tx) => {
    await tx.channelVerificationRequest.update({
      where: { id },
      data: {
        status: mapped.request,
        reviewerId: auth.user.id,
        ...(body.reason ? { actionReason: body.reason } : {}),
      },
    });
    await tx.channel.update({
      where: { id: request.channel.id },
      data: {
        verifiedStatus: mapped.channel,
        ...(body.action === "approve" ? { verifiedAt: new Date() } : {}),
      },
    });
  });

  // Resolve who should hear about the decision.
  const recipients: string[] = [];
  if (request.channel.ownerType === "organization" && request.channel.organizationId) {
    const staff = await db.organizationMember.findMany({
      where: {
        organizationId: request.channel.organizationId,
        status: "active",
        role: { in: ["owner", "admin", "manager"] },
      },
      select: { userId: true },
    });
    recipients.push(...staff.map((m) => m.userId));
  } else {
    recipients.push(request.channel.ownerId);
  }

  const notifyMap: Record<string, { title: string; body: string }> = {
    in_review: {
      title: "Your channel verification is being reviewed",
      body: "A moderator has started reviewing the submitted evidence.",
    },
    request_info: {
      title: "More information needed for channel verification",
      body: body.reason ?? "",
    },
    approve: {
      title: `${request.channel.name} is now a verified channel`,
      body: "Your channel now shows the verified tick to every follower.",
    },
    reject: {
      title: "Channel verification not approved",
      body: body.reason ?? "",
    },
  };

  await Promise.all(
    [...new Set(recipients)].map((userId) =>
      notify(
        userId,
        "verification",
        notifyMap[body.action]!.title,
        notifyMap[body.action]!.body,
        `/channel/${request.channel.slug}`,
      ),
    ),
  );

  await writeModerationAction(auth.user.id, "channel_verification", id, body.action, body.reason ?? null);
  await writeAudit(auth.user.id, `channel.verification.${body.action}`, request.channel.id, {
    requestId: id,
    reason: body.reason ?? null,
  });

  return ok({
    reviewed: true,
    requestStatus: mapped.request,
    channelStatus: mapped.channel,
  });
});
