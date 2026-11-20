/**
 * Like / unlike a channel post.
 * POST /api/channels/[slug]/posts/[postId]/react
 * body: { type?: "like" | "love" | "clap" | "fire" | "sad" }
 */

import { type NextRequest } from "next/server";
import { z } from "zod";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ slug: string; postId: string }> };

const bodySchema = z.object({
  type: z.enum(["like", "love", "clap", "fire", "sad"]).optional(),
});

export const POST = route(async (req: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(req);
  const { slug, postId } = await ctx.params;
  const body = await parseBody(req, bodySchema);
  const type = body.type ?? "like";

  const post = await db.channelPost.findFirst({
    where: { id: postId, channel: { slug, isActive: true }, moderationStatus: "approved" },
    select: { id: true },
  });
  if (!post) throw new ApiError(404, "Post not found.", "not_found");

  const existing = await db.channelReaction.findUnique({
    where: { channelPostId_userId: { channelPostId: post.id, userId: auth.user.id } },
    select: { id: true, type: true },
  });

  let liked: boolean;
  if (existing) {
    if (existing.type === type) {
      await db.channelReaction.delete({ where: { id: existing.id } });
      liked = false;
    } else {
      await db.channelReaction.update({ where: { id: existing.id }, data: { type } });
      liked = true;
    }
  } else {
    await db.channelReaction.create({
      data: { channelPostId: post.id, userId: auth.user.id, type },
    });
    liked = true;
  }

  const count = await db.channelReaction.count({ where: { channelPostId: post.id } });

  return ok({ liked, type, count });
});
