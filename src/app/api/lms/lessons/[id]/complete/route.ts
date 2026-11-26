import { type NextRequest } from "next/server";

import { ApiError, ok, requireAuth, route } from "@/lib/api";
import { notify } from "@/lib/audit";
import { db } from "@/lib/db";
import { getLmsAccess } from "@/lib/lms";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Toggle lesson completion for the signed-in learner. Preview lessons are open
 * to everyone; everything else requires an active enrollment or hub access.
 */
export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(request);
  const { id } = await ctx.params;

  const lesson = await db.lmsLesson.findUnique({
    where: { id },
    include: {
      module: {
        include: {
          course: {
            include: {
              workspace: {
                select: { id: true, ownerId: true, organizationId: true, subdomain: true },
              },
            },
          },
        },
      },
    },
  });
  if (!lesson) throw new ApiError(404, "Lesson not found.", "not_found");

  const course = lesson.module.course;
  const workspace = course.workspace;
  const access = await getLmsAccess(workspace, auth.user);
  const enrollment = await db.lmsEnrollment.findUnique({
    where: { courseId_userId: { courseId: course.id, userId: auth.user.id } },
    select: { id: true, status: true },
  });

  const canLearn =
    access.canManage ||
    (enrollment && ["active", "completed"].includes(enrollment.status)) ||
    lesson.isPreview;
  if (!canLearn) {
    throw new ApiError(
      403,
      "Enroll in this course to track your progress.",
      "not_enrolled",
    );
  }

  const existing = await db.lmsLessonProgress.findUnique({
    where: { lessonId_userId: { lessonId: lesson.id, userId: auth.user.id } },
    select: { id: true },
  });

  if (existing) {
    await db.lmsLessonProgress.delete({ where: { id: existing.id } });
  } else {
    await db.lmsLessonProgress.create({
      data: { lessonId: lesson.id, userId: auth.user.id },
    });
  }

  // Completing the final lesson marks the enrollment complete automatically.
  let courseCompleted = false;
  if (!existing && enrollment && enrollment.status !== "completed") {
    const [total, done] = await Promise.all([
      db.lmsLesson.count({ where: { module: { courseId: course.id } } }),
      db.lmsLessonProgress.count({
        where: {
          userId: auth.user.id,
          lesson: { module: { courseId: course.id } },
        },
      }),
    ]);
    if (total > 0 && done >= total) {
      courseCompleted = true;
      await db.lmsEnrollment.update({
        where: { id: enrollment.id },
        data: { status: "completed", completedAt: new Date() },
      });
      await notify(
        auth.user.id,
        "lms_completion",
        "Course completed! 🎓",
        `You finished ${course.title}. Your progress is saved.`,
        `/lms/${workspace.subdomain}/courses/${course.id}`,
      );
    }
  }

  return ok({ completed: !existing, courseCompleted });
});
