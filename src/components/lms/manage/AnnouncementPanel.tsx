"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/interactive";
import { ClientApiError, apiFetch } from "@/lib/client";
import { cn } from "@/lib/format";

type Announcement = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  authorName: string | null;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function AnnouncementPanel({
  workspaceId,
  announcements,
}: {
  workspaceId: string;
  announcements: Announcement[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(announcements);
  const [open, setOpen] = useState(announcements.length === 0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<{ announcement: Announcement }>(
        `/api/lms/workspaces/${workspaceId}/announcements`,
        { method: "POST", body: { title: title.trim(), body: body.trim(), pinned } },
      );
      setItems((current) => [
        { ...result.announcement, createdAt: result.announcement.createdAt },
        ...current,
      ]);
      setTitle("");
      setBody("");
      setPinned(false);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not publish that update.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: Announcement) {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/lms/announcements/${item.id}`, { method: "DELETE" });
      setItems((current) => current.filter((row) => row.id !== item.id));
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not delete that update.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12.5px] text-ink-500">
          {items.length
            ? `${items.length} update${items.length === 1 ? "" : "s"} published.`
            : "No announcements yet."}
        </p>
        <Button
          variant={open ? "ghost" : "outline"}
          size="sm"
          onClick={() => setOpen((value) => !value)}
        >
          <Icon name={open ? "x" : "plus"} size={13} /> {open ? "Cancel" : "New announcement"}
        </Button>
      </div>

      {open ? (
        <form onSubmit={publish} className="card space-y-4 border-brand-100 p-5">
          <Field label="Title" htmlFor="ann-title">
            <Input
              id="ann-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Mid-term test schedule"
              maxLength={140}
              required
            />
          </Field>
          <Field label="Message" htmlFor="ann-body">
            <Textarea
              id="ann-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Share a schedule change, new resource or important notice."
              maxLength={4000}
              required
            />
          </Field>
          <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-semibold text-ink-700">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(event) => setPinned(event.target.checked)}
              className="size-4 rounded border-ink-300 accent-brand-600"
            />
            Pin to the top of the hub
          </label>
          {error ? (
            <p className="text-[12.5px] font-semibold text-danger-600">{error}</p>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={busy || !title.trim() || !body.trim()}>
              {busy ? <Spinner size={14} /> : <Icon name="send" size={14} />} Publish
            </Button>
          </div>
        </form>
      ) : null}

      {items.length === 0 && !open ? (
        <EmptyState
          icon="bell"
          title="No announcements yet"
          description="Post an update and it appears at the top of your hub for every learner."
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="card p-4">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex size-9 flex-none items-center justify-center rounded-xl",
                    item.pinned ? "bg-warn-100 text-warn-600" : "bg-brand-50 text-brand-600",
                  )}
                >
                  <Icon name={item.pinned ? "pin" : "bell"} size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[13.5px] font-extrabold text-ink-900">{item.title}</h3>
                    {item.pinned ? (
                      <Badge tone="warn" icon="pin">
                        Pinned
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-ink-500">
                    {item.body}
                  </p>
                  <p className="mt-2 text-[11px] font-semibold text-ink-400">
                    {item.authorName ?? "Hub team"} · {timeAgo(item.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(item)}
                  disabled={busy}
                  className="flex-none rounded-full p-1.5 text-ink-300 transition-colors hover:bg-danger-50 hover:text-danger-600 disabled:opacity-50"
                  title="Delete announcement"
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
