import { type NextRequest } from "next/server";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { notify } from "@/lib/audit";
import { getAuth } from "@/lib/auth";
import { ADMIN_ROLES, type Role } from "@/lib/constants";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { commentSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Approved + visible to the viewer. Members-only posts mirror the post page:
 * the author, supporters (active membership) and GuruLens admins only.
 */
async function getAccessiblePost(id: string, viewerId: string | null, viewerRole?: string) {
  const post = await db.post.findUnique({
    where: { id },
    select: { id: true, authorId: true, moderationStatus: true, visibility: true },
  });
  if (!post || post.moderationStatus !== "approved") {
    throw new ApiError(404, "Post not found.", "not_found");
  }
  if (post.visibility === "members" && viewerId !== post.authorId) {
    let allowed = Boolean(viewerRole && ADMIN_ROLES.includes(viewerRole as Role));
    if (!allowed && viewerId) {
      const membership = await db.membership.findFirst({
        where: { memberId: viewerId, status: "active", tier: { teacherId: post.authorId } },
        select: { id: true },
      });
      allowed = membership !== null;
    }
    if (!allowed) {
      throw new ApiError(403, "This post is for supporters only.", "members_only");
    }
  }
  return post;
}

export const GET = route<Ctx>(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const auth = await getAuth();
  await getAccessiblePost(id, auth?.user.id ?? null, auth?.user.role);

  const comments = await db.comment.findMany({
    where: { postId: id, moderationStatus: "approved" },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: {
      author: { select: { id: true, name: true, avatarKey: true, role: true } },
    },
  });

  return ok({
    comments: comments.map((c) => ({
      id: c.id,
      text: c.text,
      createdAt: c.createdAt,
      author: {
        id: c.author.id,
        name: c.author.name,
        avatarId: c.author.avatarKey,
        role: c.author.role,
      },
    })),
  });
});

export const POST = route<Ctx>(async (req: NextRequest, ctx) => {
  const auth = await requireAuth(req);
  const { id } = await ctx.params;
  const post = await getAccessiblePost(id, auth.user.id, auth.user.role);

  const rl = rateLimit(`comment:${auth.user.id}`, 30, 10 * 60 * 1000);
  if (!rl.ok) {
    throw new ApiError(429, "You are commenting too fast. Please slow down.", "rate_limited");
  }

  const body = await parseBody(req, commentSchema);

  const [comment] = await db.$transaction([
    db.comment.create({
      data: { postId: id, authorId: auth.user.id, text: body.text, moderationStatus: "approved" },
      include: { author: { select: { id: true, name: true, avatarKey: true, role: true } } },
    }),
    db.post.update({
      where: { id },
      data: { commentCount: { increment: 1 } },
    }),
  ]);

  if (post.authorId !== auth.user.id) {
    await notify(
      post.authorId,
      "comment",
      `${auth.user.name} commented on your post`,
      body.text.slice(0, 140),
      `/post/${id}`,
    );
  }

  return ok(
    {
      comment: {
        id: comment.id,
        text: comment.text,
        createdAt: comment.createdAt,
        author: {
          id: comment.author.id,
          name: comment.author.name,
          avatarId: comment.author.avatarKey,
          role: comment.author.role,
        },
      },
    },
    { status: 201 },
  );
});
