import { type NextRequest } from "next/server";

import { ok, parseBody, requireAuth, route } from "@/lib/api";
import { db } from "@/lib/db";
import { notificationActionSchema } from "@/lib/validation";

export const GET = route(async (req: NextRequest) => {
  const auth = await requireAuth(req);

  const [notifications, unread] = await Promise.all([
    db.notification.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.notification.count({ where: { userId: auth.user.id, readAt: null } }),
  ]);

  return ok({ notifications, unread });
});

export const POST = route(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  await parseBody(req, notificationActionSchema);

  const result = await db.notification.updateMany({
    where: { userId: auth.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  return ok({ updated: result.count });
});
