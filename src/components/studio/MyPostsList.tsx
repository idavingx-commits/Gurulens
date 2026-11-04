"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/ui/icons";
import { ConfirmDialog } from "@/components/ui/interactive";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError } from "@/lib/client";
import { compactNumber, timeAgo } from "@/lib/format";

export type MyPost = {
  id: string;
  type: string;
  title: string | null;
  text: string;
  publishedAt: string;
  visibility: string;
  likeCount: number;
  commentCount: number;
  viewCount: number;
};

const TYPE_ICON: Record<string, string> = {
  post: "pencil",
  announcement: "bell",
  lesson: "book",
  reel: "film",
  video: "video",
};

export function MyPostsList({ posts }: { posts: MyPost[] }) {
  const router = useRouter();
  const toast = useToast();
  const [deleting, setDeleting] = useState<MyPost | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiFetch(`/api/posts/${deleting.id}`, { method: "DELETE" });
      toast.success("Post deleted.");
      setDeleting(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Could not delete the post.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="space-y-2.5">
        {posts.map((p) => (
          <div key={p.id} className="card flex items-center gap-3 p-3.5">
            <span className="flex size-10 flex-none items-center justify-center rounded-2xl bg-ink-100 text-ink-600">
              <Icon name={TYPE_ICON[p.type] ?? "pencil"} size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <Link
                href={`/post/${p.id}`}
                className="line-clamp-1 text-[13.5px] font-bold text-ink-900 hover:text-brand-700"
              >
                {p.title ?? p.text.slice(0, 80)}
              </Link>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] font-semibold text-ink-400">
                <span className="capitalize">{p.type}</span>
                <span>{timeAgo(p.publishedAt)}</span>
                <span className="inline-flex items-center gap-1">
                  <Icon name="heart" size={11} /> {compactNumber(p.likeCount)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Icon name="message" size={11} /> {compactNumber(p.commentCount)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Icon name="eye" size={11} /> {compactNumber(p.viewCount)}
                </span>
                {p.visibility === "members" ? (
                  <span className="inline-flex items-center gap-1 rounded-chip bg-accent-100 px-2 py-0.5 text-[10.5px] font-bold text-accent-700">
                    <Icon name="crown" size={10} /> Supporters
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex flex-none items-center gap-1.5">
              <Link
                href={`/post/${p.id}`}
                aria-label="View post"
                className="flex size-8 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
              >
                <Icon name="external" size={15} />
              </Link>
              <button
                type="button"
                aria-label="Delete post"
                onClick={() => setDeleting(p)}
                className="flex size-8 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-danger-100 hover:text-danger-600"
              >
                <Icon name="trash" size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this post?"
        description="This removes the post, its comments and reactions. This cannot be undone."
        confirmLabel="Delete post"
        pending={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
