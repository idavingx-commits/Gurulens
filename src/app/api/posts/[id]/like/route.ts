import { type NextRequest } from "next/server";

import { ApiError, ok, requireAuth, route } from "@/lib/api";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

async function getPost(id: string) {
  const post = await db.post.findUnique({ where: { id }, select: { id: true, moderationStatus: true } });
  if (!post || post.moderationStatus !== "approved") {
    throw new ApiError(404, "Post not found.", "not_found");
  }
  return post;
}

export const POST = route<Ctx>(async (req: NextRequest, ctx) => {
  const auth = await requireAuth(req);
  const { id } = await ctx.params;
  await getPost(id);

  const existing = await db.reaction.findUnique({
    where: { userId_postId: { userId: auth.user.id, postId: id } },
  });

  let likeCount: number;
  if (existing) {
    const post = await db.post.findUnique({ where: { id }, select: { likeCount: true } });
    likeCount = post?.likeCount ?? 0;
  } else {
    const [, post] = await db.$transaction([
      db.reaction.create({ data: { userId: auth.user.id, postId: id, type: "like" } }),
      db.post.update({
        where: { id },
        data: { likeCount: { increment: 1 } },
        select: { likeCount: true },
      }),
    ]);
    likeCount = post.likeCount;
  }

  return ok({ liked: true, likeCount });
});

export const DELETE = route<Ctx>(async (req: NextRequest, ctx) => {
  const auth = await requireAuth(req);
  const { id } = await ctx.params;
  await getPost(id);

  const existing = await db.reaction.findUnique({
    where: { userId_postId: { userId: auth.user.id, postId: id } },
  });

  let likeCount: number;
  if (existing) {
    const [, post] = await db.$transaction([
      db.reaction.delete({ where: { userId_postId: { userId: auth.user.id, postId: id } } }),
      db.post.update({
        where: { id },
        data: { likeCount: { decrement: 1 } },
        select: { likeCount: true },
      }),
    ]);
    likeCount = Math.max(0, post.likeCount);
  } else {
    const post = await db.post.findUnique({ where: { id }, select: { likeCount: true } });
    likeCount = post?.likeCount ?? 0;
  }

  return ok({ liked: false, likeCount });
});
