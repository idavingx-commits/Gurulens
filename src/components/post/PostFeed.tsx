"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { PostCard } from "@/components/post/PostCard";
import { Icon } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/primitives";
import { Spinner } from "@/components/ui/interactive";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/client";
import type { PostView } from "@/lib/data";

export function PostFeed({
  initialPosts,
  initialCursor,
  scope,
  emptyTitle = "No posts here yet",
  emptyDescription = "Follow a few teachers or explore new ones to fill your feed.",
}: {
  initialPosts: PostView[];
  initialCursor: string | null;
  scope: "latest" | "following";
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const [posts, setPosts] = useState<PostView[]>(initialPosts);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const loadMore = useCallback(async () => {
    if (loading || !cursor) return;
    setLoading(true);
    try {
      const data = await apiFetch<{ posts: PostView[]; nextCursor: string | null }>(
        `/api/posts?scope=${scope}&limit=12&before=${encodeURIComponent(cursor)}`,
      );
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...data.posts.filter((p) => !seen.has(p.id))];
      });
      setCursor(data.nextCursor);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load more posts.");
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, scope, toast]);

  if (posts.length === 0) {
    return (
      <EmptyState
        icon="compass"
        title={emptyTitle}
        description={emptyDescription}
        action={
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 rounded-chip bg-brand-500 px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-brand-600"
          >
            <Icon name="users" size={14} />
            Explore teachers
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}

      <div className="flex justify-center pt-1 pb-4">
        {cursor ? (
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-ink-200 bg-white/70 px-5 text-[13px] font-bold text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-700 disabled:opacity-60"
          >
            {loading ? <Spinner size={14} /> : <Icon name="chevron-down" size={14} />}
            {loading ? "Loading…" : "Load more"}
          </button>
        ) : (
          <p className="text-[12px] font-semibold text-ink-300">You&apos;re all caught up 🎉</p>
        )}
      </div>
    </div>
  );
}
