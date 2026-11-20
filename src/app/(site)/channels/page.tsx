import type { Metadata } from "next";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { EmptyState, InfoNote, SectionHeader, VerifiedTick } from "@/components/ui/primitives";
import { getAuth } from "@/lib/auth";
import { getTrendingChannels, searchChannels, getChannelUsage, getUserChannels } from "@/lib/channels";
import { compactNumber } from "@/lib/format";
import { publicMediaUrl } from "@/lib/media";

export const metadata: Metadata = {
  title: "Channels",
  description: "Discover and follow educational channels from verified teachers",
};

function ChannelCard({ channel }: { channel: any }) {
  const avatarUrl = channel.avatarKey ? publicMediaUrl(channel.avatarKey) : null;
  const followers = channel._count?.followers ?? channel.followerCount ?? 0;
  const posts = channel._count?.posts ?? channel.postCount ?? 0;

  return (
    <Link href={`/channel/${channel.slug}`} className="card block p-4 transition-shadow hover:shadow-lg">
      <div className="flex items-start gap-3">
        <Avatar name={channel.name} src={avatarUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-bold text-ink-900">{channel.name}</span>
            {channel.verifiedStatus === "verified" && <VerifiedTick className="size-4" />}
          </div>
          <p className="text-sm text-ink-500">@{channel.slug}</p>
        </div>
      </div>
      {channel.description && (
        <p className="mt-2 line-clamp-2 text-sm text-ink-600">{channel.description}</p>
      )}
      <div className="mt-3 flex items-center gap-4 text-xs text-ink-400">
        <span className="flex items-center gap-1">
          <Icon name="users" size={13} /> {compactNumber(followers)}
        </span>
        <span className="flex items-center gap-1">
          <Icon name="file-text" size={13} /> {compactNumber(posts)} posts
        </span>
      </div>
    </Link>
  );
}

export default async function ChannelsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string }>;
}) {
  const { q, error: errorParam } = await searchParams;
  const auth = await getAuth();

  const usage = auth ? await getChannelUsage(auth.user.id) : null;
  const myChannels = auth ? await getUserChannels(auth.user.id) : [];
  const trending = await getTrendingChannels(6);
  const searchResults = q ? await searchChannels(q) : null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-8 pb-12 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">Channels</h1>
          <p className="mt-1 text-[13px] text-ink-500">
            Follow teachers and get updates directly in your feed.
          </p>
        </div>
        {auth && usage?.canCreate && (
          <LinkButton href="/channels/create">
            <Icon name="plus" size={18} /> Create Channel
          </LinkButton>
        )}
      </div>

      {/* Errors */}
      {errorParam === "limit_reached" && (
        <InfoNote icon="alert" tone="warn" className="mb-6">
          You've reached your channel limit.{" "}
          <Link href="/pricing" className="font-bold text-warn-700 hover:underline">
            Upgrade your plan
          </Link>{" "}
          to create more channels.
        </InfoNote>
      )}

      {/* Search */}
      <form className="mb-8">
        <div className="relative max-w-sm">
          <Icon name="search" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <Input
            name="q"
            placeholder="Search channels…"
            defaultValue={q}
            className="pl-10"
          />
        </div>
      </form>

      {/* Search Results */}
      {searchResults && (
        <section className="mb-10">
          <SectionHeader
            title={`Results for "${q}"`}
            subtitle={`${searchResults.length} channel${searchResults.length !== 1 ? "s" : ""} found`}
          />
          {searchResults.length === 0 ? (
            <EmptyState
              icon="search"
              title="No channels found"
              description="Try a different search term"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {searchResults.map((ch) => (
                <ChannelCard key={ch.id} channel={ch} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* My Channels */}
      {auth && myChannels.length > 0 && !q && (
        <section className="mb-10">
          <SectionHeader
            title="My Channels"
            subtitle={usage ? `${usage.used} of ${usage.limit === -1 ? "unlimited" : usage.limit} used` : undefined}
            action={
              usage?.canCreate ? (
                <Link href="/channels/create" className="text-sm font-bold text-brand-600 hover:underline">
                  + New channel
                </Link>
              ) : undefined
            }
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myChannels.map((ch) => (
              <ChannelCard key={ch.id} channel={ch} />
            ))}
          </div>
          {usage && !usage.canCreate && (
            <InfoNote icon="info" className="mt-4">
              You've reached your channel limit ({usage.limit}).{" "}
              <Link href="/pricing" className="font-bold text-brand-700 hover:underline">
                Upgrade
              </Link>{" "}
              to create more.
            </InfoNote>
          )}
        </section>
      )}

      {/* Trending */}
      {!q && trending.length > 0 && (
        <section>
          <SectionHeader title="Trending Channels" subtitle="Popular this week" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trending.map((ch) => (
              <ChannelCard key={ch.id} channel={ch} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state when no channels at all */}
      {!q && trending.length === 0 && myChannels.length === 0 && (
        <EmptyState
          icon="radio"
          title="No channels yet"
          description="Be the first to create a channel"
          action={
            auth && usage?.canCreate ? (
              <LinkButton href="/channels/create">Create Channel</LinkButton>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
