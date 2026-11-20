import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { EmptyState, SectionHeader, Stat, VerifiedTick } from "@/components/ui/primitives";
import { getAuth } from "@/lib/auth";
import { getChannelBySlug, getChannelPosts, isFollowingChannel } from "@/lib/channels";
import { compactNumber, timeAgo } from "@/lib/format";
import { publicMediaUrl } from "@/lib/media";
import { FollowButton } from "./follow-button";
import { CreatePostForm } from "./create-post-form";
import { PostList } from "./post-list";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const channel = await getChannelBySlug(slug);
  if (!channel) return { title: "Channel Not Found" };
  return {
    title: channel.name,
    description: channel.description || `Follow ${channel.name} on GuruLens`,
  };
}

export default async function ChannelPage({ params }: Props) {
  const { slug } = await params;
  const channel = await getChannelBySlug(slug);

  if (!channel || !channel.isActive) notFound();

  const auth = await getAuth();
  const isOwner = auth && channel.ownerType === "user" && channel.ownerId === auth.user.id;
  const following = auth ? await isFollowingChannel(channel.id, auth.user.id) : false;

  const avatarUrl = channel.avatarKey ? publicMediaUrl(channel.avatarKey) : null;
  const coverUrl = channel.coverKey ? publicMediaUrl(channel.coverKey) : null;

  const { posts } = await getChannelPosts(channel.id, { limit: 20 });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6 pb-12 sm:px-6">
      {/* Cover */}
      {coverUrl && (
        <div
          className="mb-4 h-32 rounded-2xl bg-cover bg-center sm:h-40"
          style={{ backgroundImage: `url(${coverUrl})` }}
        />
      )}

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start gap-4">
        <Avatar name={channel.name} src={avatarUrl} size="xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl">
              {channel.name}
            </h1>
            {channel.verifiedStatus === "verified" && <VerifiedTick />}
          </div>
          <p className="text-sm text-ink-500">@{channel.slug}</p>
          {channel.description && (
            <p className="mt-2 text-sm text-ink-600">{channel.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-ink-400">
            <span className="flex items-center gap-1">
              <Icon name="users" size={14} />
              <strong className="font-bold text-ink-700">{compactNumber(channel.followerCount)}</strong> followers
            </span>
            <span className="flex items-center gap-1">
              <Icon name="file-text" size={14} />
              <strong className="font-bold text-ink-700">{compactNumber(channel.postCount)}</strong> posts
            </span>
            <span>Created {timeAgo(channel.createdAt)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {isOwner ? (
            <LinkButton href={`/channel/${slug}/settings`} variant="outline" size="sm">
              <Icon name="settings" size={16} /> Settings
            </LinkButton>
          ) : auth ? (
            <FollowButton channelSlug={slug} initialFollowing={following} />
          ) : (
            <LinkButton href={`/login?redirect=/channel/${slug}`} variant="outline" size="sm">
              Follow
            </LinkButton>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-3 gap-3">
        <Stat label="Followers" value={compactNumber(channel.followerCount)} icon="users" />
        <Stat label="Posts" value={channel.postCount} icon="file-text" />
        <Stat label="Created" value={timeAgo(channel.createdAt)} icon="calendar" />
      </div>

      {/* Post creation */}
      {isOwner && (
        <div className="mb-8">
          <SectionHeader title="Create Post" subtitle="Share an update with your followers" />
          <div className="card p-4">
            <CreatePostForm channelSlug={slug} />
          </div>
        </div>
      )}

      {/* Posts */}
      <SectionHeader title="Posts" subtitle={`${posts.length} post${posts.length !== 1 ? "s" : ""}`} />
      {posts.length === 0 ? (
        <EmptyState
          icon="file-text"
          title="No posts yet"
          description={isOwner ? "Create your first post above" : "Check back later for updates"}
        />
      ) : (
        <PostList posts={posts} isOwner={isOwner ?? false} channelSlug={slug} />
      )}
    </div>
  );
}
