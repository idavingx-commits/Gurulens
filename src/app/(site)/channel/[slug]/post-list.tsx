"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icons";
import { Badge } from "@/components/ui/primitives";
import { apiFetch } from "@/lib/client";
import { cn, timeAgo } from "@/lib/format";

export type PostPollOption = {
  label: string;
  count: number;
  chosen: boolean;
};

export type PostPoll = {
  id: string;
  question: string;
  allowMultiple: boolean;
  endsAt: string | null;
  ended: boolean;
  options: PostPollOption[];
  totalVotes: number;
};

export type PostItem = {
  id: string;
  type: string;
  content: string | null;
  isPinned: boolean;
  isUrgent: boolean;
  publishedAt: string | null;
  reactionCount: number;
  likedByMe: boolean;
  author: { id: string; name: string; avatarKey: string | null };
  voiceMessage: { audioKey: string; durationSec: number } | null;
  poll: PostPoll | null;
};

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function PostCard({
  post,
  isOwner,
  channelSlug,
  signedIn,
}: {
  post: PostItem;
  isOwner: boolean;
  channelSlug: string;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(post.likedByMe);
  const [likes, setLikes] = useState(post.reactionCount);
  const [poll, setPoll] = useState(post.poll);
  const [voting, setVoting] = useState(false);
  const [reacting, setReacting] = useState(false);

  async function handleLike() {
    if (!signedIn) {
      router.push(`/login?redirect=/channel/${channelSlug}`);
      return;
    }
    if (reacting) return;

    const prevLiked = liked;
    const prevLikes = likes;
    const nextLiked = !prevLiked;

    setLiked(nextLiked);
    setLikes((n) => Math.max(0, n + (nextLiked ? 1 : -1)));
    setReacting(true);

    try {
      const data = await apiFetch<{ liked: boolean; count: number }>(
        `/api/channels/${channelSlug}/posts/${post.id}/react`,
        { method: "POST", body: { type: "like" } },
      );
      setLiked(data.liked);
      setLikes(data.count);
    } catch {
      setLiked(prevLiked);
      setLikes(prevLikes);
    } finally {
      setReacting(false);
    }
  }

  async function vote(index: number) {
    if (!poll || voting) return;
    if (!signedIn) {
      router.push(`/login?redirect=/channel/${channelSlug}`);
      return;
    }
    if (poll.ended) return;

    const chosen = poll.options.flatMap((opt, i) => (opt.chosen ? [i] : []));
    let nextIndexes: number[];
    if (poll.allowMultiple) {
      nextIndexes = chosen.includes(index)
        ? chosen.filter((i) => i !== index)
        : [...chosen, index];
    } else {
      nextIndexes = [index];
    }
    if (nextIndexes.length === 0) return;

    const previous = poll;
    const options = poll.options.map((opt, i) => {
      const isChosen = nextIndexes.includes(i);
      let count = opt.count;
      if (opt.chosen && !isChosen) count = Math.max(0, count - 1);
      if (!opt.chosen && isChosen) count += 1;
      return { ...opt, chosen: isChosen, count };
    });

    setPoll({
      ...poll,
      options,
      totalVotes: poll.totalVotes + (chosen.length > 0 ? 0 : 1),
    });
    setVoting(true);
    try {
      await apiFetch(`/api/channels/${channelSlug}/posts/${post.id}/vote`, {
        method: "POST",
        body: { optionIndexes: nextIndexes },
      });
      router.refresh();
    } catch {
      setPoll(previous);
    } finally {
      setVoting(false);
    }
  }

  const ended = poll?.ended ?? false;
  const totalOptionVotes = poll?.options.reduce((sum, o) => sum + o.count, 0) ?? 0;

  return (
    <div className={cn("card p-4", post.isPinned && "ring-1 ring-brand-200")}>
      <div className="flex items-start gap-3">
        <Avatar
          name={post.author.name}
          src={post.author.avatarKey ? `/api/media/${post.author.avatarKey}` : null}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13.5px] font-bold text-ink-900">{post.author.name}</span>
            {post.isPinned ? (
              <Badge tone="brand" icon="pin">
                Pinned
              </Badge>
            ) : null}
            {post.isUrgent ? (
              <Badge tone="danger" icon="alert">
                Urgent
              </Badge>
            ) : null}
          </div>
          <p className="text-[11.5px] font-semibold text-ink-400">
            {post.publishedAt ? timeAgo(post.publishedAt) : "Draft"}
          </p>
        </div>
        {isOwner ? (
          <span className="flex-none rounded-full bg-ink-50 p-1.5 text-ink-400">
            <Icon name="pencil" size={13} />
          </span>
        ) : null}
      </div>

      {post.content ? (
        <p className="mt-3 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-700">
          {post.content}
        </p>
      ) : null}

      {post.voiceMessage ? (
        <div className="mt-3 flex items-center gap-2.5 rounded-2xl border border-ink-100 bg-ink-50/60 p-2.5">
          <span className="flex size-8 flex-none items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <Icon name="volume" size={15} />
          </span>
          <audio
            controls
            preload="metadata"
            src={`/api/media/${post.voiceMessage.audioKey}`}
            className="h-8 w-full"
          />
          <span className="flex-none text-[11.5px] font-bold text-ink-400">
            {formatDuration(post.voiceMessage.durationSec)}
          </span>
        </div>
      ) : null}

      {poll ? (
        <div className="mt-3 rounded-2xl border border-ink-100 bg-ink-50/50 p-3.5">
          <p className="text-[13px] font-bold text-ink-900">{poll.question}</p>
          <div className="mt-2.5 space-y-1.5">
            {poll.options.map((option, index) => {
              const pct =
                totalOptionVotes > 0 ? Math.round((option.count / totalOptionVotes) * 100) : 0;
              return (
                <button
                  key={`${poll.id}-${index}`}
                  type="button"
                  onClick={() => vote(index)}
                  disabled={voting || ended}
                  aria-pressed={option.chosen}
                  className={cn(
                    "relative flex w-full items-center gap-2 overflow-hidden rounded-xl border px-3 py-2 text-left text-[12.5px] font-semibold transition-colors disabled:cursor-default",
                    option.chosen
                      ? "border-brand-300 bg-white text-brand-800"
                      : "border-ink-200 bg-white/70 text-ink-700 hover:border-brand-300",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-y-0 left-0 -z-0 transition-all",
                      option.chosen ? "bg-brand-100/80" : "bg-ink-100/70",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                  <span className="relative flex size-4 flex-none items-center justify-center">
                    {option.chosen ? (
                      <Icon name="check" size={12} strokeWidth={3} className="text-brand-600" />
                    ) : null}
                  </span>
                  <span className="relative min-w-0 flex-1 truncate">{option.label}</span>
                  <span className="relative flex-none text-[11.5px] font-bold text-ink-500">
                    {pct}%
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] font-semibold text-ink-400">
            {poll.totalVotes} vote{poll.totalVotes === 1 ? "" : "s"}
            {poll.allowMultiple ? " · multiple choice" : ""}
            {ended ? " · ended" : ""}
          </p>
        </div>
      ) : null}

      <div className="mt-3.5 flex items-center gap-4 border-t border-ink-100 pt-3">
        <button
          type="button"
          onClick={handleLike}
          aria-pressed={liked}
          className={cn(
            "flex items-center gap-1.5 text-[12.5px] font-bold transition-colors",
            liked ? "text-danger-500" : "text-ink-400 hover:text-danger-500",
          )}
        >
          <Icon name="heart" size={15} className={liked ? "fill-current" : ""} />
          {likes}
        </button>
        <Link
          href={`/channel/${channelSlug}`}
          className="flex items-center gap-1.5 text-[12.5px] font-bold text-ink-400 hover:text-ink-600"
        >
          <Icon name="message" size={15} /> Reply
        </Link>
        <button
          type="button"
          onClick={() => {
            if (typeof navigator !== "undefined" && navigator.clipboard) {
              void navigator.clipboard.writeText(window.location.href);
            }
          }}
          className="flex items-center gap-1.5 text-[12.5px] font-bold text-ink-400 hover:text-ink-600"
        >
          <Icon name="share" size={15} /> Share
        </button>
      </div>
    </div>
  );
}

export function PostList({
  posts,
  isOwner,
  channelSlug,
  signedIn,
}: {
  posts: PostItem[];
  isOwner: boolean;
  channelSlug: string;
  signedIn: boolean;
}) {
  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          isOwner={isOwner}
          channelSlug={channelSlug}
          signedIn={signedIn}
        />
      ))}
    </div>
  );
}
