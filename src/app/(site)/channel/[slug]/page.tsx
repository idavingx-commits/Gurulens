/**
 * Channel View Page
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuth } from "@/lib/auth";
import { getChannelBySlug, getChannelPosts, isFollowingChannel } from "@/lib/channels";
import { Button, LinkButton } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icons";
import { publicMediaUrl } from "@/lib/media";
import { cn } from "@/lib/format";
import { FollowButton } from "./follow-button";
import { ChannelPosts } from "./channel-posts";
import { CreatePostForm } from "./create-post-form";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const channel = await getChannelBySlug(slug);

  if (!channel) {
    return { title: "Channel Not Found | GuruLens" };
  }

  return {
    title: `${channel.name} | GuruLens Channels`,
    description: channel.description || `Follow ${channel.name} on GuruLens`,
  };
}

export default async function ChannelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const channel = await getChannelBySlug(slug);

  if (!channel || !channel.isActive) {
    notFound();
  }

  const auth = await getAuth();
  const isOwner = auth && channel.ownerType === "user" && channel.ownerId === auth.user.id;
  const isFollowing = auth ? await isFollowingChannel(channel.id, auth.user.id) : false;

  const avatarUrl = channel.avatarKey ? publicMediaUrl(channel.avatarKey) : null;
  const coverUrl = channel.coverKey ? publicMediaUrl(channel.coverKey) : null;

  const { posts } = await getChannelPosts(channel.id, { limit: 20 });

  return (
    <div className="min-h-screen">
      {/* Cover Image */}
      <div
        className="h-32 bg-gradient-to-r from-brand-500/20 to-brand-600/10 md:h-48"
        style={
          coverUrl
            ? { backgroundImage: `url(${coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      />

      <div className="mx-auto max-w-4xl px-4 -mt-16 pb-8">
        {/* Channel Header */}
        <div className="mb-6 rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <Avatar
              name={channel.name}
              src={avatarUrl}
              size="xl"
              className="-mt-12 border-4 border-white md:-mt-16"
            />

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-ink-900">{channel.name}</h1>
                {channel.verifiedStatus === "verified" && (
                  <span className="rounded bg-blue-500 px-2 py-0.5 text-xs font-semibold text-white">
                    ✓ Verified
                  </span>
                )}
              </div>
              <p className="text-ink-500">@{channel.slug}</p>
            </div>

            <div className="flex items-center gap-2">
              {isOwner ? (
                <LinkButton href={`/channel/${slug}/settings`} variant="outline" size="sm">
                  <Icon name="settings" size={16} />
                  Settings
                </LinkButton>
              ) : (
                auth && <FollowButton channelSlug={slug} initialFollowing={isFollowing} />
              )}
              <Button variant="outline" size="sm">
                <Icon name="share-2" size={16} />
              </Button>
            </div>
          </div>

          {channel.description && (
            <p className="mt-4 text-ink-600">{channel.description}</p>
          )}

          <div className="mt-4 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-1">
              <Icon name="users" size={16} className="text-ink-400" />
              <span className="font-semibold text-ink-900">{channel.followerCount}</span>
              <span className="text-ink-500">followers</span>
            </div>
            <div className="flex items-center gap-1">
              <Icon name="message-square" size={16} className="text-ink-400" />
              <span className="font-semibold text-ink-900">{channel.postCount}</span>
              <span className="text-ink-500">posts</span>
            </div>
            <div className="flex items-center gap-1">
              <Icon name="calendar" size={16} className="text-ink-400" />
              <span className="text-ink-500">
                Created {new Date(channel.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Post Creation (for owners) */}
        {isOwner && (
          <div className="mb-6 rounded-xl border bg-white p-5 shadow-sm">
            <CreatePostForm channelId={channel.id} channelSlug={slug} />
          </div>
        )}

        {/* Posts */}
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="border-b p-4">
            <h2 className="font-semibold text-ink-900">Posts</h2>
          </div>
          <div className="p-4">
            <ChannelPosts
              initialPosts={posts}
              channelId={channel.id}
              channelSlug={slug}
              isOwner={isOwner ?? false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
