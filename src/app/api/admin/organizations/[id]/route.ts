/**
 * Admin action on an organization verification request.
 * The :id param is the OrganizationVerificationRequest id.
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

  const request = await db.organizationVerificationRequest.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      organization: { select: { id: true, name: true, slug: true, type: true } },
    },
  });
  if (!request) throw new ApiError(404, "Verification request not found.", "not_found");
  if (request.status === "approved" || request.status === "rejected") {
    throw new ApiError(400, "This request has already been decided.", "already_decided");
  }

  if ((body.action === "request_info" || body.action === "reject") && !body.reason) {
    throw new ApiError(400, "A reason is required for this action.", "reason_required");
  }

  // action -> request status + organization verifiedStatus
  const statusMap: Record<string, { request: string; org: string }> = {
    in_review: { request: "in_review", org: "in_review" },
    request_info: { request: "pending", org: "pending" },
    approve: { request: "approved", org: "verified" },
    reject: { request: "rejected", org: "rejected" },
  };
  const mapped = statusMap[body.action]!;

  await db.$transaction(async (tx) => {
    await tx.organizationVerificationRequest.update({
      where: { id },
      data: {
        status: mapped.request,
        reviewerId: auth.user.id,
        ...(body.reason ? { actionReason: body.reason } : {}),
      },
    });
    await tx.organization.update({
      where: { id: request.organization.id },
      data: {
        verifiedStatus: mapped.org,
        ...(body.action === "approve" ? { verifiedAt: new Date() } : {}),
      },
    });
  });

  // Notify the organization owners / admins.
  const staff = await db.organizationMember.findMany({
    where: {
      organizationId: request.organization.id,
      status: "active",
      role: { in: ["owner", "admin", "manager"] },
    },
    select: { userId: true },
  });

  const notifyMap: Record<string, { title: string; body: string }> = {
    in_review: {
      title: "Your organization verification is being reviewed",
      body: "A moderator has started reviewing the submitted evidence.",
    },
    request_info: {
      title: "More information needed for organization verification",
      body: body.reason ?? "",
    },
    approve: {
      title: `${request.organization.name} is now verified`,
      body: "Your organization has the verified badge across GuruLens.",
    },
    reject: {
      title: "Organization verification not approved",
      body: body.reason ?? "",
    },
  };

  await Promise.all(
    staff.map((m) =>
      notify(
        m.userId,
        "verification",
        notifyMap[body.action]!.title,
        notifyMap[body.action]!.body,
        `/campus/${request.organization.slug}`,
      ),
    ),
  );

  await writeModerationAction(auth.user.id, "organization_verification", id, body.action, body.reason ?? null);
  await writeAudit(auth.user.id, `organization.verification.${body.action}`, request.organization.id, {
    requestId: id,
    reason: body.reason ?? null,
  });

  return ok({
    reviewed: true,
    requestStatus: mapped.request,
    organizationStatus: mapped.org,
  });
});
