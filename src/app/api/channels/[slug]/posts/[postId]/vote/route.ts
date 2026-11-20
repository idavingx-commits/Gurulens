/**
 * Vote on a channel poll.
 * POST /api/channels/[slug]/posts/[postId]/vote
 * body: { optionIndexes: number[] }
 */

import { type NextRequest } from "next/server";
import { z } from "zod";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { votePoll } from "@/lib/channels";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ slug: string; postId: string }> };

const bodySchema = z.object({
  optionIndexes: z.array(z.number().int().min(0)).min(1).max(20),
});

export const POST = route(async (req: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(req);
  const { slug, postId } = await ctx.params;
  const body = await parseBody(req, bodySchema);

  const post = await db.channelPost.findFirst({
    where: {
      id: postId,
      channel: { slug, isActive: true },
      moderationStatus: "approved",
    },
    select: {
      id: true,
      poll: { select: { id: true, allowMultiple: true, endsAt: true } },
    },
  });

  if (!post) throw new ApiError(404, "Post not found.", "not_found");
  if (!post.poll) throw new ApiError(400, "This post is not a poll.", "not_a_poll");

  if (post.poll.endsAt && post.poll.endsAt.getTime() < Date.now()) {
    throw new ApiError(400, "This poll has ended.", "poll_ended");
  }

  const indexes = post.poll.allowMultiple ? body.optionIndexes : [body.optionIndexes[0]!];

  try {
    const result = await votePoll(post.poll.id, auth.user.id, indexes);
    return ok({ voted: result.voted });
  } catch (err) {
    if (err instanceof Error && err.message === "Invalid option index") {
      throw new ApiError(400, "Invalid poll option.", "invalid_option");
    }
    throw err;
  }
});
