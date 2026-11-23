import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import {
  EmptyState,
  InfoNote,
  SectionHeader,
  Stat,
  VerifiedTick,
} from "@/components/ui/primitives";
import { ShareButton } from "@/components/ui/share-button";
import { getAuth } from "@/lib/auth";
import {
  campusDayKey,
  campusTimeLabel,
  getCampusLatestPosts,
  getCampusUpcomingSessions,
} from "@/lib/campus";
import { ADMIN_ROLES } from "@/lib/constants";
import { db } from "@/lib/db";
import { compactNumber, formatDate, timeAgo } from "@/lib/format";
import {
  getOrgAccess,
  getOrgCapacity,
  getOrgStats,
  getOrganizationBySlug,
} from "@/lib/organizations";
import { SITE_URL, jsonLd } from "@/lib/site";
import { CampusNav } from "./campus-nav";
import { RequestOrgVerification } from "./request-verification";

type Props = { params: Promise<{ slug: string }> };

const ROLE_ORDER = ["owner", "admin", "manager", "teacher", "staff"];

const ROLE_TONE: Record<string, string> = {
  owner: "bg-brand-50 text-brand-700",
  admin: "bg-accent-100 text-accent-700",
  manager: "bg-success-100 text-success-600",
  teacher: "bg-ink-100 text-ink-600",
  staff: "bg-ink-100 text-ink-500",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);
  if (!org) return { title: "Campus not found" };

  const description = org.description ?? `${org.name} on GuruLens Campus`;
  const imageKey = org.coverKey ?? org.logoKey;
  const imageUrl = imageKey ? `/api/media/${imageKey}` : "/brand/og-default.png";

  return {
    title: `${org.name} · Campus`,
    description,
    alternates: { canonical: `/campus/${slug}` },
    openGraph: {
      type: "website",
      title: `${org.name} · GuruLens Campus`,
      description,
      url: `/campus/${slug}`,
      images: [{ url: imageUrl, alt: `${org.name} on GuruLens Campus` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${org.name} · GuruLens Campus`,
      description,
      images: [imageUrl],
    },
  };
}

export default async function CampusDetailPage({ params }: Props) {
  const auth = await getAuth();
  const { slug } = await params;
  if (!auth) redirect(`/login?redirect=/campus/${slug}`);

  const org = await getOrganizationBySlug(slug);
  if (!org) notFound();

  const access = await getOrgAccess(auth.user.id, auth.user.role, org.id);
  // Public profile: any signed-in visitor can view the campus overview,
  // classes, channels and people. School-only tools stay gated below.

  const canManage = access.canManage;
  const isStaff =
    access.canManage || ["teacher", "staff"].includes(access.role ?? "");

  const [stats, capacity, classes, channels, pendingRequest, upcomingSessions, latestPosts] =
    await Promise.all([
    getOrgStats(org.id),
    getOrgCapacity(org.id),
    db.class.findMany({
      where: { organizationId: org.id },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 20,
      select: {
        id: true,
        name: true,
        coverKey: true,
        mode: true,
        status: true,
        branch: { select: { name: true } },
        teacher: {
          select: {
            name: true,
            avatarKey: true,
            teacherProfile: { select: { handle: true } },
          },
        },
        _count: { select: { enrollments: true, sessions: true } },
      },
    }),
    db.channel.findMany({
      where: { organizationId: org.id, isActive: true },
      orderBy: [{ verifiedStatus: "desc" }, { followerCount: "desc" }],
      take: 12,
      select: {
        id: true,
        name: true,
        slug: true,
        avatarKey: true,
        coverKey: true,
        verifiedStatus: true,
        followerCount: true,
        _count: { select: { posts: true } },
      },
    }),
    db.organizationVerificationRequest.findFirst({
      where: { organizationId: org.id, status: { in: ["pending", "in_review"] } },
      orderBy: { createdAt: "desc" },
      select: { status: true, createdAt: true },
    }),
    getCampusUpcomingSessions(org.id, { take: 5 }),
    getCampusLatestPosts(org.id, 4),
  ]);

  const members = [...org.members].sort(
    (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role),
  );

  const logoUrl = org.logoKey ? `/api/media/${org.logoKey}` : null;
  const coverUrl = org.coverKey ? `/api/media/${org.coverKey}` : null;
  const mainBranch = org.branches.find((branch) => branch.isMain);

  const campusJsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "@id": `${SITE_URL}/campus/${org.slug}#organization`,
    name: org.name,
    url: `${SITE_URL}/campus/${org.slug}`,
    description: org.description ?? `${org.name} on GuruLens Campus`,
    ...(logoUrl ? { logo: `${SITE_URL}${logoUrl}` } : {}),
    ...(org.website ? { sameAs: [org.website] } : {}),
    ...(org.email ? { email: org.email } : {}),
    ...(org.phone ? { telephone: org.phone } : {}),
    ...(org.address
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: org.address,
            addressCountry: "LK",
          },
        }
      : {}),
    ...(org.branches.length > 0
      ? {
          department: org.branches.map((branch) => ({
            "@type": "EducationalOrganization",
            name: `${branch.name} · ${org.name}`,
            url: `${SITE_URL}/campus/${org.slug}/branch/${branch.id}`,
            ...(branch.address
              ? {
                  address: {
                    "@type": "PostalAddress",
                    streetAddress: branch.address,
                    addressCountry: "LK",
                  },
                }
              : {}),
          })),
        }
      : {}),
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-6 pb-12 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(campusJsonLd) }} />
      {/* Campus header */}
      <section className="card animate-fade-up overflow-hidden">
        <div className="relative h-36 overflow-hidden bg-gradient-to-br from-ink-900 via-brand-800 to-accent-700 sm:h-44">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <>
              <div
                aria-hidden="true"
                className="absolute -top-16 -right-10 size-48 rounded-full bg-white/10 blur-3xl"
              />
              <div
                aria-hidden="true"
                className="absolute -bottom-20 -left-10 size-48 rounded-full bg-accent-400/20 blur-3xl"
              />
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900/55 via-transparent to-transparent" />

          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-chip bg-white/15 px-2.5 py-1 text-[10px] font-black tracking-[0.12em] uppercase text-white backdrop-blur-sm">
            <Icon name={org.type === "school" ? "school" : "grid"} size={11} />
            {org.type} campus
          </span>

          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
            {canManage ? (
              <Link
                href={`/campus/${org.slug}/manage`}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/60 bg-white/90 px-3 text-[11.5px] font-bold text-ink-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-brand-700"
              >
                <Icon name="settings" size={13} /> Manage
              </Link>
            ) : null}
            <ShareButton
              path={`/campus/${org.slug}`}
              title={`${org.name} · GuruLens Campus`}
              text={`Visit ${org.name} on GuruLens Campus`}
              label="Share campus"
              iconOnly
              className="!h-8 border-white/60 bg-white/90 text-ink-700 shadow-sm backdrop-blur-sm hover:bg-white"
            />
          </div>
        </div>

        <div className="relative z-10 px-5 pb-5">
          <div className="flex flex-wrap items-start gap-4">
            <Avatar
              name={org.name}
              src={logoUrl}
              size="xl"
              ring
              className="-mt-10 flex-none !rounded-2xl"
            />
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="min-w-0 text-2xl font-extrabold tracking-tight break-words text-ink-900">
                  {org.name}
                </h1>
                {org.verifiedStatus === "verified" ? <VerifiedTick /> : null}
                <span className="rounded-chip bg-ink-100 px-2.5 py-1 text-[11px] font-bold capitalize text-ink-500">
                  {org.type}
                </span>
                <span className="rounded-chip bg-brand-50 px-2.5 py-1 text-[11px] font-bold capitalize text-brand-700">
                  {access.role === "admin" ? "GuruLens admin" : access.role}
                </span>
              </div>
              {org.nameSi ? (
                <p lang="si" className="font-si text-[13.5px] font-semibold text-ink-500">
                  {org.nameSi}
                </p>
              ) : null}
              <p className="mt-1 text-[12px] font-semibold text-ink-400">
                /campus/{org.slug} · established {formatDate(org.createdAt)}
              </p>
            </div>
          </div>

          {org.description ? (
            <p className="mt-3 max-w-3xl text-[13.5px] leading-relaxed text-ink-600">
              {org.description}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] font-semibold text-ink-500">
            {org.address ? (
              <span className="flex items-center gap-1">
                <Icon name="location" size={13} /> {org.address}
              </span>
            ) : null}
            {org.email ? (
              <a
                href={`mailto:${org.email}`}
                className="flex items-center gap-1 hover:text-brand-600"
              >
                <Icon name="mail" size={13} /> {org.email}
              </a>
            ) : null}
            {org.phone ? (
              <span className="flex items-center gap-1">
                <Icon name="phone" size={13} /> {org.phone}
              </span>
            ) : null}
            {org.website ? (
              <a
                href={org.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 hover:text-brand-600"
              >
                <Icon name="globe" size={13} /> {org.website.replace(/^https?:\/\//, "")}
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <CampusNav slug={org.slug} active="overview" canManage={canManage} />

      {org.type === "school" && !access.canView ? (
        <InfoNote icon="school" className="mt-4">
          You&apos;re viewing the public profile. Timetables and school-only content are for
          registered students and teachers.
          <Link
            href={`/campus/${org.slug}/join`}
            className="ml-2 font-bold text-brand-700 underline"
          >
            Join this school
          </Link>
        </InfoNote>
      ) : null}

      {/* Stats */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Members" value={compactNumber(stats.members)} icon="users" />
        <Stat label="Classes" value={compactNumber(stats.classes)} icon="book-open" />
        <Stat label="Students" value={compactNumber(stats.students)} icon="user" />
        <Stat label="Channels" value={compactNumber(stats.channels)} icon="radio" />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {/* Upcoming sessions */}
          <section>
            <SectionHeader
              title="Coming up"
              subtitle="The next live sessions across this campus"
              action={
                <Link
                  href={`/campus/${org.slug}/timetable`}
                  className="text-[12.5px] font-bold text-brand-600 hover:underline"
                >
                  Full timetable
                </Link>
              }
            />
            {upcomingSessions.length === 0 ? (
              <div className="card flex items-center gap-3 p-4">
                <span className="flex size-9 flex-none items-center justify-center rounded-xl bg-ink-100 text-ink-400">
                  <Icon name="calendar" size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-ink-800">Nothing scheduled yet</p>
                  <p className="text-[11.5px] text-ink-400">
                    Class sessions will appear here as teachers schedule them.
                  </p>
                </div>
                {canManage ? (
                  <Link
                    href="/classhub"
                    className="flex-none text-[11.5px] font-bold text-brand-600 hover:underline"
                  >
                    ClassHub
                  </Link>
                ) : null}
              </div>
            ) : (
              <div className="card divide-y divide-ink-100">
                {upcomingSessions.map((session) => {
                  const day = campusDayKey(session.scheduledAt);
                  const today = campusDayKey(new Date());
                  return (
                    <div key={session.id} className="flex flex-wrap items-center gap-3 p-3.5">
                      <div className="flex w-14 flex-none flex-col items-center rounded-xl bg-brand-50 px-2 py-1.5 text-brand-700">
                        <span className="text-[12.5px] font-extrabold tabular-nums">
                          {campusTimeLabel(session.scheduledAt)}
                        </span>
                        <span className="text-[10px] font-bold text-brand-500">
                          {day === today ? "Today" : session.duration + " min"}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/classhub/class/${session.class.id}`}
                          className="block truncate text-[13px] font-bold text-ink-900 hover:text-brand-700"
                        >
                          {session.class.name}
                        </Link>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] font-semibold text-ink-400">
                          <span>{session.class.teacher.name}</span>
                          {session.class.branch ? <span>· {session.class.branch.name}</span> : null}
                          {session.topic ? (
                            <span className="min-w-0 truncate">· {session.topic}</span>
                          ) : null}
                        </p>
                      </div>
                      {session.status === "in_progress" ? (
                        <span className="rounded-chip bg-success-100 px-2 py-0.5 text-[10px] font-bold text-success-600">
                          Live
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Classes */}
          <section>
            <SectionHeader
              title="Classes"
              subtitle={`${classes.length} class${classes.length === 1 ? "" : "es"} under this campus`}
              action={
                <span className="flex items-center gap-3">
                  <Link
                    href={`/campus/${org.slug}/classes`}
                    className="text-[12.5px] font-bold text-brand-600 hover:underline"
                  >
                    View all
                  </Link>
                  {canManage ? (
                    <Link
                      href="/classhub"
                      className="text-[12.5px] font-bold text-brand-600 hover:underline"
                    >
                      ClassHub
                    </Link>
                  ) : null}
                </span>
              }
            />
            {classes.length === 0 ? (
              <EmptyState
                icon="book-open"
                title="No classes yet"
                description="Classes created by campus teachers will appear here."
              />
            ) : (
              <div className="card divide-y divide-ink-100">
                {classes.map((cls) => {
                  const coverUrl = cls.coverKey ? `/api/media/${cls.coverKey}` : null;
                  const teacherHref = cls.teacher.teacherProfile?.handle
                    ? `/teacher/${cls.teacher.teacherProfile.handle}`
                    : null;
                  return (
                    <div
                      key={cls.id}
                      className="flex flex-wrap items-center gap-3 p-4 transition-colors hover:bg-ink-50/60"
                    >
                      <Link
                        href={`/classhub/class/${cls.id}`}
                        className="relative flex size-12 flex-none items-center justify-center overflow-hidden rounded-xl bg-brand-50 text-brand-600"
                      >
                        {coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={coverUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <Icon name="book" size={19} />
                        )}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/classhub/class/${cls.id}`}
                            className="truncate font-bold text-ink-900 hover:text-brand-700"
                          >
                            {cls.name}
                          </Link>
                          <span className="rounded-chip bg-ink-100 px-2 py-0.5 text-[10.5px] font-bold capitalize text-ink-500">
                            {cls.status}
                          </span>
                          <span className="rounded-chip bg-brand-50 px-2 py-0.5 text-[10.5px] font-bold capitalize text-brand-700">
                            {cls.mode}
                          </span>
                        </div>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] font-semibold text-ink-400">
                          {teacherHref ? (
                            <Link
                              href={teacherHref}
                              className="inline-flex items-center gap-1 hover:text-brand-600"
                            >
                              {cls.teacher.avatarKey ? (
                                <Avatar
                                  name={cls.teacher.name}
                                  src={`/api/media/${cls.teacher.avatarKey}`}
                                  size="xs"
                                />
                              ) : null}
                              {cls.teacher.name}
                            </Link>
                          ) : (
                            <span>{cls.teacher.name}</span>
                          )}
                          <span>{cls._count.enrollments} students</span>
                          <span>{cls._count.sessions} sessions</span>
                          {cls.branch ? <span>{cls.branch.name}</span> : null}
                        </p>
                      </div>
                      <Link
                        href={`/classhub/class/${cls.id}`}
                        aria-label={`Open ${cls.name}`}
                        className="flex size-8 flex-none items-center justify-center rounded-full text-ink-300 hover:bg-ink-100 hover:text-ink-700"
                      >
                        <Icon name="chevron-right" size={15} />
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Channels */}
          <section>
            <SectionHeader
              title="Channels"
              subtitle={`${channels.length} active channel${channels.length === 1 ? "" : "s"}`}
              action={
                canManage ? (
                  <Link
                    href="/channels"
                    className="text-[12.5px] font-bold text-brand-600 hover:underline"
                  >
                    Browse channels
                  </Link>
                ) : undefined
              }
            />
            {channels.length === 0 ? (
              <EmptyState
                icon="radio"
                title="No campus channels yet"
                description="Channels created for this campus will appear here for students to follow."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {channels.map((channel) => (
                  <Link
                    key={channel.id}
                    href={`/channel/${channel.slug}`}
                    className="card group flex items-center gap-3 p-3 transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <span className="relative flex size-11 flex-none items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-500 to-accent-600 text-white">
                      {channel.avatarKey ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/media/${channel.avatarKey}`}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Icon name="radio" size={18} />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-[13px] font-bold text-ink-900 group-hover:text-brand-700">
                        {channel.name}
                        {channel.verifiedStatus === "verified" ? (
                          <VerifiedTick className="size-3.5" />
                        ) : null}
                      </p>
                      <p className="text-[11px] font-semibold text-ink-400">
                        {compactNumber(channel.followerCount)} followers ·{" "}
                        {compactNumber(channel._count.posts)} posts
                      </p>
                    </div>
                    <Icon
                      name="chevron-right"
                      size={14}
                      className="flex-none text-ink-300"
                    />
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Latest channel posts */}
          <section>
            <SectionHeader
              title="Latest from campus channels"
              subtitle="Notices, updates and lessons posted by your teachers"
              action={
                <Link
                  href={`/campus/${org.slug}/channels`}
                  className="text-[12.5px] font-bold text-brand-600 hover:underline"
                >
                  All channels
                </Link>
              }
            />
            {latestPosts.length === 0 ? (
              <div className="card flex items-center gap-3 p-4">
                <span className="flex size-9 flex-none items-center justify-center rounded-xl bg-ink-100 text-ink-400">
                  <Icon name="radio" size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-ink-800">No posts yet</p>
                  <p className="text-[11.5px] text-ink-400">
                    Campus channel posts will appear here as teachers publish them.
                  </p>
                </div>
              </div>
            ) : (
              <div className="card divide-y divide-ink-100">
                {latestPosts.map((post) => {
                  const postIcon =
                    post.type === "image"
                      ? "image"
                      : post.type === "video"
                        ? "video"
                        : post.type === "audio"
                          ? "mic"
                          : post.type === "file"
                            ? "file"
                            : "message";
                  return (
                    <Link
                      key={post.id}
                      href={`/channel/${post.channel.slug}`}
                      className="flex items-start gap-3 p-3.5 transition-colors hover:bg-ink-50/60"
                    >
                      <Avatar
                        name={post.channel.name}
                        src={
                          post.channel.avatarKey
                            ? `/api/media/${post.channel.avatarKey}`
                            : null
                        }
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-1.5 text-[12px] font-bold text-ink-700">
                          {post.channel.name}
                          {post.isPinned ? (
                            <span className="inline-flex items-center gap-0.5 rounded-chip bg-brand-50 px-1.5 py-0.5 text-[9.5px] font-black text-brand-700">
                              <Icon name="pin" size={9} /> Pinned
                            </span>
                          ) : null}
                          {post.isUrgent ? (
                            <span className="rounded-chip bg-danger-50 px-1.5 py-0.5 text-[9.5px] font-black text-danger-600">
                              Urgent
                            </span>
                          ) : null}
                          <span className="ml-auto shrink-0 text-[10.5px] font-semibold text-ink-400">
                            {post.publishedAt ? timeAgo(post.publishedAt) : ""}
                          </span>
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-relaxed text-ink-600">
                          {post.content?.trim() || "Media post"}
                        </p>
                        <p className="mt-1 flex items-center gap-2 text-[10.5px] font-semibold text-ink-400">
                          <span className="inline-flex items-center gap-0.5 capitalize">
                            <Icon name={postIcon} size={10} /> {post.type}
                          </span>
                          <span className="inline-flex items-center gap-0.5">
                            <Icon name="heart" size={10} /> {post.reactions}
                          </span>
                          <span className="truncate">{post.author.name}</span>
                        </p>
                      </div>
                      <Icon
                        name="chevron-right"
                        size={14}
                        className="mt-1 flex-none text-ink-300"
                      />
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* Team */}
          <section>
            <SectionHeader
              title="Team"
              subtitle={`${members.length} active member${members.length === 1 ? "" : "s"}`}
              action={
                canManage ? (
                  <Link
                    href={`/campus/${org.slug}/manage`}
                    className="text-[12.5px] font-bold text-brand-600 hover:underline"
                  >
                    Manage team
                  </Link>
                ) : undefined
              }
            />
            {members.length === 0 ? (
              <p className="text-[13px] text-ink-400">No members yet.</p>
            ) : (
              <div className="card divide-y divide-ink-100">
                {members.map((member) => {
                  const profileHandle = member.user.teacherProfile?.handle ?? null;
                  return (
                    <div key={member.id} className="flex items-center gap-3 p-3.5">
                      <Avatar
                        name={member.user.name}
                        src={
                          member.user.avatarKey
                            ? `/api/media/${member.user.avatarKey}`
                            : null
                        }
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-bold text-ink-900">
                          {profileHandle ? (
                            <Link
                              href={`/teacher/${profileHandle}`}
                              className="truncate hover:text-brand-700"
                            >
                              {member.user.name}
                            </Link>
                          ) : (
                            <span className="truncate">{member.user.name}</span>
                          )}
                          <span
                            className={`rounded-chip px-1.5 py-0.5 text-[10px] font-bold capitalize ${
                              ROLE_TONE[member.role] ?? "bg-ink-100 text-ink-500"
                            }`}
                          >
                            {member.role}
                          </span>
                        </p>
                        <p className="text-[11.5px] font-semibold text-ink-400">
                          {member.branch?.name ? `${member.branch.name} · ` : ""}
                          joined {timeAgo(member.joinedAt)}
                        </p>
                      </div>
                      {profileHandle ? (
                        <Link
                          href={`/teacher/${profileHandle}`}
                          className="text-[11.5px] font-bold text-brand-600 hover:underline"
                        >
                          Profile
                        </Link>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-8">
          {/* Verification */}
          <section>
            <SectionHeader title="Verification" />
            <div className="card p-4">
              <div className="flex items-center gap-2">
                <Icon
                  name={org.verifiedStatus === "verified" ? "shield-check" : "shield"}
                  size={18}
                  className={
                    org.verifiedStatus === "verified" ? "text-success-500" : "text-ink-400"
                  }
                />
                <span className="text-[13px] font-extrabold capitalize text-ink-900">
                  {org.verifiedStatus.replace("_", " ")}
                </span>
                {org.verifiedAt ? (
                  <span className="ml-auto text-[11px] font-semibold text-ink-400">
                    {timeAgo(org.verifiedAt)}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-ink-500">
                {org.verifiedStatus === "verified"
                  ? "This organization has been verified by the GuruLens team."
                  : pendingRequest
                    ? "The GuruLens team is reviewing this organization's evidence."
                    : "Verified organizations earn trust with students, parents and teachers."}
              </p>
              {canManage &&
              !pendingRequest &&
              (org.verifiedStatus === "none" || org.verifiedStatus === "rejected") ? (
                <div className="mt-4 border-t border-ink-100 pt-4">
                  <RequestOrgVerification organizationId={org.id} />
                </div>
              ) : null}
            </div>
          </section>

          {/* Branches */}
          <section>
            <SectionHeader
              title="Branches"
              subtitle={`${org.branches.length} location${org.branches.length === 1 ? "" : "s"}`}
            />
            {org.branches.length === 0 ? (
              <p className="text-[13px] text-ink-400">No branches added.</p>
            ) : (
              <div className="space-y-2">
                {org.branches.map((branch) => (
                  <Link
                    key={branch.id}
                    href={`/campus/${org.slug}/branch/${branch.id}`}
                    className="card group flex items-start gap-2.5 p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <span className="mt-0.5 flex size-7 flex-none items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <Icon name="location" size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-bold text-ink-900 group-hover:text-brand-700">
                        <span className="truncate">{branch.name}</span>
                        {branch.isMain ? (
                          <span className="rounded-chip bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">
                            Main
                          </span>
                        ) : null}
                      </p>
                      {branch.address ? (
                        <p className="truncate text-[11.5px] text-ink-500">{branch.address}</p>
                      ) : null}
                      {branch.phone ? (
                        <p className="mt-0.5 flex items-center gap-1 text-[11.5px] font-semibold text-ink-400">
                          <Icon name="phone" size={11} /> {branch.phone}
                        </p>
                      ) : null}
                    </div>
                    <Icon
                      name="chevron-right"
                      size={14}
                      className="mt-1 flex-none text-ink-300 transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Capacity */}
          <section>
            <SectionHeader title="Campus capacity" />
            <div className="card space-y-2.5 p-4 text-[12px] font-semibold text-ink-500">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="users" size={13} className="text-ink-400" /> Teacher seats
                </span>
                <span className="text-ink-800">
                  {capacity.usage.teachers} / {capacity.limits.teacherQuota}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="radio" size={13} className="text-ink-400" /> Channels
                </span>
                <span className="text-ink-800">
                  {capacity.usage.channels} / {capacity.limits.channelQuota}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="book-open" size={13} className="text-ink-400" /> Classes
                </span>
                <span className="text-ink-800">
                  {capacity.usage.classes} / {capacity.limits.classQuota}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-ink-100 pt-2.5">
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="user" size={13} className="text-ink-400" /> Students
                </span>
                <span className="text-ink-800">{compactNumber(capacity.usage.students)}</span>
              </div>
              {mainBranch ? (
                <div className="flex items-center justify-between gap-2 border-t border-ink-100 pt-2.5">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="location" size={13} className="text-ink-400" /> Main branch
                  </span>
                  <span className="max-w-[55%] truncate text-right text-ink-800">
                    {mainBranch.name}
                  </span>
                </div>
              ) : null}
            </div>
          </section>

          {/* Quick links */}
          {isStaff ? (
            <section>
              <SectionHeader title="Quick actions" />
              <div className="space-y-2">
                {canManage ? (
                  <LinkButton
                    href={`/campus/${org.slug}/manage`}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Icon name="settings" size={16} /> Manage campus
                  </LinkButton>
                ) : null}
                <LinkButton href="/classhub" variant="outline" className="w-full justify-start">
                  <Icon name="book-open" size={16} /> ClassHub
                </LinkButton>
                <LinkButton href="/channels" variant="outline" className="w-full justify-start">
                  <Icon name="radio" size={16} /> Channels
                </LinkButton>
                {ADMIN_ROLES.includes(auth.user.role) ? (
                  <LinkButton
                    href="/admin/organizations"
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Icon name="shield" size={16} /> Admin verification
                  </LinkButton>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
