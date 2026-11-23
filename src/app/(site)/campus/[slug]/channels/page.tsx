import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";

import { ChannelCard, CHANNEL_TYPE_META } from "@/components/channels/channel-card";
import { LinkButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { EmptyState, SectionHeader, Stat } from "@/components/ui/primitives";
import { ShareButton } from "@/components/ui/share-button";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { compactNumber } from "@/lib/format";
import { getOrgAccess, getOrganizationBySlug } from "@/lib/organizations";
import { CampusNav } from "../campus-nav";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; type?: string }>;
};

const TYPES = ["personal", "institute", "school"] as const;
type TypeFilter = (typeof TYPES)[number];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);
  if (!org) return { title: "Campus not found" };
  const imageKey = org.coverKey ?? org.logoKey;
  const imageUrl = imageKey ? `/api/media/${imageKey}` : "/brand/og-default.png";
  return {
    title: `${org.name} channels · Campus`,
    description: `Follow channels from ${org.name} on GuruLens Campus.`,
    alternates: { canonical: `/campus/${slug}/channels` },
    openGraph: {
      type: "website",
      title: `${org.name} channels · GuruLens Campus`,
      description: `Follow channels from ${org.name}.`,
      url: `/campus/${slug}/channels`,
      images: [{ url: imageUrl, alt: `${org.name} on GuruLens Campus` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${org.name} channels · GuruLens Campus`,
      description: `Follow channels from ${org.name}.`,
      images: [imageUrl],
    },
  };
}

export default async function CampusChannelsPage({ params, searchParams }: Props) {
  const auth = await getAuth();
  const { slug } = await params;
  if (!auth) redirect(`/login?redirect=/campus/${slug}/channels`);

  const org = await getOrganizationBySlug(slug);
  if (!org) notFound();
  const campusSlug = org.slug;

  const access = await getOrgAccess(auth.user.id, auth.user.role, org.id);
  // Public directory: any signed-in visitor can browse campus channels.

  const query = await searchParams;
  const q = (query.q ?? "").trim();
  const type = TYPES.includes(query.type as TypeFilter) ? (query.type as TypeFilter) : undefined;

  const where: Prisma.ChannelWhereInput = {
    organizationId: org.id,
    isActive: true,
    ...(type ? { type } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [channels, allChannels] = await Promise.all([
    db.channel.findMany({
      where,
      orderBy: [{ verifiedStatus: "desc" }, { followerCount: "desc" }, { createdAt: "desc" }],
      take: 60,
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        description: true,
        avatarKey: true,
        coverKey: true,
        verifiedStatus: true,
        followerCount: true,
        _count: {
          select: {
            followers: true,
            posts: { where: { publishedAt: { not: null } } },
          },
        },
      },
    }),
    db.channel.findMany({
      where: { organizationId: org.id, isActive: true },
      select: { type: true, verifiedStatus: true, followerCount: true },
    }),
  ]);

  const followers = allChannels.reduce((sum, channel) => sum + channel.followerCount, 0);
  const verified = allChannels.filter((channel) => channel.verifiedStatus === "verified").length;
  const typeCount = new Map<string, number>();
  for (const channel of allChannels) {
    typeCount.set(channel.type, (typeCount.get(channel.type) ?? 0) + 1);
  }

  function href(next: { q?: string; type?: string }) {
    const params = new URLSearchParams();
    const nextQuery = next.q ?? q;
    const nextType = next.type !== undefined ? next.type : type;
    if (nextQuery) params.set("q", nextQuery);
    if (nextType) params.set("type", nextType);
    const qs = params.toString();
    return qs ? `/campus/${campusSlug}/channels?${qs}` : `/campus/${campusSlug}/channels`;
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-6 pb-12 sm:px-6">
      <div className="mb-1">
        <Link
          href={`/campus/${org.slug}`}
          className="inline-flex items-center gap-1 text-[12px] font-bold text-ink-400 transition-colors hover:text-brand-600"
        >
          <Icon name="arrow-left" size={13} /> Back to {org.name}
        </Link>
      </div>

      <CampusNav slug={org.slug} active="channels" canManage={access.canManage} />

      <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Channels</h1>
          <p className="mt-1 text-[13px] text-ink-500">
            Follow class updates, notices and lessons from {org.name}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ShareButton
            path={`/campus/${org.slug}/channels`}
            title={`${org.name} channels · GuruLens Campus`}
            text={`Follow channels from ${org.name} on GuruLens`}
            label="Share channels"
          />
          <LinkButton href={`/campus/${org.slug}`} variant="outline" size="sm">
            <Icon name="grid" size={14} /> Overview
          </LinkButton>
        </div>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Channels" value={compactNumber(allChannels.length)} icon="radio" />
        <Stat label="Followers" value={compactNumber(followers)} icon="users" />
        <Stat label="Verified" value={compactNumber(verified)} icon="shield-check" />
        <Stat label="Types" value={compactNumber(typeCount.size)} icon="grid" />
      </div>

      <form method="get" className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-56">
          <Icon
            name="search"
            size={16}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-400"
          />
          <Input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search campus channels…"
            aria-label="Search campus channels"
            className="h-10 pl-10"
          />
        </div>
        {type ? <input type="hidden" name="type" value={type} /> : null}
        <button
          type="submit"
          className="inline-flex h-10 flex-none items-center gap-2 rounded-full bg-brand-600 px-4 text-[12.5px] font-bold text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          <Icon name="search" size={14} /> Search
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={href({ type: "" })}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition-colors ${
            !type
              ? "border-brand-600 bg-brand-600 text-white shadow-sm"
              : "border-ink-200 bg-white/80 text-ink-600 hover:border-brand-300 hover:text-brand-700"
          }`}
        >
          <Icon name="grid" size={13} /> All
          <span
            className={`rounded-chip px-1.5 py-0.5 text-[10px] font-black ${
              !type ? "bg-white/20 text-white" : "bg-ink-100 text-ink-500"
            }`}
          >
            {allChannels.length}
          </span>
        </Link>
        {TYPES.map((value) => {
          const meta = CHANNEL_TYPE_META[value];
          const active = type === value;
          return (
            <Link
              key={value}
              href={href({ type: value })}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition-colors ${
                active
                  ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                  : "border-ink-200 bg-white/80 text-ink-600 hover:border-brand-300 hover:text-brand-700"
              }`}
            >
              <Icon name={meta.icon} size={13} /> {meta.label}
              <span
                className={`rounded-chip px-1.5 py-0.5 text-[10px] font-black ${
                  active ? "bg-white/20 text-white" : "bg-ink-100 text-ink-500"
                }`}
              >
                {typeCount.get(value) ?? 0}
              </span>
            </Link>
          );
        })}
        {q || type ? (
          <Link
            href={`/campus/${org.slug}/channels`}
            className="ml-auto inline-flex items-center gap-1 text-[12px] font-bold text-ink-400 transition-colors hover:text-ink-700"
          >
            <Icon name="x" size={12} /> Clear
          </Link>
        ) : null}
      </div>

      <SectionHeader
        className="mt-7"
        title={q ? `Results for “${q}”` : "Campus channels"}
        subtitle={`${channels.length} channel${channels.length === 1 ? "" : "s"} shown`}
        action={
          access.canManage ? (
            <Link href="/channels" className="text-[12.5px] font-bold text-brand-600 hover:underline">
              Channel directory
            </Link>
          ) : undefined
        }
      />

      {channels.length === 0 ? (
        <EmptyState
          icon="radio"
          title="No channels match"
          description={
            q || type
              ? "Try a different search or clear the filters."
              : "Campus channels will appear here once they are created."
          }
          action={
            q || type ? (
              <LinkButton href={`/campus/${org.slug}/channels`} variant="outline">
                Clear filters
              </LinkButton>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {channels.map((channel) => (
            <ChannelCard key={channel.id} channel={channel} canManage={access.canManage} />
          ))}
        </div>
      )}
    </div>
  );
}
