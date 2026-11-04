"use client";

import { useState, useTransition } from "react";

import { Icon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/client";
import { cn } from "@/lib/format";

export function PostActions({
  postId,
  likeCount,
  commentCount,
  liked,
  saved,
  className,
}: {
  postId: string;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  saved: boolean;
  className?: string;
}) {
  const [likedState, setLikedState] = useState(liked);
  const [savedState, setSavedState] = useState(saved);
  const [likes, setLikes] = useState(likeCount);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function toggleLike() {
    if (pending) return;
    const next = !likedState;
    setLikedState(next);
    setLikes((n) => n + (next ? 1 : -1));
    startTransition(async () => {
      try {
        const res = await apiFetch<{ liked: boolean; likeCount: number }>(
          `/api/posts/${postId}/like`,
          { method: next ? "POST" : "DELETE" },
        );
        setLikedState(res.liked);
        setLikes(res.likeCount);
      } catch (err) {
        setLikedState(!next);
        setLikes((n) => n + (next ? -1 : 1));
        toast.error(err instanceof Error ? err.message : "Could not update reaction.");
      }
    });
  }

  function toggleSave() {
    if (pending) return;
    const next = !savedState;
    setSavedState(next);
    startTransition(async () => {
      try {
        const res = await apiFetch<{ saved: boolean }>(`/api/posts/${postId}/save`, {
          method: next ? "POST" : "DELETE",
        });
        setSavedState(res.saved);
        toast.success(res.saved ? "Saved to your collection." : "Removed from saved.");
      } catch (err) {
        setSavedState(!next);
        toast.error(err instanceof Error ? err.message : "Could not update saved posts.");
      }
    });
  }

  async function share() {
    const url = `${window.location.origin}/post/${postId}`;
    try {
      if (navigator.share) {
        await navigator.share({ url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard.");
      }
    } catch {
      // user cancelled
    }
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <ActionButton
        icon="heart"
        label={likes > 0 ? String(likes) : "Like"}
        active={likedState}
        activeClass="text-danger-600"
        onClick={toggleLike}
        title={likedState ? "Remove like" : "Like"}
      />
      <ActionButton
        icon="message"
        label={commentCount > 0 ? String(commentCount) : "Comment"}
        href={`/post/${postId}`}
        title="Comments"
      />
      <ActionButton
        icon="bookmark"
        label="Save"
        active={savedState}
        activeClass="text-brand-600"
        onClick={toggleSave}
        title={savedState ? "Remove from saved" : "Save"}
      />
      <ActionButton icon="share" label="Share" onClick={share} title="Share" />
    </div>
  );
}

function ActionButton({
  icon,
  label,
  active = false,
  activeClass = "text-brand-600",
  onClick,
  href,
  title,
}: {
  icon: string;
  label: string;
  active?: boolean;
  activeClass?: string;
  onClick?: () => void;
  href?: string;
  title?: string;
}) {
  const cls = cn(
    "inline-flex items-center gap-1.5 rounded-chip px-2.5 py-1.5 text-[12px] font-bold text-ink-400 transition-colors hover:bg-ink-100/70 hover:text-ink-700",
    active && activeClass,
  );

  if (href) {
    return (
      <a href={href} className={cls} title={title}>
        <Icon name={icon} size={16} strokeWidth={active ? 2.6 : 1.9} />
        <span className="tabular-nums">{label}</span>
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={cls} title={title}>
      <Icon name={icon} size={16} strokeWidth={active ? 2.6 : 1.9} />
      <span className="tabular-nums">{label}</span>
    </button>
  );
}
