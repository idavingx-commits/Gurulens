import type { Metadata } from "next";
import Link from "next/link";

import {
  CHANNEL_TYPE_META,
  ChannelCard,
} from "@/components/channels/channel-card";
import { LinkButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { EmptyState, InfoNote, SectionHeader } from "@/components/ui/primitives";
import { getAuth } from "@/lib/auth";
import {
  getChannelDirectoryStats,
  getChannelUsage,
  getTrendingChannels,
  getUserChannels,
  searchChannels,
} from "@/lib/channels";
import { compactNumber } from "@/lib/format";

export const metadata: Metadata = {
  title: "Channels",
  description: "Discover and follow educational channels from verified teachers",
};

const CHANNEL_TYPES = ["personal", "institute", "school"] as const;
type ChannelTypeFilter = (typeof CHANNEL_TYPES)[number];

const TYPE_META = CHANNEL_TYPE_META as Record<
  ChannelTypeFilter,
  { label: string; icon: string; chip: string }
>;

export default async function ChannelsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; error?: string }>;
}) {
  const { q, type: rawType, error: errorParam } = await searchParams;
  const type = CHANNEL_TYPES.includes(rawType as ChannelTypeFilter)
    ? (rawType as ChannelTypeFilter)
    : undefined;
  const auth = await getAuth();
  const isFiltering = Boolean(q || type);

  const [usage, myChannels, trending, allChannels, searchResults, directory] = await Promise.all([
    auth ? getChannelUsage(auth.user.id) : Promise.resolve(null),
    auth ? getUserChannels(auth.user.id) : Promise.resolve([]),
    isFiltering ? Promise.resolve([]) : getTrendingChannels(6),
    isFiltering ? Promise.resolve([]) : searchChannels("", { limit: 24 }),
    isFiltering ? searchChannels(q ?? "", { type, limit: 24 }) : Promise.resolve(null),
    getChannelDirectoryStats(),
  ]);

  const trendingIds = new Set(trending.map((channel) => channel.id));
  const moreChannels = allChannels.filter((channel) => !trendingIds.has(channel.id));

  function filterHref(value?: ChannelTypeFilter) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (value) params.set("type", value);
    const qs = params.toString();
    return qs ? `/channels?${qs}` : "/channels";
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-6 pb-12 sm:px-6">
      {errorParam === "limit_reached" ? (
        <InfoNote icon="alert" tone="warn" className="mb-5">
          You&apos;ve reached your channel limit.{" "}
          <Link href="/pricing" className="font-bold text-warn-700 hover:underline">
            Upgrade your plan
          </Link>{" "}
          to create more channels.
        </InfoNote>
      ) : null}

      {/* Hero */}
      <section className="animate-fade-up relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink-900 via-brand-800 to-accent-700 px-5 py-7 text-white shadow-xl sm:px-8 sm:py-9">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-12 size-64 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 -left-16 size-64 rounded-full bg-accent-400/20 blur-3xl"
        />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-chip bg-white/15 px-2.5 py-1 text-[10px] font-black tracking-[0.16em] uppercase backdrop-blur-sm">
              <Icon name="radio" size={11} /> Channel directory
            </span>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Find your next classroom.
            </h1>
            <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-white/75">
              Follow teachers, institutes and schools for notes, voice lessons, polls and exam
              updates — all in one feed.
            </p>
          </div>

          {auth && usage?.canCreate ? (
            <Link
              href="/channels/create"
              className="inline-flex h-10 flex-none items-center gap-2 rounded-full bg-white px-5 text-[13px] font-bold text-brand-700 shadow-lg transition-transform hover:-translate-y-0.5"
            >
              <Icon name="plus" size={16} /> Create channel
            </Link>
          ) : null}
        </div>

        <form className="relative mt-5 flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 basis-56">
            <Icon
              name="search"
              size={17}
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-400"
            />
            <Input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search by name, subject or teacher…"
              aria-label="Search channels"
              className="h-11 border-white/25 bg-white/95 pl-10 text-ink-900 placeholder:text-ink-400"
            />
            {type ? <input type="hidden" name="type" value={type} /> : null}
          </div>
          <button
            type="submit"
            className="inline-flex h-11 flex-none items-center gap-2 rounded-full bg-white px-5 text-[13px] font-bold text-brand-700 shadow-lg transition-transform hover:-translate-y-0.5"
          >
            <Icon name="search" size={15} /> Search
          </button>
        </form>

        <div className="relative mt-5 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-chip bg-white/12 px-3 py-1.5 text-[11.5px] font-bold text-white/90 backdrop-blur-sm">
            <Icon name="radio" size={12} />
            {compactNumber(directory.channels)} public channel{directory.channels === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-chip bg-white/12 px-3 py-1.5 text-[11.5px] font-bold text-white/90 backdrop-blur-sm">
            <Icon name="file-text" size={12} />
            {compactNumber(directory.posts)} posts shared
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-chip bg-white/12 px-3 py-1.5 text-[11.5px] font-bold text-white/90 backdrop-blur-sm">
            <Icon name="users" size={12} />
            {compactNumber(directory.followers)} follows
          </span>
        </div>
      </section>

      {/* Type filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={filterHref()}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition-colors ${
            type
              ? "border-ink-200 bg-white/80 text-ink-600 hover:border-brand-300 hover:text-brand-700"
              : "border-brand-600 bg-brand-600 text-white shadow-sm"
          }`}
        >
          <Icon name="grid" size={13} /> All
        </Link>
        {CHANNEL_TYPES.map((value) => {
          const meta = TYPE_META[value];
          const active = type === value;
          return (
            <Link
              key={value}
              href={filterHref(value)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition-colors ${
                active
                  ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                  : "border-ink-200 bg-white/80 text-ink-600 hover:border-brand-300 hover:text-brand-700"
              }`}
            >
              <Icon name={meta.icon} size={13} />
              {meta.label}
            </Link>
          );
        })}
        {isFiltering ? (
          <Link
            href="/channels"
            className="ml-auto inline-flex items-center gap-1 text-[12px] font-bold text-ink-400 transition-colors hover:text-ink-700"
          >
            <Icon name="x" size={12} /> Clear
          </Link>
        ) : null}
      </div>

      {/* Search / filter results */}
      {searchResults ? (
        <section className="mt-8">
          <SectionHeader
            title={q ? `Results for “${q}”` : `${TYPE_META[type ?? "personal"].label} channels`}
            subtitle={`${searchResults.length} channel${searchResults.length === 1 ? "" : "s"} found`}
          />
          {searchResults.length === 0 ? (
            <EmptyState
              icon="search"
              title="No channels found"
              description="Try a different search term or clear the filters."
              action={
                <Link href="/channels" className="text-sm font-bold text-brand-600 hover:underline">
                  Browse all channels
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {searchResults.map((channel) => (
                <ChannelCard key={channel.id} channel={channel} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {/* My Channels */}
          {auth && myChannels.length > 0 ? (
            <section className="mt-8">
              <SectionHeader
                title="My Channels"
                subtitle={
                  usage
                    ? `${usage.used} of ${usage.limit === -1 ? "unlimited" : usage.limit} used`
                    : undefined
                }
                action={
                  usage?.canCreate ? (
                    <Link
                      href="/channels/create"
                      className="text-sm font-bold text-brand-600 hover:underline"
                    >
                      + New channel
                    </Link>
                  ) : undefined
                }
              />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {myChannels.map((channel) => (
                  <ChannelCard key={channel.id} channel={channel} canManage />
                ))}
              </div>
              {usage && !usage.canCreate ? (
                <InfoNote icon="info" className="mt-4">
                  You&apos;ve reached your channel limit ({usage.limit}).{" "}
                  <Link href="/pricing" className="font-bold text-brand-700 hover:underline">
                    Upgrade
                  </Link>{" "}
                  to create more.
                </InfoNote>
              ) : null}
            </section>
          ) : null}

          {/* Trending */}
          {trending.length > 0 ? (
            <section className="mt-8">
              <SectionHeader
                title="Trending Channels"
                subtitle="Most followed and most active this week"
              />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {trending.map((channel) => (
                  <ChannelCard key={channel.id} channel={channel} />
                ))}
              </div>
            </section>
          ) : null}

          {/* All channels */}
          {moreChannels.length > 0 ? (
            <section className="mt-8">
              <SectionHeader
                title="Browse all channels"
                subtitle={`${moreChannels.length} more channel${moreChannels.length === 1 ? "" : "s"} to explore`}
              />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {moreChannels.map((channel) => (
                  <ChannelCard key={channel.id} channel={channel} />
                ))}
              </div>
            </section>
          ) : null}

          {trending.length === 0 && myChannels.length === 0 ? (
            <div className="mt-8">
              <EmptyState
                icon="radio"
                title="No channels yet"
                description="Be the first to create a channel and start sharing lessons with your students."
                action={
                  auth && usage?.canCreate ? (
                    <LinkButton href="/channels/create">Create channel</LinkButton>
                  ) : (
                    <LinkButton href="/explore">Explore teachers</LinkButton>
                  )
                }
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
