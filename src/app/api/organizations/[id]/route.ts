/**
 * Organization profile API.
 * PATCH /api/organizations/[id] — update campus profile and branding.
 */

import { type NextRequest } from "next/server";
import { z } from "zod";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { getOrgAccess } from "@/lib/organizations";
import { requestDeletion, getPendingDeletionRequest } from "@/lib/deletion";

type Ctx = { params: Promise<{ id: string }> };

const nullableText = (max: number) =>
  z.union([z.string().trim().max(max), z.literal(""), z.null()]).optional();

const bodySchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  nameSi: nullableText(120),
  description: nullableText(1000),
  website: z
    .union([z.string().trim().url().max(300), z.literal(""), z.null()])
    .optional(),
  phone: nullableText(60),
  email: z
    .union([z.string().trim().email().max(200), z.literal(""), z.null()])
    .optional(),
  address: nullableText(300),
  logoKey: z.string().trim().min(1).nullable().optional(),
  coverKey: z.string().trim().min(1).nullable().optional(),
});

function clean(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export const PATCH = route(async (req: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(req);
  const { id } = await ctx.params;

  const org = await db.organization.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true },
  });
  if (!org) throw new ApiError(404, "Organization not found.", "not_found");

  const access = await getOrgAccess(auth.user.id, auth.user.role, id);
  if (!access.canManage) {
    throw new ApiError(403, "You do not have permission to edit this campus.", "forbidden");
  }

  const body = await parseBody(req, bodySchema);

  for (const [field, kind] of [
    ["logoKey", "org_logo"],
    ["coverKey", "org_cover"],
  ] as const) {
    const mediaId = body[field];
    if (!mediaId) continue;
    const media = await db.media.findFirst({
      where: { id: mediaId, ownerId: auth.user.id, kind },
      select: { id: true },
    });
    if (!media) {
      throw new ApiError(400, "Invalid campus image.", "invalid_media");
    }
  }

  const data = {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.nameSi !== undefined ? { nameSi: clean(body.nameSi) } : {}),
    ...(body.description !== undefined ? { description: clean(body.description) } : {}),
    ...(body.website !== undefined ? { website: clean(body.website) } : {}),
    ...(body.phone !== undefined ? { phone: clean(body.phone) } : {}),
    ...(body.email !== undefined ? { email: clean(body.email) } : {}),
    ...(body.address !== undefined ? { address: clean(body.address) } : {}),
    ...(body.logoKey !== undefined ? { logoKey: body.logoKey } : {}),
    ...(body.coverKey !== undefined ? { coverKey: body.coverKey } : {}),
  };

  if (Object.keys(data).length === 0) {
    throw new ApiError(400, "Nothing to update.", "empty");
  }

  const updated = await db.organization.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      slug: true,
      nameSi: true,
      description: true,
      logoKey: true,
      coverKey: true,
      website: true,
      phone: true,
      email: true,
      address: true,
      verifiedStatus: true,
    },
  });

  await writeAudit(auth.user.id, "organization.profile.update", id, {
    fields: Object.keys(data),
  });

  return ok({ organization: updated });
});

// === Campus deletion (admin approval workflow) ===

export const DELETE = route(async (req: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(req);
  const { id } = await ctx.params;

  const org = await db.organization.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true, _count: { select: { members: true } } },
  });
  if (!org) throw new ApiError(404, "Organization not found.", "not_found");

  const access = await getOrgAccess(auth.user.id, auth.user.role, id);
  if (!access.canAdminister) {
    throw new ApiError(403, "You do not have permission to delete this campus.", "forbidden");
  }

  const isAdmin = auth.user.role === "admin" || auth.user.role === "moderator";

  if (isAdmin) {
    const { executeOrganizationDeletion } = await import("@/lib/deletion");
    await executeOrganizationDeletion(id);
    await writeAudit(auth.user.id, "organization.delete", id, { name: org.name });
    return ok({ deleted: true });
  }

  const existing = await getPendingDeletionRequest("organization", id);
  if (existing) {
    return ok(
      {
        approvalRequired: true,
        requestId: existing.id,
        message: "A deletion request is already pending admin review.",
      },
      { status: 202 },
    );
  }

  const created = await requestDeletion({
    targetType: "organization",
    targetId: id,
    targetLabel: `${org.name} (@${org.slug})`,
    requestedById: auth.user.id,
    reason: null,
  });

  return ok(
    {
      approvalRequired: true,
      requestId: created.id,
      message: "Deletion requested. A moderator will review it before the campus is removed.",
    },
    { status: 202 },
  );
});
