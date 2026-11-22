/**
 * Organization branches API.
 * GET  /api/organizations/[id]/branches — list branches.
 * POST /api/organizations/[id]/branches — add a branch.
 */

import { type NextRequest } from "next/server";
import { z } from "zod";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { getOrgAccess } from "@/lib/organizations";

type Ctx = { params: Promise<{ id: string }> };

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().max(300).optional(),
  phone: z.string().trim().max(60).optional(),
  isMain: z.boolean().optional(),
});

async function requireAdminister(userId: string, userRole: string, organizationId: string) {
  const access = await getOrgAccess(userId, userRole, organizationId);
  if (!access.canAdminister) {
    throw new ApiError(403, "You do not have permission to manage branches.", "forbidden");
  }
  return access;
}

export const GET = route(async (_req: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(_req);
  const { id } = await ctx.params;
  const access = await getOrgAccess(auth.user.id, auth.user.role, id);
  if (!access.canView) throw new ApiError(403, "Access denied.", "forbidden");

  const branches = await db.organizationBranch.findMany({
    where: { organizationId: id },
    orderBy: [{ isMain: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      isMain: true,
      _count: { select: { members: true, classes: true } },
    },
  });

  return ok({ branches });
});

export const POST = route(async (req: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(req);
  const { id } = await ctx.params;
  await requireAdminister(auth.user.id, auth.user.role, id);

  const body = await parseBody(req, createSchema);
  const existing = await db.organizationBranch.count({ where: { organizationId: id } });
  const makeMain = body.isMain === true || existing === 0;

  const branch = await db.$transaction(async (tx) => {
    if (makeMain) {
      await tx.organizationBranch.updateMany({
        where: { organizationId: id, isMain: true },
        data: { isMain: false },
      });
    }
    return tx.organizationBranch.create({
      data: {
        organizationId: id,
        name: body.name,
        address: body.address?.trim() || null,
        phone: body.phone?.trim() || null,
        isMain: makeMain,
      },
    });
  });

  await writeAudit(auth.user.id, "organization.branch.create", branch.id, {
    organizationId: id,
    name: branch.name,
  });

  return ok({ branch }, { status: 201 });
});
