/**
 * Channels Browse Page
 * Discover and follow educational channels
 */

import { Suspense } from "react";
import Link from "next/link";
import { getAuth } from "@/lib/auth";
import { getTrendingChannels, searchChannels, getChannelUsage, getUserChannels } from "@/lib/channels";
import { Button, LinkButton } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icons";
import { publicMediaUrl } from "@/lib/media";
import { cn } from "@/lib/format";

export const metadata = {
  title: "Channels | GuruLens",
  description: "Discover and follow educational channels from verified teachers",
};

function ChannelCard({ channel }: { channel: any }) {
  const avatarUrl = channel.avatarKey ? publicMediaUrl(channel.avatarKey) : null;

  return (
    <Link href={`/channel/${channel.slug}`}>
      <div className="h-full rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
        <div className="mb-3 flex items-start gap-3">
          <Avatar
            name={channel.name}
            src={avatarUrl}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-semibold text-ink-900">{channel.name}</h3>
              {channel.verifiedStatus === "verified" && (
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                  ✓
                </span>
              )}
            </div>
            <p className="text-sm text-ink-500">@{channel.slug}</p>
          </div>
        </div>
        {channel.description && (
          <p className="mb-3 line-clamp-2 text-sm text-ink-600">{channel.description}</p>
        )}
        <div className="flex items-center gap-4 text-xs text-ink-400">
          <span className="flex items-center gap-1">
            <Icon name="users" size={12} />
            {channel._count?.followers ?? channel.followerCount ?? 0} followers
          </span>
          <span className="flex items-center gap-1">
            <Icon name="message-square" size={12} />
            {channel._count?.posts ?? channel.postCount ?? 0} posts
          </span>
        </div>
      </div>
    </Link>
  );
}

async function MyChannelsSection() {
  const auth = await getAuth();
  if (!auth) return null;

  const [channels, usage] = await Promise.all([
    getUserChannels(auth.user.id),
    getChannelUsage(auth.user.id),
  ]);

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink-900">My Channels</h2>
          <p className="text-sm text-ink-500">
            {usage.used} of {usage.limit === -1 ? "unlimited" : usage.limit} channels used
          </p>
        </div>
        {usage.canCreate && (
          <LinkButton href="/channels/create">
            <Icon name="plus" size={16} />
            Create Channel
          </LinkButton>
        )}
      </div>

      {channels.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-center">
          <p className="mb-4 text-ink-500">You haven't created any channels yet.</p>
          {usage.canCreate && (
            <LinkButton href="/channels/create" variant="outline">
              Create Your First Channel
            </LinkButton>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {channels.map((channel) => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
        </div>
      )}

      {!usage.canCreate && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            You've reached your channel limit ({usage.limit}).{" "}
            <Link href="/pricing" className="font-medium underline">
              Upgrade your plan
            </Link>{" "}
            to create more channels.
          </p>
        </div>
      )}
    </section>
  );
}

async function TrendingChannelsSection() {
  const channels = await getTrendingChannels(6);

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center gap-2">
        <Icon name="trending-up" size={20} className="text-brand-500" />
        <h2 className="text-xl font-semibold text-ink-900">Trending Channels</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {channels.map((channel) => (
          <ChannelCard key={channel.id} channel={channel} />
        ))}
      </div>
    </section>
  );
}

export default async function ChannelsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const auth = await getAuth();

  let searchResults = null;
  if (q) {
    searchResults = await searchChannels(q);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ink-900">Channels</h1>
          <p className="text-ink-500">
            Follow educational channels to stay updated with your favorite teachers
          </p>
        </div>
      </div>

      {/* Search */}
      <form className="mb-8">
        <div className="relative max-w-md">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <Input
            name="q"
            placeholder="Search channels..."
            defaultValue={q}
            className="pl-10"
          />
        </div>
      </form>

      {/* Search Results */}
      {searchResults && (
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-ink-900">
            Search Results for "{q}" ({searchResults.length})
          </h2>
          {searchResults.length === 0 ? (
            <p className="text-ink-500">No channels found matching your search.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {searchResults.map((channel) => (
                <ChannelCard key={channel.id} channel={channel} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* My Channels (if logged in) */}
      {auth && (
        <Suspense fallback={<div className="animate-pulse rounded-xl bg-ink-100 h-48" />}>
          <MyChannelsSection />
        </Suspense>
      )}

      {/* Trending Channels */}
      {!q && (
        <Suspense fallback={<div className="animate-pulse rounded-xl bg-ink-100 h-48" />}>
          <TrendingChannelsSection />
        </Suspense>
      )}
    </div>
  );
}
