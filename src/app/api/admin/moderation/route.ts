import { type NextRequest } from "next/server";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { notify, writeAudit, writeModerationAction } from "@/lib/audit";
import { ADMIN_ROLES } from "@/lib/constants";
import { db } from "@/lib/db";
import { adminModerationActionSchema } from "@/lib/validation";

const TARGET_LABEL: Record<string, string> = {
  post: "post",
  comment: "comment",
  review: "review",
  quiz: "quiz",
  media: "file",
};

async function loadTarget(targetType: string, targetId: string) {
  switch (targetType) {
    case "post": {
      const post = await db.post.findUnique({
        where: { id: targetId },
        select: { id: true, authorId: true, moderationStatus: true },
      });
      return post && { ownerId: post.authorId, status: post.moderationStatus };
    }
    case "comment": {
      const comment = await db.comment.findUnique({
        where: { id: targetId },
        select: { id: true, authorId: true, moderationStatus: true },
      });
      return comment && { ownerId: comment.authorId, status: comment.moderationStatus };
    }
    case "review": {
      const review = await db.review.findUnique({
        where: { id: targetId },
        select: { id: true, authorId: true, status: true },
      });
      return review && { ownerId: review.authorId, status: review.status };
    }
    case "quiz": {
      const quiz = await db.quiz.findUnique({
        where: { id: targetId },
        select: { id: true, teacherId: true, moderationStatus: true },
      });
      return quiz && { ownerId: quiz.teacherId, status: quiz.moderationStatus };
    }
    case "media": {
      const media = await db.media.findUnique({
        where: { id: targetId },
        select: { id: true, ownerId: true, visibility: true },
      });
      return media && { ownerId: media.ownerId, status: media.visibility === "public" ? "approved" : "removed" };
    }
    default:
      throw new ApiError(400, "Unknown target type.", "bad_target");
  }
}

export const POST = route(async (req: NextRequest) => {
  const auth = await requireAuth(req, ADMIN_ROLES);
  const body = await parseBody(req, adminModerationActionSchema);

  const target = await loadTarget(body.targetType, body.targetId);
  if (!target) throw new ApiError(404, "The reported content no longer exists.", "not_found");

  if (body.action === "warn") {
    await notify(
      target.ownerId,
      "moderation",
      "You received a warning from the moderation team",
      body.reason?.trim() || "Please review the GuruLens community guidelines.",
      "/guidelines",
    );
  } else {
    const removing = body.action === "remove";
    const update = async () => {
      switch (body.targetType) {
        case "post":
          await db.post.update({
            where: { id: body.targetId },
            data: { moderationStatus: removing ? "removed" : "approved" },
          });
          break;
        case "comment":
          await db.comment.update({
            where: { id: body.targetId },
            data: { moderationStatus: removing ? "removed" : "approved" },
          });
          break;
        case "review":
          await db.review.update({
            where: { id: body.targetId },
            data: { status: removing ? "removed" : "published" },
          });
          break;
        case "quiz":
          await db.quiz.update({
            where: { id: body.targetId },
            data: { moderationStatus: removing ? "removed" : "approved" },
          });
          break;
        case "media":
          await db.media.update({
            where: { id: body.targetId },
            data: { visibility: removing ? "private" : "public" },
          });
          break;
      }
    };
    await update();

    await notify(
      target.ownerId,
      "moderation",
      removing
        ? `Your ${TARGET_LABEL[body.targetType]} was removed`
        : `Your ${TARGET_LABEL[body.targetType]} was restored`,
      body.reason?.trim() ||
        (removing
          ? "It broke our community guidelines. Contact support if you think this was a mistake."
          : "The moderation team restored your content."),
      removing ? "/guidelines" : null,
    );
  }

  await writeModerationAction(
    auth.user.id,
    body.targetType,
    body.targetId,
    body.action,
    body.reason ?? null,
  );
  await writeAudit(auth.user.id, `moderation.${body.action}`, body.targetId, {
    targetType: body.targetType,
    reason: body.reason ?? null,
  });

  return ok({ done: true });
});
