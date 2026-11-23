/**
 * Organization member API.
 * PATCH  /api/organizations/[id]/members/[memberId] — role, branch or status.
 * DELETE /api/organizations/[id]/members/[memberId] — remove from the campus.
 */

import { type NextRequest } from "next/server";
import { z } from "zod";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { notify, writeAudit } from "@/lib/audit";
import { ADMIN_ROLES, type Role } from "@/lib/constants";
import { db } from "@/lib/db";
import { ORG_MEMBER_ROLES, getOrgAccess, getOrgCapacity } from "@/lib/organizations";
import { normalizeSchoolId } from "@/lib/school";

type Ctx = { params: Promise<{ id: string; memberId: string }> };

const updateSchema = z.object({
  role: z.enum(ORG_MEMBER_ROLES).optional(),
  status: z.enum(["active", "suspended", "invited"]).optional(),
  branchId: z.string().trim().min(1).nullable().optional(),
  schoolClassId: z.string().trim().min(1).nullable().optional(),
  admissionNo: z.string().trim().max(40).nullable().optional(),
  indexNo: z.string().trim().max(40).nullable().optional(),
  staffId: z.string().trim().max(40).nullable().optional(),
});

async function requireAdminister(userId: string, userRole: string, organizationId: string) {
  const access = await getOrgAccess(userId, userRole, organizationId);
  if (!access.canAdminister) {
    throw new ApiError(403, "You do not have permission to manage the team.", "forbidden");
  }
  return access;
}

async function findMember(organizationId: string, memberId: string) {
  const member = await db.organizationMember.findFirst({
    where: { id: memberId, organizationId },
    select: {
      id: true,
      role: true,
      status: true,
      userId: true,
      user: { select: { name: true } },
    },
  });
  if (!member) throw new ApiError(404, "Team member not found.", "not_found");
  return member;
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

function guardOwnerChange(
  actorRole: string,
  accessRole: string | null,
  targetRole: string,
  nextRole: string | undefined,
  nextStatus: string | undefined,
) {
  const isSystemAdmin = ADMIN_ROLES.includes(actorRole as Role);
  const remainsOwner = (nextRole ?? targetRole) === "owner";
  const remainsActive = (nextStatus ?? "active") === "active";

  if (targetRole === "owner" && !isSystemAdmin && accessRole !== "owner") {
    throw new ApiError(403, "Only an owner can change another owner.", "forbidden");
  }

  return {
    needsLastOwnerCheck: targetRole === "owner" && (!remainsOwner || !remainsActive),
  };
}

export const PATCH = route(async (req: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(req);
  const { id, memberId } = await ctx.params;
  const access = await requireAdminister(auth.user.id, auth.user.role, id);
  const member = await findMember(id, memberId);
  const body = await parseBody(req, updateSchema);

  if (
    body.role === undefined &&
    body.status === undefined &&
    body.branchId === undefined &&
    body.schoolClassId === undefined &&
    body.admissionNo === undefined &&
    body.indexNo === undefined &&
    body.staffId === undefined
  ) {
    throw new ApiError(400, "Nothing to update.", "empty");
  }

  const { needsLastOwnerCheck } = guardOwnerChange(
    auth.user.role,
    access.role,
    member.role,
    body.role,
    body.status,
  );

  if (needsLastOwnerCheck) {
    const owners = await db.organizationMember.count({
      where: { organizationId: id, role: "owner", status: "active" },
    });
    if (owners <= 1) {
      throw new ApiError(
        400,
        "A campus must keep at least one active owner.",
        "last_owner",
      );
    }
  }

  if (
    (body.role === "teacher" || body.role === "staff") &&
    member.role !== body.role &&
    member.status === "active"
  ) {
    const capacity = await getOrgCapacity(id);
    if (capacity.usage.teachers >= capacity.limits.teacherQuota) {
      throw new ApiError(
        400,
        `Teacher seats are full (${capacity.limits.teacherQuota}).`,
        "quota_reached",
      );
    }
  }

  const effectiveRole = body.role ?? member.role;
  if (
    body.status === "active" &&
    member.status !== "active" &&
    (effectiveRole === "teacher" || effectiveRole === "staff")
  ) {
    const capacity = await getOrgCapacity(id);
    if (capacity.usage.teachers >= capacity.limits.teacherQuota) {
      throw new ApiError(
        400,
        `Teacher seats are full (${capacity.limits.teacherQuota}).`,
        "quota_reached",
      );
    }
  }

  const branchId =
    body.branchId === undefined ? undefined : await validateBranch(id, body.branchId);

  // School class must belong to this campus.
  let schoolClassId: string | null | undefined;
  if (body.schoolClassId !== undefined) {
    if (body.schoolClassId === null) {
      schoolClassId = null;
    } else {
      const schoolClass = await db.schoolClass.findFirst({
        where: { id: body.schoolClassId, organizationId: id },
        select: { id: true },
      });
      if (!schoolClass) throw new ApiError(400, "Choose a valid class.", "invalid_class");
      schoolClassId = schoolClass.id;
    }
  }

  // School identifiers stay unique within the campus.
  const idFields = {
    admissionNo: body.admissionNo === undefined ? undefined : body.admissionNo ? normalizeSchoolId(body.admissionNo) : null,
    indexNo: body.indexNo === undefined ? undefined : body.indexNo ? normalizeSchoolId(body.indexNo) : null,
    staffId: body.staffId === undefined ? undefined : body.staffId ? normalizeSchoolId(body.staffId) : null,
  } as const;
  for (const [field, value] of Object.entries(idFields)) {
    if (!value) continue;
    const clash = await db.organizationMember.findFirst({
      where: {
        organizationId: id,
        id: { not: memberId },
        [field]: value,
        status: { not: "removed" },
      },
      select: { id: true },
    });
    if (clash) {
      throw new ApiError(409, `Another member already uses that ${field === "admissionNo" ? "admission number" : field === "indexNo" ? "index number" : "staff ID"}.`, "id_taken");
    }
  }

  const updated = await db.organizationMember.update({
    where: { id: memberId },
    data: {
      ...(body.role !== undefined ? { role: body.role } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(branchId !== undefined ? { branchId } : {}),
      ...(schoolClassId !== undefined ? { schoolClassId } : {}),
      ...idFields,
      ...(body.status === "active" ? { joinedAt: new Date(), invitedAt: null } : {}),
    },
    select: {
      id: true,
      role: true,
      status: true,
      branch: { select: { id: true, name: true } },
      user: { select: { id: true, name: true, email: true, avatarKey: true } },
    },
  });

  const org = await db.organization.findUnique({
    where: { id },
    select: { name: true, slug: true },
  });

  const approved = body.status === "active" && member.status === "invited";
  await notify(
    member.userId,
    "campus",
    approved
      ? `Your registration at ${org?.name ?? "school"} was approved`
      : `Your role at ${org?.name ?? "a campus"} changed`,
    approved
      ? "You now have full access to your school's timetables and school-only content."
      : `You are now ${updated.role} (${updated.status}).`,
    org ? `/campus/${org.slug}` : "/campus",
  );

  await writeAudit(auth.user.id, "organization.member.update", memberId, {
    organizationId: id,
    role: body.role ?? null,
    status: body.status ?? null,
    branchId: body.branchId ?? null,
    schoolClassId: body.schoolClassId ?? null,
  });

  return ok({ member: updated });
});

export const DELETE = route(async (req: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(req);
  const { id, memberId } = await ctx.params;
  const access = await requireAdminister(auth.user.id, auth.user.role, id);
  const member = await findMember(id, memberId);

  const isSystemAdmin = ADMIN_ROLES.includes(auth.user.role as Role);
  if (member.role === "owner" && !isSystemAdmin && access.role !== "owner") {
    throw new ApiError(403, "Only an owner can remove another owner.", "forbidden");
  }

  if (member.role === "owner") {
    const owners = await db.organizationMember.count({
      where: { organizationId: id, role: "owner", status: "active" },
    });
    if (owners <= 1) {
      throw new ApiError(400, "A campus must keep at least one active owner.", "last_owner");
    }
  }

  await db.organizationMember.update({
    where: { id: memberId },
    data: { status: "removed", branchId: null },
  });

  const org = await db.organization.findUnique({
    where: { id },
    select: { name: true, slug: true },
  });

  await notify(
    member.userId,
    "campus",
    `You were removed from ${org?.name ?? "a campus"}`,
    "Your campus access has been removed. Contact the campus owner if this was a mistake.",
    "/campus",
  );

  await writeAudit(auth.user.id, "organization.member.remove", memberId, {
    organizationId: id,
    userId: member.userId,
  });

  return ok({ removed: true });
});
