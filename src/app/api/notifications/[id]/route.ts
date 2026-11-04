import { type NextRequest } from "next/server";

import { ApiError, ok, requireAuth, route } from "@/lib/api";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route(async (req: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(req);
  const { id } = await ctx.params;

  const notification = await db.notification.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  if (!notification || notification.userId !== auth.user.id) {
    throw new ApiError(404, "Notification not found.", "not_found");
  }

  await db.notification.update({ where: { id }, data: { readAt: new Date() } });
  return ok({ read: true });
});
