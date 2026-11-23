"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/interactive";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError } from "@/lib/client";
import { cn, timeAgo } from "@/lib/format";

export type ReelViewerUser = {
  id: string;
  name: string;
  avatarId: string | null;
  role: string;
};

type CommentJson = {
  id: string;
  text: string;
  createdAt: string;
  author: { id: string; name: string; avatarId: string | null; role: string };
};

const ROLE_CHIP: Record<string, string> = {
  teacher: "bg-brand-500/20 text-brand-300",
  moderator: "bg-accent-500/20 text-accent-300",
  admin: "bg-white/15 text-white",
};

/**
 * TikTok-style comment popup for reels.
 * Mobile: bottom sheet. Desktop: right-hand panel. Portaled to <body> so it
 * sits above the reel overlay (z-50) and the back button (z-60), but below
 * modals (z-80) and toasts (z-90).
 */
export function ReelCommentsSheet({
  postId,
  postAuthorId,
  initialCount,
  viewer,
  onClose,
  onCountChange,
}: {
  postId: string;
  postAuthorId: string;
  initialCount: number;
  viewer: ReelViewerUser | null;
  onClose: () => void;
  onCountChange: (count: number) => void;
}) {
  const toast = useToast();
  const [comments, setComments] = useState<CommentJson[] | null>(null);
  const [count, setCount] = useState(initialCount);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateCount = useCallback(
    (next: number) => {
      const safe = Math.max(0, next);
      setCount(safe);
      onCountChange(safe);
    },
    [onCountChange],
  );

  // Load comments on open (and on retry).
  useEffect(() => {
    let cancelled = false;
    apiFetch<{ comments: CommentJson[] }>(`/api/posts/${postId}/comments`)
      .then((data) => {
        if (cancelled) return;
        setComments(data.comments);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setComments([]);
        setError(err instanceof ClientApiError ? err.message : "Could not load comments.");
      });
    return () => {
      cancelled = true;
    };
  }, [postId, reloadKey]);

  // Escape closes; focus the composer for signed-in viewers.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    if (viewer) inputRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, viewer]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending || !viewer) return;
    setSending(true);
    try {
      const data = await apiFetch<{ comment: CommentJson }>(`/api/posts/${postId}/comments`, {
        method: "POST",
        body: { text: trimmed },
      });
      setComments((prev) => [...(prev ?? []), data.comment]);
      updateCount(count + 1);
      setText("");
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      });
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Could not post the comment.");
    } finally {
      setSending(false);
    }
  }

  async function remove(comment: CommentJson) {
    try {
      await apiFetch(`/api/comments/${comment.id}`, { method: "DELETE" });
      setComments((prev) => (prev ?? []).filter((c) => c.id !== comment.id));
      updateCount(count - 1);
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Could not delete the comment.");
    }
  }

  const canDelete = (comment: CommentJson) =>
    viewer !== null &&
    (viewer.id === comment.author.id ||
      viewer.id === postAuthorId ||
      viewer.role === "admin" ||
      viewer.role === "moderator");

  return createPortal(
    <div className="fixed inset-0 z-[75]" role="dialog" aria-modal="true" aria-label="Comments">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close comments"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
      />

      {/* Panel: bottom sheet on mobile, right rail on desktop */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 flex h-[68dvh] flex-col overflow-hidden rounded-t-2xl bg-[#161823] text-white shadow-2xl",
          "sm:inset-x-auto sm:top-0 sm:right-0 sm:h-full sm:w-[400px] sm:rounded-none sm:border-l sm:border-white/10",
        )}
      >
        {/* Header */}
        <div className="relative flex flex-none items-center justify-center border-b border-white/10 px-4 py-3">
          <span
            aria-hidden="true"
            className="absolute top-1.5 left-1/2 h-1 w-9 -translate-x-1/2 rounded-full bg-white/20 sm:hidden"
          />
          <p className="text-[13px] font-bold">
            {count} comment{count === 1 ? "" : "s"}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close comments"
            className="absolute right-2.5 flex size-8 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 [-webkit-overflow-scrolling:touch]"
        >
          {comments === null ? (
            <div className="flex h-full items-center justify-center">
              <Spinner size={22} className="text-white/60" />
            </div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <Icon name="alert" size={26} className="text-white/40" />
              <p className="text-[12.5px] text-white/60">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setComments(null);
                  setReloadKey((k) => k + 1);
                }}
                className="rounded-full bg-white/10 px-4 py-1.5 text-[12px] font-bold hover:bg-white/20"
              >
                Try again
              </button>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <Icon name="message" size={30} className="text-white/25" />
              <p className="text-[13px] font-bold text-white/70">No comments yet</p>
              <p className="text-[12px] text-white/45">Be the first to share your thoughts.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {comments.map((comment) => (
                <li key={comment.id} className="group flex items-start gap-2.5">
                  <Avatar
                    name={comment.author.name}
                    src={comment.author.avatarId ? `/api/media/${comment.author.avatarId}` : null}
                    size="sm"
                    className="flex-none"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-[11.5px] font-semibold text-white/50">
                      <span className="font-bold text-white/80">{comment.author.name}</span>
                      {ROLE_CHIP[comment.author.role] ? (
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase",
                            ROLE_CHIP[comment.author.role],
                          )}
                        >
                          {comment.author.role}
                        </span>
                      ) : null}
                      <span>· {timeAgo(comment.createdAt)}</span>
                    </p>
                    <p className="mt-0.5 text-[13px] leading-relaxed break-words whitespace-pre-line text-white/90">
                      {comment.text}
                    </p>
                  </div>
                  {canDelete(comment) ? (
                    <button
                      type="button"
                      onClick={() => void remove(comment)}
                      aria-label="Delete comment"
                      className="flex size-7 flex-none items-center justify-center rounded-full text-white/30 transition-colors hover:bg-white/10 hover:text-danger-500"
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Composer */}
        <div
          className="flex-none border-t border-white/10 bg-[#1c1f2e] p-3"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
        >
          {viewer ? (
            <form onSubmit={submit} className="flex items-center gap-2">
              <Avatar
                name={viewer.name}
                src={viewer.avatarId ? `/api/media/${viewer.avatarId}` : null}
                size="sm"
                className="flex-none"
              />
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={1000}
                placeholder="Add a comment…"
                aria-label="Add a comment"
                className="h-10 min-w-0 flex-1 rounded-full bg-white/10 px-4 text-[13px] text-white placeholder:text-white/40 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
              <button
                type="submit"
                disabled={sending || !text.trim()}
                aria-label="Post comment"
                className="flex size-10 flex-none items-center justify-center rounded-full bg-brand-500 text-white transition-all hover:bg-brand-600 disabled:opacity-40"
              >
                {sending ? <Spinner size={16} /> : <Icon name="send" size={17} />}
              </button>
            </form>
          ) : (
            <Link
              href={`/login?redirect=/reels`}
              className="flex h-10 items-center justify-center gap-2 rounded-full bg-white/10 text-[13px] font-bold text-white/80 transition-colors hover:bg-white/20"
            >
              <Icon name="user" size={15} /> Sign in to comment
            </Link>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
