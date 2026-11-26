import { type NextRequest } from "next/server";
import { z } from "zod";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { getLmsAccess, getLmsLimits, lmsWithin } from "@/lib/lms";
import { lmsCourseSchema } from "@/lib/validation";

const createSchema = lmsCourseSchema.extend({
  workspaceId: z.string().trim().min(1),
});

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "course";
}

async function uniqueSlug(workspaceId: string, base: string, ignoreId?: string): Promise<string> {
  let slug = base;
  let n = 2;
  while (true) {
    const existing = await db.lmsCourse.findUnique({
      where: { workspaceId_slug: { workspaceId, slug } },
      select: { id: true },
    });
    if (!existing || existing.id === ignoreId) return slug;
    slug = `${base.slice(0, 64)}-${n++}`;
  }
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

// POST: create a course (workspace managers only).
export const POST = route(async (request: NextRequest) => {
  const auth = await requireAuth(request);
  const body = await parseBody(request, createSchema);

  const workspace = await db.lmsWorkspace.findUnique({
    where: { id: body.workspaceId },
    select: { id: true, ownerId: true, organizationId: true, subdomain: true },
  });
  if (!workspace) throw new ApiError(404, "Workspace not found.", "not_found");

  const access = await getLmsAccess(workspace, auth.user);
  if (!access.canManage) throw new ApiError(403, "You cannot add courses here.", "forbidden");

  const limits = await getLmsLimits(workspace.ownerId);
  const used = await db.lmsCourse.count({ where: { workspaceId: workspace.id } });
  if (!lmsWithin(limits.courses, used)) {
    throw new ApiError(
      400,
      `Your plan includes ${limits.courses} LMS course${limits.courses === 1 ? "" : "s"}. Upgrade to add more.`,
      "limit_courses",
    );
  }

  const coverKey = await coverFor(auth.user.id, body.coverMediaId);
  const slug = await uniqueSlug(workspace.id, slugify(body.slug ?? body.title));

  const course = await db.lmsCourse.create({
    data: {
      workspaceId: workspace.id,
      createdById: auth.user.id,
      title: body.title,
      slug,
      description: body.description ?? null,
      level: body.level,
      visibility: body.visibility,
      status: body.status,
      subjectId: body.subjectId ?? null,
      gradeId: body.gradeId ?? null,
      coverKey: coverKey ?? null,
      sortOrder: used,
    },
  });

  await writeAudit(auth.user.id, "lms.course.create", course.id, {
    workspaceId: workspace.id,
    title: course.title,
  });

  return ok({ course }, { status: 201 });
});
