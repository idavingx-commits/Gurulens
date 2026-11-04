import { type NextRequest } from "next/server";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { getAuth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/constants";
import { hydratePosts, POST_INCLUDE } from "@/lib/data";
import { db } from "@/lib/db";
import { postUpdateSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

async function getPostOr404(id: string) {
  const post = await db.post.findUnique({ where: { id }, ...POST_INCLUDE });
  if (!post) throw new ApiError(404, "Post not found.", "not_found");
  return post;
}

function canManage(role: string, viewerId: string, authorId: string): boolean {
  return viewerId === authorId || ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]);
}

export const GET = route<Ctx>(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const auth = await getAuth();
  const post = await getPostOr404(id);

  if (post.moderationStatus !== "approved" && !auth) {
    throw new ApiError(404, "Post not found.", "not_found");
  }

  await db.post
    .update({ where: { id }, data: { viewCount: { increment: 1 } } })
    .catch(() => undefined);

  const [view] = await hydratePosts([post], auth?.user.id ?? null);
  return ok({ post: view });
});

export const PATCH = route<Ctx>(async (req: NextRequest, ctx) => {
  const auth = await requireAuth(req);
  const { id } = await ctx.params;
  const post = await getPostOr404(id);

  if (!canManage(auth.user.role, auth.user.id, post.authorId)) {
    throw new ApiError(403, "You can only edit your own posts.", "forbidden");
  }

  const body = await parseBody(req, postUpdateSchema);

  if (body.mediaIds) {
    const medias = await db.media.findMany({
      where: { id: { in: body.mediaIds }, ownerId: post.authorId },
      select: { id: true, mimeType: true },
    });
    if (medias.length !== new Set(body.mediaIds).size) {
      throw new ApiError(400, "One or more attachments are invalid.", "bad_media");
    }
    if (medias.some((m) => !m.mimeType.startsWith("image/"))) {
      throw new ApiError(400, "Attachments must be image files.", "bad_media");
    }
  }

  if (body.videoId) {
    const video = await db.media.findUnique({
      where: { id: body.videoId },
      select: { ownerId: true, mimeType: true },
    });
    if (!video || video.ownerId !== post.authorId || !video.mimeType.startsWith("video/")) {
      throw new ApiError(400, "The video file is invalid.", "bad_video");
    }
  }

  const updated = await db.post.update({
    where: { id },
    data: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.text !== undefined ? { text: body.text } : {}),
      ...(body.mediaIds !== undefined
        ? { mediaIds: body.mediaIds.length > 0 ? JSON.stringify(body.mediaIds) : null }
        : {}),
      ...(body.videoId !== undefined ? { videoId: body.videoId } : {}),
      ...(body.subjectId !== undefined ? { subjectId: body.subjectId } : {}),
      ...(body.gradeId !== undefined ? { gradeId: body.gradeId } : {}),
      ...(body.visibility !== undefined ? { visibility: body.visibility } : {}),
    },
    ...POST_INCLUDE,
  });

  await writeAudit(auth.user.id, "post.update", id);

  const [view] = await hydratePosts([updated], auth.user.id);
  return ok({ post: view });
});

export const DELETE = route<Ctx>(async (req: NextRequest, ctx) => {
  const auth = await requireAuth(req);
  const { id } = await ctx.params;
  const post = await getPostOr404(id);

  if (!canManage(auth.user.role, auth.user.id, post.authorId)) {
    throw new ApiError(403, "You can only delete your own posts.", "forbidden");
  }

  await db.post.delete({ where: { id } });
  await writeAudit(auth.user.id, "post.delete", id);

  return ok({ deleted: true });
});
