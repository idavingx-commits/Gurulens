"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/interactive";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/client";
import { cn, timeAgo } from "@/lib/format";

export type NotificationItemJson = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

const ICONS: Record<string, string> = {
  review: "star",
  review_reply: "message",
  quiz_attempt: "target",
  eligibility: "shield-check",
  welcome: "sparkles",
  follow: "users",
  comment: "message",
  like: "heart",
  moderation: "shield",
};

const TONES: Record<string, string> = {
  review: "bg-warn-100 text-warn-600",
  review_reply: "bg-brand-50 text-brand-700",
  quiz_attempt: "bg-accent-100 text-accent-700",
  eligibility: "bg-success-100 text-success-600",
  welcome: "bg-brand-50 text-brand-700",
  follow: "bg-ink-100 text-ink-600",
  moderation: "bg-danger-100 text-danger-600",
};

export function NotificationsList({ items }: { items: NotificationItemJson[] }) {
  const router = useRouter();
  const toast = useToast();
  const [marking, setMarking] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const unread = items.filter((n) => !n.readAt && !readIds.has(n.id)).length;

  function markRead(id: string) {
    if (readIds.has(id)) return;
    setReadIds((prev) => new Set(prev).add(id));
    void apiFetch(`/api/notifications/${id}`, { method: "PATCH" }).catch(() => undefined);
  }

  async function markAll() {
    if (marking) return;
    setMarking(true);
    try {
      const res = await apiFetch<{ updated: number }>("/api/notifications", {
        method: "POST",
        body: { action: "read_all" },
      });
      setReadIds(new Set(items.map((n) => n.id)));
      toast.success(res.updated > 0 ? `Marked ${res.updated} as read.` : "Nothing new to read.");
      router.refresh();
    } catch {
      toast.error("Could not update notifications.");
    } finally {
      setMarking(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[13px] font-semibold text-ink-500">
          {unread > 0 ? `${unread} unread` : "You're all caught up"}
        </p>
        <Button variant="outline" size="sm" onClick={markAll} disabled={marking || unread === 0}>
          {marking ? <Spinner size={14} /> : <Icon name="check" size={14} />}
          Mark all as read
        </Button>
      </div>

      <div className="space-y-2.5">
        {items.map((n) => {
          const isUnread = !n.readAt && !readIds.has(n.id);
          const icon = ICONS[n.type] ?? "bell";
          const tone = TONES[n.type] ?? "bg-ink-100 text-ink-600";

          const inner = (
            <div
              className={cn(
                "card flex items-start gap-3.5 p-4 transition-all",
                n.link && "hover:-translate-y-0.5 hover:shadow-lift",
                isUnread && "border-brand-200/80 bg-brand-50/40",
              )}
            >
              <span
                className={cn(
                  "flex size-10 flex-none items-center justify-center rounded-2xl",
                  tone,
                )}
              >
                <Icon name={icon} size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13.5px] leading-snug font-bold text-ink-900">{n.title}</p>
                  <span className="flex-none text-[11.5px] font-semibold text-ink-400">
                    {timeAgo(n.createdAt)}
                  </span>
                </div>
                {n.body ? (
                  <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-relaxed text-ink-500">
                    {n.body}
                  </p>
                ) : null}
              </div>
              {isUnread ? (
                <span className="mt-1.5 size-2 flex-none rounded-full bg-brand-500" />
              ) : null}
            </div>
          );

          return n.link ? (
            <Link
              key={n.id}
              href={n.link}
              onClick={() => markRead(n.id)}
              className="block"
            >
              {inner}
            </Link>
          ) : (
            <button
              key={n.id}
              type="button"
              onClick={() => markRead(n.id)}
              className="block w-full text-left"
            >
              {inner}
            </button>
          );
        })}
      </div>
    </div>
  );
}
