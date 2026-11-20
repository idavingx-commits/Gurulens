"use client";

import { useState } from "react";
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/format";

interface Post {
  id: string;
  type: string;
  content: string | null;
  mediaKeys: string | null;
  isPinned: boolean;
  isUrgent: boolean;
  publishedAt: string | Date | null;
  reactionCount: number;
  viewCount: number;
  author: {
    id: string;
    name: string;
    avatarKey: string | null;
  };
  voiceMessage?: {
    audioKey: string;
    durationSec: number;
  } | null;
  poll?: {
    id: string;
    question: string;
    options: string;
    votes: any[];
  } | null;
}

interface ChannelPostsProps {
  initialPosts: Post[];
  channelId: string;
  channelSlug: string;
  isOwner: boolean;
}

function PostCard({
  post,
  isOwner,
  onDelete,
}: {
  post: Post;
  isOwner: boolean;
  onDelete: (id: string) => void;
}) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.reactionCount);

  const handleLike = async () => {
    setLiked(!liked);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
    // TODO: Implement API call
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    onDelete(post.id);
  };

  return (
    <div
      className={cn(
        "rounded-lg border bg-white p-4",
        post.isPinned && "border-brand-200 bg-brand-50/50"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={post.author.name} size="sm" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-ink-900">{post.author.name}</span>
              {post.isPinned && (
                <span className="flex items-center gap-1 rounded bg-brand-100 px-1.5 py-0.5 text-xs text-brand-700">
                  <Icon name="pin" size={10} />
                  Pinned
                </span>
              )}
              {post.isUrgent && (
                <span className="flex items-center gap-1 rounded bg-danger-100 px-1.5 py-0.5 text-xs text-danger-700">
                  <Icon name="alert-triangle" size={10} />
                  Urgent
                </span>
              )}
            </div>
            <span className="text-xs text-ink-500">
              {post.publishedAt
                ? formatTimeAgo(new Date(post.publishedAt))
                : "Draft"}
            </span>
          </div>
        </div>

        {isOwner && (
          <button
            onClick={handleDelete}
            className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-danger-600"
          >
            <Icon name="trash-2" size={16} />
          </button>
        )}
      </div>

      {/* Text Content */}
      {post.content && (
        <p className="mt-3 whitespace-pre-wrap text-ink-700">{post.content}</p>
      )}

      {/* Voice Message */}
      {post.voiceMessage && (
        <div className="mt-3 flex items-center gap-3 rounded-lg bg-ink-50 p-3">
          <Button variant="outline" size="sm">
            <Icon name="play" size={14} />
          </Button>
          <div className="h-8 flex-1 rounded bg-brand-100" />
          <span className="text-xs text-ink-500">
            {Math.floor(post.voiceMessage.durationSec / 60)}:
            {String(Math.floor(post.voiceMessage.durationSec % 60)).padStart(2, "0")}
          </span>
        </div>
      )}

      {/* Poll */}
      {post.poll && (
        <div className="mt-3 space-y-2">
          <p className="font-medium text-ink-900">{post.poll.question}</p>
          {JSON.parse(post.poll.options).map((option: string, idx: number) => (
            <Button key={idx} variant="outline" className="w-full justify-start">
              {option}
            </Button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-4">
        <button
          onClick={handleLike}
          className={cn(
            "flex items-center gap-1 text-sm transition-colors",
            liked ? "text-danger-500" : "text-ink-500 hover:text-danger-500"
          )}
        >
          <Icon name="heart" size={16} className={liked ? "fill-current" : ""} />
          {likeCount}
        </button>
        <button className="flex items-center gap-1 text-sm text-ink-500 hover:text-ink-700">
          <Icon name="message-circle" size={16} />
          Reply
        </button>
        <button className="flex items-center gap-1 text-sm text-ink-500 hover:text-ink-700">
          <Icon name="share-2" size={16} />
          Share
        </button>
      </div>
    </div>
  );
}

export function ChannelPosts({
  initialPosts,
  channelId,
  channelSlug,
  isOwner,
}: ChannelPostsProps) {
  const [posts, setPosts] = useState(initialPosts);

  const handleDelete = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  if (posts.length === 0) {
    return (
      <div className="py-8 text-center">
        <Icon name="message-square" size={48} className="mx-auto mb-4 text-ink-300" />
        <p className="text-ink-500">No posts yet.</p>
        {isOwner && (
          <p className="mt-2 text-sm text-ink-400">Create your first post to get started!</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} isOwner={isOwner} onDelete={handleDelete} />
      ))}
    </div>
  );
}
