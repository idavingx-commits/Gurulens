/**
 * Organization members API.
 * GET  /api/organizations/[id]/members — list the campus team.
 * POST /api/organizations/[id]/members — add an existing GuruLens account.
 */

import { type NextRequest } from "next/server";
import { z } from "zod";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { notify, writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  ORG_MEMBER_ROLES,
  getOrgAccess,
  getOrgCapacity,
} from "@/lib/organizations";

type Ctx = { params: Promise<{ id: string }> };

const addSchema = z.object({
  email: z.string().trim().email().max(200),
  role: z.enum(ORG_MEMBER_ROLES),
  branchId: z.string().trim().min(1).nullable().optional(),
});

async function requireAdminister(userId: string, userRole: string, organizationId: string) {
  const access = await getOrgAccess(userId, userRole, organizationId);
  if (!access.canAdminister) {
    throw new ApiError(403, "You do not have permission to manage the team.", "forbidden");
  }
  return access;
}

async function validateBranch(organizationId: string, branchId: string | null | undefined) {
  if (!branchId) return null;
  const branch = await db.organizationBranch.findFirst({
    where: { id: branchId, organizationId },
    select: { id: true },
  });
  if (!branch) throw new ApiError(400, "Choose a valid branch.", "invalid_branch");
  return branch.id;
}

export const GET = route(async (req: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(req);
  const { id } = await ctx.params;
  const access = await getOrgAccess(auth.user.id, auth.user.role, id);
  if (!access.canView) throw new ApiError(403, "Access denied.", "forbidden");

  const members = await db.organizationMember.findMany({
    where: { organizationId: id, status: { not: "removed" } },
    orderBy: [{ status: "asc" }, { joinedAt: "asc" }],
    select: {
      id: true,
      role: true,
      status: true,
      joinedAt: true,
      invitedAt: true,
      admissionNo: true,
      indexNo: true,
      staffId: true,
      schoolClass: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
      user: { select: { id: true, name: true, email: true, avatarKey: true, role: true } },
    },
  });

  return ok({ members });
});

export const POST = route(async (req: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(req);
  const { id } = await ctx.params;
  const access = await requireAdminister(auth.user.id, auth.user.role, id);
  const body = await parseBody(req, addSchema);

  if (body.role === "owner" && access.role !== "owner" && access.role !== "admin") {
    throw new ApiError(403, "Only an owner can add another owner.", "forbidden");
  }

  const user = await db.user.findFirst({
    where: { email: { equals: body.email, mode: "insensitive" } },
    select: { id: true, name: true, role: true, status: true },
  });
  if (!user) {
    throw new ApiError(
      404,
      "No GuruLens account uses that email. Ask them to sign up first.",
      "user_not_found",
    );
  }
  if (user.status !== "active") {
    throw new ApiError(400, "That account is not active.", "inactive_user");
  }

  const existing = await db.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: id, userId: user.id } },
    select: { id: true, status: true, role: true },
  });
  if (existing?.status === "active") {
    throw new ApiError(409, `${user.name} is already on this campus team.`, "already_member");
  }

  if (body.role === "teacher" || body.role === "staff") {
    const capacity = await getOrgCapacity(id);
    if (capacity.usage.teachers >= capacity.limits.teacherQuota) {
      throw new ApiError(
        400,
        `Teacher seats are full (${capacity.limits.teacherQuota}). Upgrade the campus plan or free a seat first.`,
        "quota_reached",
      );
    }
  }

  const branchId = await validateBranch(id, body.branchId);

  const member = existing
    ? await db.organizationMember.update({
        where: { id: existing.id },
        data: {
          role: body.role,
          status: "active",
          branchId,
          joinedAt: new Date(),
          invitedAt: null,
        },
        select: {
          id: true,
          role: true,
          status: true,
          user: { select: { id: true, name: true, email: true, avatarKey: true } },
        },
      })
    : await db.organizationMember.create({
        data: {
          organizationId: id,
          userId: user.id,
          role: body.role,
          status: "active",
          branchId,
          permissions: body.role === "owner" ? JSON.stringify(["*"]) : null,
        },
        select: {
          id: true,
          role: true,
          status: true,
          user: { select: { id: true, name: true, email: true, avatarKey: true } },
        },
      });

  const org = await db.organization.findUnique({
    where: { id },
    select: { name: true, slug: true },
  });

  await notify(
    user.id,
    "campus",
    `You joined ${org?.name ?? "a campus"} on GuruLens`,
    `Your role is ${body.role}. Open Campus to see classes, channels and your team.`,
    org ? `/campus/${org.slug}` : "/campus",
  );

  await writeAudit(auth.user.id, "organization.member.add", member.id, {
    organizationId: id,
    userId: user.id,
    role: body.role,
  });

  return ok({ member }, { status: 201 });
});
