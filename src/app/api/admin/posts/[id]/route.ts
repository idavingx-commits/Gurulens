/**
 * Main-admin permanent content deletion.
 * Moderators keep the softer remove/restore flow at /api/admin/moderation;
 * this endpoint hard-deletes a post (comments, reactions and saves cascade).
 */

import { type NextRequest } from "next/server";

import { ApiError, ok, requireAuth, route } from "@/lib/api";
import { notify, writeAudit, writeModerationAction } from "@/lib/audit";
import { SUPER_ADMIN_ROLES } from "@/lib/constants";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = route<Ctx>(async (req: NextRequest, ctx) => {
  const auth = await requireAuth(req, SUPER_ADMIN_ROLES);
  const { id } = await ctx.params;
  const reason = new URL(req.url).searchParams.get("reason")?.slice(0, 300) ?? null;

  const post = await db.post.findUnique({
    where: { id },
    select: { id: true, authorId: true, type: true },
  });
  if (!post) throw new ApiError(404, "Post not found.", "not_found");

  await db.post.delete({ where: { id } });

  await writeModerationAction(auth.user.id, "post", id, "delete", reason);
  await writeAudit(auth.user.id, "post.delete", id, {
    authorId: post.authorId,
    type: post.type,
    reason,
  });
  await notify(
    post.authorId,
    "moderation",
    "Your post was deleted",
    reason || "A GuruLens admin permanently removed this post for breaking community guidelines.",
    "/guidelines",
  );

  return ok({ deleted: true });
});
