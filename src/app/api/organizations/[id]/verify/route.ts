/**
 * Submit an organization verification request.
 * :id is the organization id. Owners and admins only.
 */

import { type NextRequest } from "next/server";
import { z } from "zod";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { requestOrgVerification } from "@/lib/organizations";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  evidenceKeys: z.array(z.string().min(1)).max(10).optional(),
  evidenceNote: z.string().trim().max(1000).optional(),
});

export const POST = route(async (req: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(req);
  const { id } = await ctx.params;
  const body = await parseBody(req, bodySchema);

  const org = await db.organization.findUnique({
    where: { id },
    select: { id: true, name: true, verifiedStatus: true },
  });
  if (!org) throw new ApiError(404, "Organization not found.", "not_found");

  const membership = await db.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: id, userId: auth.user.id } },
    select: { role: true, status: true },
  });

  const isPrivileged = auth.user.role === "admin";
  const canRequest =
    isPrivileged ||
    (membership?.status === "active" && ["owner", "admin", "manager"].includes(membership.role));

  if (!canRequest) {
    throw new ApiError(403, "You do not have permission to request verification.", "forbidden");
  }

  if (org.verifiedStatus === "verified") {
    throw new ApiError(400, "This organization is already verified.", "already_verified");
  }

  if (!body.evidenceNote && (body.evidenceKeys?.length ?? 0) === 0) {
    throw new ApiError(400, "Add a note or at least one evidence file.", "evidence_required");
  }

  try {
    const request = await requestOrgVerification({
      organizationId: id,
      evidenceKeys: body.evidenceKeys ?? [],
      evidenceNote: body.evidenceNote,
    });

    await writeAudit(auth.user.id, "organization.verification.request", id, {
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
