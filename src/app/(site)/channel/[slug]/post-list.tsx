"use client";

import { useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Badge } from "@/components/ui/primitives";
import { timeAgo } from "@/lib/format";

type Post = {
  id: string;
  type: string;
  content: string | null;
  isPinned: boolean;
  isUrgent: boolean;
  publishedAt: string | Date | null;
  reactionCount: number;
  author: { id: string; name: string; avatarKey: string | null };
};

function PostCard({ post, isOwner }: { post: Post; isOwner: boolean }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.reactionCount);

  function handleLike() {
    setLiked(!liked);
    setLikes((n) => (liked ? n - 1 : n + 1));
    // TODO: API call
  }

  return (
    <div className={`card p-4 ${post.isPinned ? "ring-2 ring-brand-200" : ""}`}>
      <div className="flex items-start gap-3">
        <Avatar name={post.author.name} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-ink-900">{post.author.name}</span>
            {post.isPinned && <Badge tone="brand" icon="pin">Pinned</Badge>}
            {post.isUrgent && <Badge tone="danger" icon="alert-triangle">Urgent</Badge>}
          </div>
          <p className="text-xs text-ink-400">
            {post.publishedAt ? timeAgo(new Date(post.publishedAt)) : "Draft"}
          </p>
        </div>
        {isOwner && (
          <button className="text-ink-400 hover:text-danger-500">
            <Icon name="trash-2" size={16} />
          </button>
        )}
      </div>

      {post.content && (
        <p className="mt-3 whitespace-pre-wrap text-sm text-ink-700">{post.content}</p>
      )}

      <div className="mt-4 flex items-center gap-4 border-t border-ink-100 pt-3">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
            liked ? "text-danger-500" : "text-ink-400 hover:text-danger-500"
          }`}
        >
          <Icon name="heart" size={16} className={liked ? "fill-current" : ""} />
          {likes}
        </button>
        <button className="flex items-center gap-1.5 text-sm font-medium text-ink-400 hover:text-ink-600">
          <Icon name="message-circle" size={16} /> Reply
        </button>
        <button className="flex items-center gap-1.5 text-sm font-medium text-ink-400 hover:text-ink-600">
          <Icon name="share" size={16} /> Share
        </button>
      </div>
    </div>
  );
}

export function PostList({
  posts: initialPosts,
  isOwner,
  channelSlug,
}: {
  posts: Post[];
  isOwner: boolean;
  channelSlug: string;
}) {
  const [posts, setPosts] = useState(initialPosts);

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} isOwner={isOwner} />
      ))}
    </div>
  );
}
