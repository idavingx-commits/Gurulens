import type { Metadata } from "next";

import {
  NotificationsList,
  type NotificationItemJson,
} from "@/components/layout/NotificationsList";
import { Icon } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/primitives";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const items: NotificationItemJson[] = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-8 pb-6 sm:px-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white">
          <Icon name="bell" size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Notifications</h1>
          <p className="text-[13px] text-ink-500">Replies, reviews, quiz results and more.</p>
        </div>
      </div>

      {items.length > 0 ? (
        <NotificationsList items={items} />
      ) : (
        <EmptyState
          icon="bell"
          title="No notifications yet"
          description="When teachers reply to your reviews or post new lessons you follow, it will show up here."
        />
      )}
    </div>
  );
}
