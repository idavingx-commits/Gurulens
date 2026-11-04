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

  const existing = await db.savedPost.findUnique({
    where: { userId_postId: { userId: auth.user.id, postId: id } },
  });

  if (!existing) {
    await db.$transaction([
      db.savedPost.create({ data: { userId: auth.user.id, postId: id } }),
      db.post.update({ where: { id }, data: { saveCount: { increment: 1 } } }),
    ]);
  }

  return ok({ saved: true });
});

export const DELETE = route<Ctx>(async (req: NextRequest, ctx) => {
  const auth = await requireAuth(req);
  const { id } = await ctx.params;
  await getPost(id);

  const existing = await db.savedPost.findUnique({
    where: { userId_postId: { userId: auth.user.id, postId: id } },
  });

  if (existing) {
    await db.$transaction([
      db.savedPost.delete({ where: { userId_postId: { userId: auth.user.id, postId: id } } }),
      db.post.update({ where: { id }, data: { saveCount: { decrement: 1 } } }),
    ]);
  }

  return ok({ saved: false });
});
