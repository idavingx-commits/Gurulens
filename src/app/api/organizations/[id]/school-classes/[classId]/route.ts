/**
 * Update / delete a school grade/section group. Owner/admin only.
 * Deleting a group unlinks its students (SetNull) and removes its timetable.
 */

import { type NextRequest } from "next/server";
import { z } from "zod";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { getOrgAccess } from "@/lib/organizations";

type Ctx = { params: Promise<{ id: string; classId: string }> };

const updateSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  gradeId: z.string().trim().min(1).nullable().optional(),
  section: z.string().trim().max(20).nullable().optional(),
  room: z.string().trim().max(60).nullable().optional(),
  classTeacherId: z.string().trim().min(1).nullable().optional(),
});

async function requireClassAdmin(req: NextRequest, id: string) {
  const auth = await requireAuth(req);
  const access = await getOrgAccess(auth.user.id, auth.user.role, id);
  if (!access.canAdminister) {
    throw new ApiError(403, "Only owners and admins can manage classes.", "forbidden");
  }
  return auth;
}

export const PATCH = route(async (req: NextRequest, ctx: Ctx) => {
  const auth = await requireClassAdmin(req, (await ctx.params).id);
  const { id, classId } = await ctx.params;
  const body = await parseBody(req, updateSchema);

  const existing = await db.schoolClass.findFirst({
    where: { id: classId, organizationId: id },
    select: { id: true, name: true },
  });
  if (!existing) throw new ApiError(404, "Class not found.", "not_found");

  if (body.name && body.name !== existing.name) {
    const clash = await db.schoolClass.findUnique({
      where: { organizationId_name: { organizationId: id, name: body.name } },
      select: { id: true },
    });
    if (clash) throw new ApiError(409, "A class with that name already exists.", "name_taken");
  }

  const updated = await db.schoolClass.update({
    where: { id: classId },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.gradeId !== undefined ? { gradeId: body.gradeId } : {}),
      ...(body.section !== undefined ? { section: body.section } : {}),
      ...(body.room !== undefined ? { room: body.room } : {}),
      ...(body.classTeacherId !== undefined ? { classTeacherId: body.classTeacherId } : {}),
    },
  });

  await writeAudit(auth.user.id, "school.class.update", classId, {
    organizationId: id,
    name: updated.name,
  });

  return ok({ class: updated });
});

export const DELETE = route(async (req: NextRequest, ctx: Ctx) => {
  const auth = await requireClassAdmin(req, (await ctx.params).id);
  const { id, classId } = await ctx.params;

  const existing = await db.schoolClass.findFirst({
    where: { id: classId, organizationId: id },
    select: { id: true, name: true },
  });
  if (!existing) throw new ApiError(404, "Class not found.", "not_found");

  await db.schoolClass.delete({ where: { id: classId } });

  await writeAudit(auth.user.id, "school.class.delete", classId, {
    organizationId: id,
    name: existing.name,
  });

  return ok({ deleted: true });
});
