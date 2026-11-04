import { type NextRequest } from "next/server";

import { ApiError, ok, requireAuth, route } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { ADMIN_ROLES } from "@/lib/constants";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = route<Ctx>(async (req: NextRequest, ctx) => {
  const auth = await requireAuth(req);
  const { id } = await ctx.params;

  const comment = await db.comment.findUnique({
    where: { id },
    select: {
      id: true,
      authorId: true,
      postId: true,
      post: { select: { authorId: true } },
    },
  });
  if (!comment) throw new ApiError(404, "Comment not found.", "not_found");

  const canDelete =
    auth.user.id === comment.authorId ||
    auth.user.id === comment.post.authorId ||
    ADMIN_ROLES.includes(auth.user.role);

  if (!canDelete) {
    throw new ApiError(403, "You cannot delete this comment.", "forbidden");
  }

  await db.$transaction([
    db.comment.delete({ where: { id } }),
    db.post.update({
      where: { id: comment.postId },
      data: { commentCount: { decrement: 1 } },
    }),
  ]);

  if (auth.user.id !== comment.authorId) {
    await writeAudit(auth.user.id, "comment.delete", id, { postId: comment.postId });
  }

  return ok({ deleted: true });
});
