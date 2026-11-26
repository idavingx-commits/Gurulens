import { type NextRequest } from "next/server";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { getLmsAccess } from "@/lib/lms";
import { lmsCourseUpdateSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "course";
}

async function courseForManager(id: string, user: { id: string; role: string }) {
  const course = await db.lmsCourse.findUnique({
    where: { id },
    include: {
      workspace: { select: { id: true, ownerId: true, organizationId: true } },
    },
  });
  if (!course) throw new ApiError(404, "Course not found.", "not_found");
  const access = await getLmsAccess(course.workspace, user);
  if (!access.canManage) throw new ApiError(403, "You cannot edit this course.", "forbidden");
  return course;
}

async function coverFor(
  userId: string,
  mediaId: string | null | undefined,
): Promise<string | null | undefined> {
  if (mediaId === undefined) return undefined;
  if (mediaId === null || mediaId === "") return null;
  const media = await db.media.findUnique({
    where: { id: mediaId },
    select: { ownerId: true, kind: true },
  });
  if (!media || media.ownerId !== userId || media.kind !== "class_cover") {
    throw new ApiError(400, "That course cover upload is not valid.", "bad_media");
  }
  return mediaId;
}

export const PATCH = route(async (request: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(request);
  const { id } = await ctx.params;
  const body = await parseBody(request, lmsCourseUpdateSchema);

  const course = await courseForManager(id, auth.user);

  let slug = course.slug;
  if (body.slug && body.slug !== course.slug) {
    const base = slugify(body.slug);
    const taken = await db.lmsCourse.findUnique({
      where: { workspaceId_slug: { workspaceId: course.workspaceId, slug: base } },
      select: { id: true },
    });
    if (taken && taken.id !== course.id) {
      throw new ApiError(400, "That course URL is already used.", "slug_taken");
    }
    slug = base;
  }

  const coverKey = await coverFor(auth.user.id, body.coverMediaId);

  const updated = await db.lmsCourse.update({
    where: { id: course.id },
    data: {
      title: body.title ?? course.title,
      slug,
      description:
        body.description === undefined ? course.description : body.description || null,
      level: body.level ?? course.level,
      visibility: body.visibility ?? course.visibility,
      status: body.status ?? course.status,
      subjectId: body.subjectId === undefined ? course.subjectId : body.subjectId || null,
      gradeId: body.gradeId === undefined ? course.gradeId : body.gradeId || null,
      ...(coverKey !== undefined ? { coverKey } : {}),
    },
  });

  await writeAudit(auth.user.id, "lms.course.update", course.id, {
    workspaceId: course.workspaceId,
    title: updated.title,
  });

  return ok({ course: updated });
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(request);
  const { id } = await ctx.params;
  const course = await courseForManager(id, auth.user);

  await db.lmsCourse.delete({ where: { id: course.id } });
  await writeAudit(auth.user.id, "lms.course.delete", course.id, {
    workspaceId: course.workspaceId,
    title: course.title,
  });

  return ok({ deleted: true });
});
