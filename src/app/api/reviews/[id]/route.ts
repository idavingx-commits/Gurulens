import { type NextRequest } from "next/server";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { reviewSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route(async (req: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(req);
  const { id } = await ctx.params;

  const review = await db.review.findUnique({
    where: { id },
    select: { id: true, authorId: true, status: true },
  });
  if (!review || review.status !== "published") {
    throw new ApiError(404, "Review not found.", "not_found");
  }
  if (review.authorId !== auth.user.id && auth.user.role !== "admin") {
    throw new ApiError(403, "You can only edit your own review.", "forbidden");
  }

  const body = await parseBody(req, reviewSchema.omit({ teacherId: true }));

  await db.review.update({
    where: { id },
    data: {
      stars: body.stars,
      clarity: body.clarity ?? null,
      support: body.support ?? null,
      organization: body.organization ?? null,
      feedback: body.feedback,
    },
  });

  await writeAudit(auth.user.id, "review.edit", id, { stars: body.stars });
  return ok({ updated: true });
});

export const DELETE = route(async (req: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(req);
  const { id } = await ctx.params;

  const review = await db.review.findUnique({
    where: { id },
    select: { id: true, authorId: true },
  });
  if (!review) throw new ApiError(404, "Review not found.", "not_found");
  if (review.authorId !== auth.user.id && auth.user.role !== "admin") {
    throw new ApiError(403, "You can only delete your own review.", "forbidden");
  }

  await db.review.update({ where: { id }, data: { status: "removed" } });
  await writeAudit(auth.user.id, "review.remove", id);
  return ok({ deleted: true });
});
