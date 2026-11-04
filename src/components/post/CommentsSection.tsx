"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { ReportButton } from "@/components/moderation/ReportButton";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/interactive";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/client";
import { cn, timeAgo } from "@/lib/format";

export type CommentJson = {
  id: string;
  text: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatarId: string | null;
    role: string;
  };
};

type Viewer = { id: string; name: string; avatarId: string | null; role: string } | null;

export function CommentsSection({
  postId,
  postAuthorId,
  viewer,
  initialComments,
}: {
  postId: string;
  postAuthorId: string;
  viewer: Viewer;
  initialComments: CommentJson[];
}) {
  const [comments, setComments] = useState<CommentJson[]>(initialComments);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const toast = useToast();

  const canModerate =
    viewer !== null && (viewer.id === postAuthorId || viewer.role === "admin" || viewer.role === "moderator");

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = text.trim();
      if (!trimmed || submitting) return;
      setSubmitting(true);
      try {
        const data = await apiFetch<{ comment: CommentJson }>(`/api/posts/${postId}/comments`, {
          method: "POST",
          body: { text: trimmed },
        });
        setComments((prev) => [...prev, data.comment]);
        setText("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not post your comment.");
      } finally {
        setSubmitting(false);
      }
    },
    [postId, submitting, text, toast],
  );

  const remove = useCallback(
    async (id: string) => {
      if (deletingId) return;
      setDeletingId(id);
      try {
        await apiFetch(`/api/comments/${id}`, { method: "DELETE" });
        setComments((prev) => prev.filter((c) => c.id !== id));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not delete the comment.");
      } finally {
        setDeletingId(null);
      }
    },
    [deletingId, toast],
  );

  return (
    <section className="card p-5 sm:p-6" aria-label="Comments">
      <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-ink-900">
        <Icon name="message" size={16} className="text-brand-600" />
        Comments
        {comments.length > 0 ? (
          <span className="text-[13px] font-bold text-ink-300">{comments.length}</span>
        ) : null}
      </h2>

      {viewer ? (
        <form onSubmit={submit} className="mt-4 flex items-start gap-3">
          <Avatar
            name={viewer.name}
            src={viewer.avatarId ? `/api/media/${viewer.avatarId}` : null}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="Write a supportive comment…"
              className="w-full resize-y rounded-2xl border border-ink-200 bg-white/80 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 transition-colors focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-100 focus:outline-none"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-ink-300">{text.length}/1000</span>
              <button
                type="submit"
                disabled={submitting || text.trim().length === 0}
                className="inline-flex h-9 items-center gap-2 rounded-full bg-gradient-to-b from-brand-500 to-brand-600 px-4 text-[13px] font-bold text-white transition-all hover:brightness-105 disabled:opacity-50"
              >
                {submitting ? <Spinner size={13} /> : <Icon name="send" size={13} />}
                Comment
              </button>
            </div>
          </div>
        </form>
      ) : (
        <p className="mt-3 rounded-2xl bg-ink-100/70 p-3.5 text-[13px] text-ink-500">
          <Link href="/login" className="font-bold text-brand-600 hover:underline">
            Log in
          </Link>{" "}
          to join the discussion.
        </p>
      )}

      <div className="mt-5 space-y-4">
        {comments.length === 0 ? (
          <p className="text-center text-[13px] text-ink-300">
            No comments yet — be the first to encourage.
          </p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex items-start gap-3">
              <Avatar
                name={c.author.name}
                src={c.author.avatarId ? `/api/media/${c.author.avatarId}` : null}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-[13px] font-bold text-ink-900">{c.author.name}</span>
                  <span
                    className={cn(
                      "rounded-chip px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase",
                      c.author.role === "teacher"
                        ? "bg-brand-50 text-brand-700"
                        : "bg-ink-100 text-ink-500",
                    )}
                  >
                    {c.author.role}
                  </span>
                  <span className="text-[11.5px] text-ink-400">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="mt-1 whitespace-pre-line text-[13.5px] leading-relaxed text-ink-700">
                  {c.text}
                </p>
              </div>
              {viewer && (c.author.id === viewer.id || canModerate) ? (
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  disabled={deletingId === c.id}
                  className="flex-none rounded-full p-1.5 text-ink-300 transition-colors hover:bg-danger-100/60 hover:text-danger-600 disabled:opacity-50"
                  aria-label="Delete comment"
                  title="Delete comment"
                >
                  {deletingId === c.id ? <Spinner size={13} /> : <Icon name="trash" size={14} />}
                </button>
              ) : viewer && c.author.id !== viewer.id ? (
                <ReportButton targetType="comment" targetId={c.id} compact />
              ) : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
