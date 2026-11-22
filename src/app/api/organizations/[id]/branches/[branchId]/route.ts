/**
 * Organization branch API.
 * PATCH  /api/organizations/[id]/branches/[branchId] — edit a branch.
 * DELETE /api/organizations/[id]/branches/[branchId] — remove a branch.
 */

import { type NextRequest } from "next/server";
import { z } from "zod";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { getOrgAccess } from "@/lib/organizations";

type Ctx = { params: Promise<{ id: string; branchId: string }> };

const nullableText = (max: number) =>
  z.union([z.string().trim().max(max), z.literal(""), z.null()]).optional();

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  address: nullableText(300),
  phone: nullableText(60),
  isMain: z.boolean().optional(),
});

function clean(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function requireAdminister(userId: string, userRole: string, organizationId: string) {
  const access = await getOrgAccess(userId, userRole, organizationId);
  if (!access.canAdminister) {
    throw new ApiError(403, "You do not have permission to manage branches.", "forbidden");
  }
}

async function findBranch(organizationId: string, branchId: string) {
  const branch = await db.organizationBranch.findFirst({
    where: { id: branchId, organizationId },
    select: { id: true, name: true, isMain: true },
  });
  if (!branch) throw new ApiError(404, "Branch not found.", "not_found");
  return branch;
}

export const PATCH = route(async (req: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(req);
  const { id, branchId } = await ctx.params;
  await requireAdminister(auth.user.id, auth.user.role, id);
  const branch = await findBranch(id, branchId);
  const body = await parseBody(req, updateSchema);

  if (body.isMain === false && branch.isMain) {
    throw new ApiError(400, "Choose another branch as the main branch instead.", "main_branch");
  }

  const data = {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.address !== undefined ? { address: clean(body.address) } : {}),
    ...(body.phone !== undefined ? { phone: clean(body.phone) } : {}),
  };

  const updated = await db.$transaction(async (tx) => {
    if (body.isMain === true) {
      await tx.organizationBranch.updateMany({
        where: { organizationId: id, isMain: true, id: { not: branchId } },
        data: { isMain: false },
      });
    }
    return tx.organizationBranch.update({
      where: { id: branchId },
      data: { ...data, ...(body.isMain === true ? { isMain: true } : {}) },
    });
  });

  await writeAudit(auth.user.id, "organization.branch.update", branchId, {
    organizationId: id,
    fields: Object.keys(body),
  });

  return ok({ branch: updated });
});

export const DELETE = route(async (req: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(req);
  const { id, branchId } = await ctx.params;
  await requireAdminister(auth.user.id, auth.user.role, id);
  const branch = await findBranch(id, branchId);

  const total = await db.organizationBranch.count({ where: { organizationId: id } });
  if (total <= 1) {
    throw new ApiError(400, "A campus needs at least one branch.", "last_branch");
  }

  const fallback = await db.organizationBranch.findFirst({
    where: { organizationId: id, id: { not: branchId } },
    orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  await db.$transaction(async (tx) => {
    await tx.organizationMember.updateMany({
      where: { organizationId: id, branchId },
      data: { branchId: null },
    });
    await tx.class.updateMany({
      where: { organizationId: id, branchId },
      data: { branchId: null },
    });
    await tx.organizationBranch.delete({ where: { id: branchId } });
    if (branch.isMain && fallback) {
      await tx.organizationBranch.update({
        where: { id: fallback.id },
        data: { isMain: true },
      });
    }
  });

  await writeAudit(auth.user.id, "organization.branch.delete", branchId, {
    organizationId: id,
    name: branch.name,
  });

  return ok({ deleted: true, fallbackMainId: branch.isMain ? fallback?.id ?? null : null });
});
