/**
 * School grade/section groups ("Grade 10 — A").
 * GET is public (class names appear on the public profile); creating and
 * editing groups requires owner/admin access.
 */

import { type NextRequest } from "next/server";
import { z } from "zod";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { getOrgAccess } from "@/lib/organizations";
import { getSchoolClasses } from "@/lib/school";

type Ctx = { params: Promise<{ id: string }> };

const createSchema = z.object({
  name: z.string().trim().min(1, "Class name is required.").max(60),
  gradeId: z.string().trim().min(1).nullable().optional(),
  section: z.string().trim().max(20).nullable().optional(),
  room: z.string().trim().max(60).nullable().optional(),
  classTeacherId: z.string().trim().min(1).nullable().optional(),
});

export const GET = route(async (_req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const org = await db.organization.findUnique({
    where: { id },
    select: { id: true, type: true },
  });
  if (!org || org.type !== "school") {
    throw new ApiError(404, "School not found.", "not_found");
  }
  const classes = await getSchoolClasses(id);
  return ok({
    classes: classes.map((c) => ({
      id: c.id,
      name: c.name,
      gradeId: c.gradeId,
      section: c.section,
      room: c.room,
      classTeacherId: c.classTeacherId,
      students: c._count.members,
    })),
  });
});

export const POST = route(async (req: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(req);
  const { id } = await ctx.params;
  const access = await getOrgAccess(auth.user.id, auth.user.role, id);
  if (!access.canAdminister) {
    throw new ApiError(403, "Only owners and admins can manage classes.", "forbidden");
  }
  const org = await db.organization.findUnique({
    where: { id },
    select: { type: true },
  });
  if (!org || org.type !== "school") {
    throw new ApiError(400, "Timetables are only available for schools.", "not_school");
  }

  const body = await parseBody(req, createSchema);

  const clash = await db.schoolClass.findUnique({
    where: { organizationId_name: { organizationId: id, name: body.name } },
    select: { id: true },
  });
  if (clash) throw new ApiError(409, "A class with that name already exists.", "name_taken");

  if (body.classTeacherId) {
    const teacher = await db.organizationMember.findFirst({
      where: { organizationId: id, userId: body.classTeacherId, status: "active" },
      select: { id: true },
    });
    if (!teacher) {
      throw new ApiError(400, "The class teacher must be an active member.", "invalid_teacher");
    }
  }

  const schoolClass = await db.schoolClass.create({
    data: {
      organizationId: id,
      name: body.name,
      gradeId: body.gradeId || null,
      section: body.section || null,
      room: body.room || null,
      classTeacherId: body.classTeacherId || null,
    },
  });

  await writeAudit(auth.user.id, "school.class.create", schoolClass.id, {
    organizationId: id,
    name: schoolClass.name,
  });

  return ok({ class: schoolClass }, { status: 201 });
});
