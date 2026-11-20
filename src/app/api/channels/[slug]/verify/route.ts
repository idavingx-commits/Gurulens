/**
 * Submit a channel verification request.
 * :slug is the channel slug. Channel owner or organization staff only.
 */

import { type NextRequest } from "next/server";
import { z } from "zod";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { requestChannelVerification } from "@/lib/channels";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ slug: string }> };

const bodySchema = z.object({
  evidenceKeys: z.array(z.string().min(1)).max(10).optional(),
  evidenceNote: z.string().trim().max(1000).optional(),
});

export const POST = route(async (req: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(req);
  const { slug } = await ctx.params;
  const body = await parseBody(req, bodySchema);

  const channel = await db.channel.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      ownerId: true,
      ownerType: true,
      organizationId: true,
      verifiedStatus: true,
      isActive: true,
    },
  });
  if (!channel || !channel.isActive) throw new ApiError(404, "Channel not found.", "not_found");

  let canRequest = auth.user.role === "admin";

  if (!canRequest && channel.ownerType === "user") {
    canRequest = channel.ownerId === auth.user.id;
  }

  if (!canRequest && channel.ownerType === "organization" && channel.organizationId) {
    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: channel.organizationId,
          userId: auth.user.id,
        },
      },
      select: { role: true, status: true },
    });
    canRequest =
      membership?.status === "active" && ["owner", "admin", "manager"].includes(membership.role);
  }

  if (!canRequest) {
    throw new ApiError(403, "You do not have permission to request verification.", "forbidden");
  }

  if (channel.verifiedStatus === "verified") {
    throw new ApiError(400, "This channel is already verified.", "already_verified");
  }

  if (!body.evidenceNote && (body.evidenceKeys?.length ?? 0) === 0) {
    throw new ApiError(400, "Add a note or at least one evidence file.", "evidence_required");
  }

  try {
    const request = await requestChannelVerification({
      channelId: channel.id,
      evidenceKeys: body.evidenceKeys ?? [],
      evidenceNote: body.evidenceNote,
    });

    await writeAudit(auth.user.id, "channel.verification.request", channel.id, {
      requestId: request.id,
    });

    return ok({ request: { id: request.id, status: request.status } }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message.includes("already pending")) {
      throw new ApiError(400, "A verification request is already pending.", "already_pending");
    }
    throw err;
  }
});
