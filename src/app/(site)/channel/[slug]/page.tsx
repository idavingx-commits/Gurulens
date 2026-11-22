import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { EmptyState, SectionHeader, Stat, VerifiedTick } from "@/components/ui/primitives";
import { ShareButton } from "@/components/ui/share-button";
import { getAuth } from "@/lib/auth";
import {
  canManageChannel,
  getChannelBySlug,
  getChannelPosts,
  isFollowingChannel,
} from "@/lib/channels";
import { db } from "@/lib/db";
import { compactNumber, formatDate, isExpired, timeAgo } from "@/lib/format";
import { ChannelVerificationRequest } from "./channel-verification";
import { FollowButton } from "./follow-button";
import { CreatePostForm } from "./create-post-form";
import { PostList } from "./post-list";

function parseKeys(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === "string") : [];
  } catch {
    return [];
  }
}

function parseWaveform(raw: string | null): number[] {
  return parseKeys(raw)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .slice(0, 64)
    .map((value) => Math.min(1, Math.max(0.05, value)));
}

type Props = { params: Promise<{ slug: string }> };

const CHANNEL_TYPE_LABEL: Record<string, string> = {
  personal: "Teacher channel",
  institute: "Institute channel",
  school: "School channel",
};

const VISIBILITY_META: Record<string, { label: string; icon: string }> = {
  public: { label: "Public", icon: "globe" },
  private: { label: "Private", icon: "lock" },
  members: { label: "Class members", icon: "users" },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const channel = await getChannelBySlug(slug);
  if (!channel) return { title: "Channel Not Found" };

  const description = channel.description || `Follow ${channel.name} on GuruLens`;
  const imageKey = channel.coverKey ?? channel.avatarKey;
  const imageUrl = imageKey ? `/api/media/${imageKey}` : "/brand/og-default.png";

  return {
    title: channel.name,
    description,
    alternates: { canonical: `/channel/${slug}` },
    openGraph: {
      type: "website",
      title: `${channel.name} · GuruLens`,
      description,
      url: `/channel/${slug}`,
      images: [{ url: imageUrl, alt: `${channel.name} on GuruLens` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${channel.name} · GuruLens`,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ChannelPage({ params }: Props) {
  const { slug } = await params;
  const channel = await getChannelBySlug(slug);

  if (!channel || !channel.isActive) notFound();

  const auth = await getAuth();
  const isOwner = auth && channel.ownerType === "user" && channel.ownerId === auth.user.id;
  const following = auth ? await isFollowingChannel(channel.id, auth.user.id) : false;

  const canManage = auth ? await canManageChannel(channel, auth.user.id) : false;

  const owner =
    channel.ownerType === "user"
      ? await db.user.findUnique({
          where: { id: channel.ownerId },
          select: {
            name: true,
            avatarKey: true,
            teacherProfile: { select: { handle: true } },
          },
        })
      : null;

  const avatarUrl = channel.avatarKey ? `/api/media/${channel.avatarKey}` : null;
  const coverUrl = channel.coverKey ? `/api/media/${channel.coverKey}` : null;

  const { posts } = await getChannelPosts(channel.id, { limit: 20 });

  // Voice notes historically stored a storage key; newer posts store the
  // Media id. Resolve both so playback never points at a missing object.
  const mediaLookup = new Set<string>();
  for (const post of posts) {
    for (const key of parseKeys(post.mediaKeys)) mediaLookup.add(key);
    if (post.voiceMessage?.audioKey) mediaLookup.add(post.voiceMessage.audioKey);
  }
  const mediaRows =
    mediaLookup.size > 0
      ? await db.media.findMany({
          where: {
            OR: [
              { id: { in: [...mediaLookup] } },
              { storageKey: { in: [...mediaLookup] } },
            ],
          },
          select: { id: true, storageKey: true, mimeType: true },
        })
      : [];
  const mediaByKey = new Map<string, { id: string; mimeType: string }>();
  for (const row of mediaRows) {
    mediaByKey.set(row.id, { id: row.id, mimeType: row.mimeType });
    mediaByKey.set(row.storageKey, { id: row.id, mimeType: row.mimeType });
  }

  const myReactions = auth
    ? await db.channelReaction.findMany({
        where: {
          userId: auth.user.id,
          channelPostId: { in: posts.map((p) => p.id) },
        },
        select: { channelPostId: true },
      })
    : [];
  const likedSet = new Set(myReactions.map((r) => r.channelPostId));

  const postItems = posts.map((post) => {
    const pollVotes = post.poll?.votes ?? [];
    const optionLabels: string[] = post.poll ? parseKeys(post.poll.options) : [];
    const voiceMedia = post.voiceMessage
      ? mediaByKey.get(post.voiceMessage.audioKey)
      : undefined;
    return {
      id: post.id,
      type: post.type,
      content: post.content,
      isPinned: post.isPinned,
      isUrgent: post.isUrgent,
      publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
      reactionCount: post._count.reactions,
      likedByMe: likedSet.has(post.id),
      author: post.author,
      voiceMessage:
        post.voiceMessage && voiceMedia
          ? {
              mediaId: voiceMedia.id,
              durationSec: post.voiceMessage.durationSec,
              waveform: parseWaveform(post.voiceMessage.waveform),
            }
          : null,
      attachments: parseKeys(post.mediaKeys).flatMap((key) => {
        const media = mediaByKey.get(key);
        if (!media) return [];
        if (!media.mimeType.startsWith("image/") && media.mimeType !== "application/pdf") return [];
        return [{ id: media.id, mimeType: media.mimeType }];
      }),
      poll: post.poll
        ? {
            id: post.poll.id,
            question: post.poll.question,
            allowMultiple: post.poll.allowMultiple,
            endsAt: post.poll.endsAt ? post.poll.endsAt.toISOString() : null,
            ended: isExpired(post.poll.endsAt),
            totalVotes: new Set(pollVotes.map((v) => v.userId)).size,
            options: optionLabels.map((label, index) => ({
              label,
              count: pollVotes.filter((v) => v.optionIndex === index).length,
              chosen: auth
                ? pollVotes.some((v) => v.optionIndex === index && v.userId === auth.user.id)
                : false,
            })),
          }
        : null,
    };
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6 pb-12 sm:px-6">
      {/* Channel hero */}
      <section className="animate-fade-up overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-ink-100">
        <div className="relative h-36 bg-gradient-to-br from-ink-900 via-brand-800 to-accent-600 sm:h-48">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-16 -right-10 size-52 rounded-full bg-white/10 blur-3xl"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-20 -left-10 size-52 rounded-full bg-accent-400/20 blur-3xl"
              />
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900/60 via-ink-900/5 to-transparent" />

          <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-chip bg-white/90 px-2.5 py-1 text-[10px] font-black tracking-[0.12em] text-ink-700 uppercase shadow-sm">
              <Icon name="radio" size={11} />
              {CHANNEL_TYPE_LABEL[channel.type] ?? "Channel"}
            </span>
            {channel.verifiedStatus === "verified" ? (
              <span className="inline-flex items-center gap-1 rounded-chip bg-success-600/95 px-2.5 py-1 text-[10px] font-black tracking-[0.12em] text-white uppercase shadow-sm">
                <Icon name="shield-check" size={11} /> Verified
              </span>
            ) : null}
          </div>

          {canManage ? (
            <Link
              href={`/channel/${slug}/settings`}
              aria-label="Edit channel"
              className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[11.5px] font-bold text-ink-900 shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
            >
              <Icon name="camera" size={13} />
              <span className="hidden sm:inline">Edit channel</span>
            </Link>
          ) : null}
        </div>

        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="relative flex-none -mt-12 sm:-mt-14">
              <Avatar name={channel.name} src={avatarUrl} size="2xl" ring />
              {canManage ? (
                <Link
                  href={`/channel/${slug}/settings`}
                  aria-label="Change channel photo"
                  className="absolute -right-0.5 -bottom-0.5 flex size-7 items-center justify-center rounded-full bg-brand-600 text-white shadow-md ring-2 ring-white transition-colors hover:bg-brand-700"
                >
                  <Icon name="camera" size={13} />
                </Link>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 pb-1">
              {canManage ? (
                <LinkButton href={`/channel/${slug}/settings`} variant="outline" size="sm">
                  <Icon name="settings" size={15} /> Settings
                </LinkButton>
              ) : auth ? (
                <FollowButton channelSlug={slug} initialFollowing={following} />
              ) : (
                <LinkButton href={`/login?redirect=/channel/${slug}`} variant="outline" size="sm">
                  Follow
                </LinkButton>
              )}
              <ShareButton
                path={`/channel/${slug}`}
                title={channel.name}
                text={`Follow ${channel.name} on GuruLens`}
              />
            </div>
          </div>

          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl">
                {channel.name}
              </h1>
              {channel.verifiedStatus === "verified" ? <VerifiedTick /> : null}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-400">
              <span className="font-semibold">@{channel.slug}</span>
              <span>·</span>
              <span>{CHANNEL_TYPE_LABEL[channel.type] ?? "Channel"}</span>
              {channel.organization ? (
                <>
                  <span>·</span>
                  <Link
                    href={`/campus/${channel.organization.slug}`}
                    className="inline-flex items-center gap-1 font-bold text-brand-700 transition-colors hover:text-brand-800 hover:underline"
                  >
                    <Icon name="school" size={12} />
                    {channel.organization.name}
                    {channel.organization.verifiedStatus === "verified" ? (
                      <VerifiedTick className="size-3" />
                    ) : null}
                  </Link>
                </>
              ) : null}
              {owner ? (
                <>
                  <span>·</span>
                  {owner.teacherProfile ? (
                    <Link
                      href={`/teacher/${owner.teacherProfile.handle}`}
                      className="inline-flex items-center gap-1.5 font-bold text-ink-600 transition-colors hover:text-brand-700"
                    >
                      <Avatar
                        name={owner.name}
                        src={owner.avatarKey ? `/api/media/${owner.avatarKey}` : null}
                        size="xs"
                      />
                      {owner.name}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 font-bold text-ink-600">
                      <Avatar
                        name={owner.name}
                        src={owner.avatarKey ? `/api/media/${owner.avatarKey}` : null}
                        size="xs"
                      />
                      {owner.name}
                    </span>
                  )}
                </>
              ) : null}
            </div>

            {channel.description ? (
              <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-ink-600">
                {channel.description}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="Followers" value={compactNumber(channel.followerCount)} icon="users" />
        <Stat label="Posts" value={channel.postCount} icon="file-text" />
        <Stat label="Created" value={timeAgo(channel.createdAt)} icon="calendar" />
      </div>

      {/* About + share */}
      <section className="mt-4 mb-8 grid gap-3 sm:grid-cols-5">
        <div className="card p-4 sm:col-span-3">
          <p className="text-[10px] font-black tracking-[0.14em] text-ink-400 uppercase">
            About this channel
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <dt className="text-[10.5px] font-bold tracking-wide text-ink-400 uppercase">Type</dt>
              <dd className="mt-0.5 flex items-center gap-1.5 text-[12.5px] font-bold text-ink-700">
                <Icon name="radio" size={13} className="text-brand-600" />
                {CHANNEL_TYPE_LABEL[channel.type] ?? "Channel"}
              </dd>
            </div>
            <div>
              <dt className="text-[10.5px] font-bold tracking-wide text-ink-400 uppercase">
                Visibility
              </dt>
              <dd className="mt-0.5 flex items-center gap-1.5 text-[12.5px] font-bold text-ink-700">
                <Icon
                  name={VISIBILITY_META[channel.visibility]?.icon ?? "globe"}
                  size={13}
                  className="text-brand-600"
                />
                {VISIBILITY_META[channel.visibility]?.label ?? "Public"}
              </dd>
            </div>
            <div>
              <dt className="text-[10.5px] font-bold tracking-wide text-ink-400 uppercase">
                Created
              </dt>
              <dd className="mt-0.5 text-[12.5px] font-bold text-ink-700">
                {formatDate(channel.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-[10.5px] font-bold tracking-wide text-ink-400 uppercase">
                Owner
              </dt>
              <dd className="mt-0.5 truncate text-[12.5px] font-bold text-ink-700">
                {owner?.teacherProfile ? (
                  <Link
                    href={`/teacher/${owner.teacherProfile.handle}`}
                    className="inline-flex max-w-full items-center gap-1.5 text-brand-700 hover:underline"
                  >
                    <Avatar
                      name={owner.name}
                      src={owner.avatarKey ? `/api/media/${owner.avatarKey}` : null}
                      size="xs"
                    />
                    <span className="truncate">{owner.name}</span>
                  </Link>
                ) : owner ? (
                  owner.name
                ) : (
                  "Organization"
                )}
              </dd>
            </div>
          </dl>
        </div>

        <div className="card relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-accent-700 p-4 text-white sm:col-span-2">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-10 -right-8 size-32 rounded-full bg-white/10 blur-2xl"
          />
          <p className="relative text-[13.5px] font-extrabold">Share this channel</p>
          <p className="relative mt-1 text-[12px] leading-relaxed text-white/75">
            Send {channel.name} to a friend, class group or WhatsApp study circle.
          </p>
          <ShareButton
            path={`/channel/${slug}`}
            title={`${channel.name} · GuruLens`}
            text={`Follow ${channel.name} on GuruLens`}
            label="Share channel"
            variant="outline"
            className="relative mt-3 !border-white/40 !bg-white !text-brand-700 hover:!bg-white/90"
          />
        </div>
      </section>

      {/* Verification */}
      {canManage && (channel.verifiedStatus === "none" || channel.verifiedStatus === "rejected") ? (
        <section className="mb-8">
          <SectionHeader
            title="Get verified"
            subtitle="Verified channels earn trust with students, parents and followers"
          />
          <div className="card p-4">
            <ChannelVerificationRequest channelSlug={slug} />
          </div>
        </section>
      ) : null}

      {/* Post creation */}
      {canManage && (
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
        <PostList
          posts={postItems}
          isOwner={isOwner ?? false}
          channelSlug={slug}
          signedIn={!!auth}
        />
      )}
    </div>
  );
}
