/**
 * Deletion approval workflow.
 *
 * Channels with many followers and campuses (organizations) can only be
 * removed once a moderator has approved the request. Small, personal
 * channels are deleted immediately by their owner.
 */

import { db } from "@/lib/db";
import { notify, writeAudit, writeModerationAction } from "@/lib/audit";
import { deleteChannel } from "@/lib/channels";

export const CHANNEL_DELETE_APPROVAL_THRESHOLD = 100;

export function channelRequiresDeletionApproval(channel: {
  followerCount: number;
  organizationId: string | null;
}): boolean {
  return (
    channel.followerCount >= CHANNEL_DELETE_APPROVAL_THRESHOLD ||
    channel.organizationId !== null
  );
}

export type DeletionRequestRecord = {
  id: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  status: string;
  reason: string | null;
  reviewNote: string | null;
  createdAt: Date;
  decidedAt: Date | null;
  requestedBy: { id: string; name: string; email: string };
  reviewedBy: { id: string; name: string } | null;
};

/** Find an existing pending request for the same target, if any. */
export async function getPendingDeletionRequest(
  targetType: "channel" | "organization",
  targetId: string,
) {
  return db.deletionRequest.findFirst({
    where: { targetType, targetId, status: "pending" },
    orderBy: { createdAt: "desc" },
  });
}

/** Create a new pending deletion request (or reuse an existing one). */
export async function requestDeletion(params: {
  targetType: "channel" | "organization";
  targetId: string;
  targetLabel: string;
  requestedById: string;
  reason?: string | null;
}) {
  const existing = await getPendingDeletionRequest(
    params.targetType,
    params.targetId,
  );
  if (existing) return existing;

  const created = await db.deletionRequest.create({
    data: {
      targetType: params.targetType,
      targetId: params.targetId,
      targetLabel: params.targetLabel,
      requestedById: params.requestedById,
      reason: params.reason ?? null,
      status: "pending",
    },
  });

  await writeAudit(params.requestedById, `${params.targetType}.deletion.request`, params.targetId, {
    requestId: created.id,
    reason: params.reason ?? null,
  });

  return created;
}

/** Hard delete an organization's content and the organization itself. */
export async function executeOrganizationDeletion(orgId: string) {
  await db.$transaction(async (tx) => {
    // Soft-delete org-owned channels (keep content, deactivate them).
    await tx.channel.updateMany({
      where: { organizationId: orgId },
      data: { isActive: false },
    });

    // Remove the campus LMS hub entirely (cascades courses, etc.).
    await tx.lmsWorkspace.deleteMany({ where: { organizationId: orgId } });

    // ClassPulse devices are a loose string column — clean up.
    await tx.virtualDevice.deleteMany({ where: { organizationId: orgId } });

    // Org subscriptions are a loose string column — clean up.
    await tx.userSubscription.deleteMany({ where: { organizationId: orgId } });

    // The rest (branches, members, school classes, timetable, verification
    // requests) cascade from the organization FK.
    await tx.organization.delete({ where: { id: orgId } });
  });
}

/** Approve a pending deletion request and perform the deletion. */
export async function approveDeletionRequest(
  requestId: string,
  reviewerId: string,
  note?: string | null,
) {
  const request = await db.deletionRequest.findUnique({
    where: { id: requestId },
  });
  if (!request) throw new Error("Deletion request not found.");
  if (request.status !== "pending") {
    throw new Error("This request has already been decided.");
  }

  // Execute the deletion.
  if (request.targetType === "channel") {
    await deleteChannel(request.targetId);
  } else if (request.targetType === "organization") {
    await executeOrganizationDeletion(request.targetId);
  }

  const updated = await db.deletionRequest.update({
    where: { id: requestId },
    data: {
      status: "approved",
      reviewedById: reviewerId,
      reviewNote: note ?? null,
      decidedAt: new Date(),
    },
  });

  await writeModerationAction(
    reviewerId,
    `${request.targetType}_deletion`,
    request.targetId,
    "approve",
    note ?? null,
  );
  await writeAudit(reviewerId, `${request.targetType}.deletion.approve`, request.targetId, {
    requestId,
    note: note ?? null,
  });

  await notify(
    request.requestedById,
    "deletion",
    "Your deletion request was approved",
    `${request.targetLabel} has been removed from GuruLens.`,
    null,
  );

  return updated;
}

/** Reject a pending deletion request. */
export async function rejectDeletionRequest(
  requestId: string,
  reviewerId: string,
  note: string,
) {
  const request = await db.deletionRequest.findUnique({
    where: { id: requestId },
  });
  if (!request) throw new Error("Deletion request not found.");
  if (request.status !== "pending") {
    throw new Error("This request has already been decided.");
  }
  if (!note.trim()) throw new Error("A reason is required to reject.");

  const updated = await db.deletionRequest.update({
    where: { id: requestId },
    data: {
      status: "rejected",
      reviewedById: reviewerId,
      reviewNote: note,
      decidedAt: new Date(),
    },
  });

  await writeModerationAction(
    reviewerId,
    `${request.targetType}_deletion`,
    request.targetId,
    "reject",
    note,
  );
  await writeAudit(reviewerId, `${request.targetType}.deletion.reject`, request.targetId, {
    requestId,
    note,
  });

  await notify(
    request.requestedById,
    "deletion",
    "Your deletion request was not approved",
    `${request.targetLabel}: ${note}`,
    null,
  );

  return updated;
}
