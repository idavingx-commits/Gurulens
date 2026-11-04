import { type NextRequest } from "next/server";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { notify, writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { reviewReplySchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (req: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(req);
  const { id } = await ctx.params;

  const review = await db.review.findUnique({
    where: { id },
    select: { id: true, teacherId: true, authorId: true, status: true, teacherReply: true },
  });
  if (!review || review.status !== "published") {
    throw new ApiError(404, "Review not found.", "not_found");
  }
  if (review.teacherId !== auth.user.id && auth.user.role !== "admin") {
    throw new ApiError(403, "Only the reviewed teacher can reply.", "forbidden");
  }

  const body = await parseBody(req, reviewReplySchema);

  await db.review.update({
    where: { id },
    data: { teacherReply: body.reply, teacherRepliedAt: new Date() },
  });

  await writeAudit(auth.user.id, review.teacherReply ? "review.reply.update" : "review.reply", id);

  const profile = await db.teacherProfile.findUnique({
    where: { userId: review.teacherId },
    select: { handle: true },
  });
  await notify(
    review.authorId,
    "review_reply",
    "A teacher replied to your review",
    body.reply.slice(0, 120),
    profile ? `/teacher/${profile.handle}?tab=reviews` : null,
  );

  return ok({ replied: true });
});
