import { type NextRequest } from "next/server";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { getLmsAccess, getLmsLimits } from "@/lib/lms";
import { lmsOutlineSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

// PUT: replace a course's module/lesson outline atomically.
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(request);
  const { id } = await ctx.params;
  const body = await parseBody(request, lmsOutlineSchema);

  const course = await db.lmsCourse.findUnique({
    where: { id },
    include: {
      workspace: { select: { id: true, ownerId: true, organizationId: true } },
      modules: { include: { lessons: { select: { id: true } } } },
    },
  });
  if (!course) throw new ApiError(404, "Course not found.", "not_found");

  const access = await getLmsAccess(course.workspace, auth.user);
  if (!access.canManage) throw new ApiError(403, "You cannot edit this course.", "forbidden");

  const requestedLessons = body.modules.reduce((sum, module) => sum + module.lessons.length, 0);
  const limits = await getLmsLimits(course.workspace.ownerId);
  if (limits.lessons !== -1 && requestedLessons > limits.lessons) {
    throw new ApiError(
      400,
      `Your plan includes ${limits.lessons} LMS lessons. Upgrade to add more.`,
      "limit_lessons",
    );
  }

  const existingModules = new Set(course.modules.map((module) => module.id));
  const existingLessons = new Set(course.modules.flatMap((module) => module.lessons.map((l) => l.id)));

  await db.$transaction(async (tx) => {
    const keepModules: string[] = [];
    const keepLessons: string[] = [];

    for (const [moduleIndex, module] of body.modules.entries()) {
      const moduleData = {
        title: module.title,
        description: module.description || null,
        sortOrder: moduleIndex,
      };
      const savedModule =
        module.id && existingModules.has(module.id)
          ? await tx.lmsModule.update({ where: { id: module.id }, data: moduleData })
          : await tx.lmsModule.create({
              data: { ...moduleData, courseId: course.id },
            });
      keepModules.push(savedModule.id);

      for (const [lessonIndex, lesson] of module.lessons.entries()) {
        const lessonData = {
          title: lesson.title,
          description: lesson.description || null,
          content: lesson.content || null,
          videoUrl: lesson.videoUrl || null,
          durationMin: lesson.durationMin ?? null,
          isPreview: lesson.isPreview,
          sortOrder: lessonIndex,
        };
        const savedLesson =
          lesson.id && existingLessons.has(lesson.id)
            ? await tx.lmsLesson.update({ where: { id: lesson.id }, data: lessonData })
            : await tx.lmsLesson.create({
                data: { ...lessonData, moduleId: savedModule.id },
              });
        keepLessons.push(savedLesson.id);
      }
    }

    await tx.lmsLesson.deleteMany({
      where: { module: { courseId: course.id }, id: { notIn: keepLessons } },
    });
    await tx.lmsModule.deleteMany({
      where: { courseId: course.id, id: { notIn: keepModules } },
    });
    await tx.lmsCourse.update({
      where: { id: course.id },
      data: { updatedAt: new Date() },
    });
  });

  const outline = await db.lmsCourse.findUnique({
    where: { id: course.id },
    include: {
      modules: {
        orderBy: { sortOrder: "asc" },
        include: { lessons: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });

  await writeAudit(auth.user.id, "lms.course.outline", course.id, {
    workspaceId: course.workspaceId,
    modules: body.modules.length,
    lessons: requestedLessons,
  });

  return ok({ course: outline });
});
