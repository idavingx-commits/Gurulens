/**
 * School weekly timetable.
 * GET  — active school members (students, teachers, staff, managers) and
 *        GuruLens system admins only. Outsiders get 403 "school_only".
 * PUT  — owners/admins/managers replace a class's whole week.
 */

import { type NextRequest } from "next/server";
import { z } from "zod";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { getOrgAccess } from "@/lib/organizations";
import {
  canViewSchoolContent,
  getSchoolClasses,
  getSchoolContext,
  getSchoolTimetable,
  MAX_PERIODS,
  saveTimetableWeek,
} from "@/lib/school";

type Ctx = { params: Promise<{ id: string }> };

const entrySchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  period: z.number().int().min(1).max(MAX_PERIODS),
  subject: z.string().trim().min(1).max(120),
  teacher: z.string().trim().max(120).nullable().optional(),
  room: z.string().trim().max(60).nullable().optional(),
  startTime: z.string().trim().max(10).nullable().optional(),
  endTime: z.string().trim().max(10).nullable().optional(),
  note: z.string().trim().max(200).nullable().optional(),
});

const putSchema = z.object({
  schoolClassId: z.string().trim().min(1),
  entries: z.array(entrySchema).max(7 * MAX_PERIODS),
});

async function loadSchool(id: string) {
  const org = await db.organization.findUnique({
    where: { id },
    select: { id: true, type: true, name: true, slug: true },
  });
  if (!org || org.type !== "school") {
    throw new ApiError(404, "School not found.", "not_found");
  }
  return org;
}

export const GET = route(async (req: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(req);
  const { id } = await ctx.params;
  const org = await loadSchool(id);

  const context = await getSchoolContext(auth.user.id, id);
  if (!canViewSchoolContent(auth.user.role, context.isMember)) {
    throw new ApiError(
      403,
      "Timetables are only for this school's students and teachers. Join the school to get access.",
      "school_only",
    );
  }

  const classId = new URL(req.url).searchParams.get("classId") ?? undefined;
  if (classId) {
    const belongs = await db.schoolClass.findFirst({
      where: { id: classId, organizationId: id },
      select: { id: true },
    });
    if (!belongs) throw new ApiError(404, "Class not found.", "not_found");
  }

  const [classes, entries] = await Promise.all([
    getSchoolClasses(id),
    getSchoolTimetable(id, classId),
  ]);

  return ok({
    school: { id: org.id, name: org.name, slug: org.slug },
    classes: classes.map((c) => ({
      id: c.id,
      name: c.name,
      room: c.room,
      students: c._count.members,
    })),
    entries,
    membership: context.membership
      ? {
          role: context.membership.role,
          schoolClassId: context.membership.schoolClassId,
          schoolClassName: context.membership.schoolClass?.name ?? null,
        }
      : null,
  });
});

export const PUT = route(async (req: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(req);
  const { id } = await ctx.params;
  await loadSchool(id);

  const access = await getOrgAccess(auth.user.id, auth.user.role, id);
  if (!access.canManage) {
    throw new ApiError(403, "Only school managers can edit the timetable.", "forbidden");
  }

  const body = await parseBody(req, putSchema);
  const schoolClass = await db.schoolClass.findFirst({
    where: { id: body.schoolClassId, organizationId: id },
    select: { id: true, name: true },
  });
  if (!schoolClass) throw new ApiError(404, "Class not found.", "not_found");

  // Reject duplicate cells before writing.
  const seen = new Set<string>();
  for (const entry of body.entries) {
    const key = `${entry.dayOfWeek}:${entry.period}`;
    if (seen.has(key)) {
      throw new ApiError(400, "Two subjects share the same day and period.", "duplicate_cell");
    }
    seen.add(key);
  }

  const saved = await saveTimetableWeek(id, body.schoolClassId, body.entries);

  await writeAudit(auth.user.id, "school.timetable.save", body.schoolClassId, {
    organizationId: id,
    className: schoolClass.name,
    periods: saved,
  });

  return ok({ saved });
});
