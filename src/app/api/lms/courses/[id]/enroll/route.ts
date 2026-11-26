import { type NextRequest } from "next/server";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { notify, writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { getLmsAccess, getLmsLimits, lmsWithin } from "@/lib/lms";
import { lmsEnrollActionSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

async function loadCourse(id: string) {
  const course = await db.lmsCourse.findUnique({
    where: { id },
    include: {
      workspace: {
        select: { id: true, ownerId: true, organizationId: true, subdomain: true, name: true },
      },
    },
  });
  if (!course) throw new ApiError(404, "Course not found.", "not_found");
  return course;
}

// POST: enroll the signed-in user.
export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(request);
  const { id } = await ctx.params;
  const course = await loadCourse(id);
  const access = await getLmsAccess(course.workspace, auth.user);

  const existing = await db.lmsEnrollment.findUnique({
    where: { courseId_userId: { courseId: course.id, userId: auth.user.id } },
  });
  if (existing && existing.status !== "dropped") {
    return ok({ enrollment: existing, status: existing.status });
  }

  const status = course.visibility === "public" || access.member ? "active" : "pending";

  if (status === "active") {
    const limits = await getLmsLimits(course.workspace.ownerId);
    const learners = await db.lmsEnrollment.count({
      where: {
        course: { workspaceId: course.workspaceId },
        status: { in: ["active", "pending"] },
      },
    });
    if (!lmsWithin(limits.students, learners)) {
      throw new ApiError(
        400,
        "This learning hub has reached its learner limit. Please contact the teacher.",
        "limit_students",
      );
    }
  }

  const enrollment = existing
    ? await db.lmsEnrollment.update({
        where: { id: existing.id },
        data: { status, enrolledAt: new Date(), completedAt: null },
      })
    : await db.lmsEnrollment.create({
        data: { courseId: course.id, userId: auth.user.id, status },
      });

  if (status === "pending") {
    await notify(
      course.workspace.ownerId,
      "lms_enrollment",
      "New learner request",
      `${auth.user.name} asked to join ${course.title}.`,
      `/lms/${course.workspace.subdomain}/manage`,
    );
  }

  await writeAudit(auth.user.id, "lms.course.enroll", course.id, {
    workspaceId: course.workspaceId,
    status,
  });

  return ok({ enrollment, status });
});

// PATCH: approve/remove learners (managers) or complete your own enrollment.
export const PATCH = route(async (request: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(request);
  const { id } = await ctx.params;
  const body = await parseBody(request, lmsEnrollActionSchema);
  const course = await loadCourse(id);
  const access = await getLmsAccess(course.workspace, auth.user);

  if (body.action === "complete") {
    const own = await db.lmsEnrollment.findUnique({
      where: { courseId_userId: { courseId: course.id, userId: auth.user.id } },
    });
    if (!own) throw new ApiError(404, "You are not enrolled in this course.", "not_enrolled");
    const enrollment = await db.lmsEnrollment.update({
      where: { id: own.id },
      data: { status: "completed", completedAt: new Date() },
    });
    return ok({ enrollment });
  }

  if (!access.canManage) throw new ApiError(403, "You cannot manage learners.", "forbidden");
  if (!body.enrollmentId) {
    throw new ApiError(400, "Enrollment ID is required.", "id_required");
  }
  const enrollment = await db.lmsEnrollment.findFirst({
    where: { id: body.enrollmentId, courseId: course.id },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!enrollment) throw new ApiError(404, "Enrollment not found.", "not_found");

  if (body.action === "approve") {
    if (course.visibility === "members" && !access.member) {
      // Managers are members by definition, but keep the guard explicit.
      throw new ApiError(403, "Only hub members can be approved.", "forbidden");
    }
    const limits = await getLmsLimits(course.workspace.ownerId);
    const active = await db.lmsEnrollment.count({
      where: { course: { workspaceId: course.workspaceId }, status: "active" },
    });
    if (!lmsWithin(limits.students, active)) {
      throw new ApiError(400, "The learner limit for this plan is reached.", "limit_students");
    }
    const updated = await db.lmsEnrollment.update({
      where: { id: enrollment.id },
      data: { status: "active" },
    });
    await notify(
      enrollment.userId,
      "lms_enrollment",
      "You're in! 🎉",
      `Your enrollment in ${course.title} was approved.`,
      `/lms/${course.workspace.subdomain}/courses/${course.id}`,
    );
    return ok({ enrollment: updated });
  }

  const removed = await db.lmsEnrollment.update({
    where: { id: enrollment.id },
    data: { status: "dropped" },
  });
  await notify(
    enrollment.userId,
    "lms_enrollment",
    "Enrollment removed",
    `Your seat in ${course.title} was removed by the teacher.`,
    `/lms/${course.workspace.subdomain}/courses/${course.id}`,
  );
  return ok({ enrollment: removed });
});
