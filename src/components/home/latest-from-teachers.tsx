import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icons";
import { VerifiedTick } from "@/components/ui/primitives";
import type { PostView } from "@/lib/data";
import { cn, compactNumber, timeAgo, truncate } from "@/lib/format";

const TYPE_META: Record<string, { label: string; icon: string; chip: string; tile: string }> = {
  post: {
    label: "Update",
    icon: "pencil",
    chip: "bg-ink-100 text-ink-600",
    tile: "from-ink-500 to-ink-700",
  },
  announcement: {
    label: "Announcement",
    icon: "bell",
    chip: "bg-warn-100 text-warn-600",
    tile: "from-warn-500 to-danger-500",
  },
  lesson: {
    label: "Lesson",
    icon: "book",
    chip: "bg-brand-50 text-brand-700",
    tile: "from-brand-500 to-brand-700",
  },
  reel: {
    label: "Reel",
    icon: "film",
    chip: "bg-accent-100 text-accent-700",
    tile: "from-accent-500 to-brand-600",
  },
  video: {
    label: "Video",
    icon: "play",
    chip: "bg-danger-100 text-danger-600",
    tile: "from-danger-500 to-accent-600",
  },
};

function metaFor(type: string) {
  return TYPE_META[type] ?? TYPE_META.post!;
}

export function LatestFromTeachers({
  posts,
  isAuthenticated = false,
}: {
  posts: PostView[];
  isAuthenticated?: boolean;
}) {
  const [featured, ...rest] = posts;
  const feedHref = isAuthenticated ? "/feed" : "/explore";
  const feedLabel = isAuthenticated ? "View the full feed" : "Explore more teachers";

  return (
    <section className="relative overflow-hidden py-16 sm:py-20">
      {/* Editorial background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-white via-ink-50/40 to-white"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(10,27,61,0.05) 1px, transparent 0)`,
          backgroundSize: "26px 26px",
        }}
      />
      <div
        aria-hidden="true"
        className="orb orb-brand pointer-events-none absolute -top-32 right-0 -z-10 size-[340px] opacity-40"
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-9 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200/70 bg-white/75 px-3 py-1.5 text-[10.5px] font-black tracking-[0.16em] text-brand-700 uppercase shadow-sm backdrop-blur-sm">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-400 opacity-70" />
                <span className="relative inline-flex size-2 rounded-full bg-brand-500" />
              </span>
              Teacher Pulse
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-ink-900 sm:text-4xl">
              Latest from Teachers
            </h2>
            <p
              lang="si"
              className="font-si mt-2 max-w-xl text-[14px] leading-[1.85] font-semibold text-ink-500"
            >
              අලුත්ම පාඩම්, නිවේදන සහ class updates — සෘජුවම ගුරුවරුන්ගෙන්.
            </p>
          </div>

          <Link
            href={feedHref}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-ink-200/70 bg-white/75 px-4 py-2 text-[12.5px] font-bold text-ink-600 shadow-sm backdrop-blur-sm transition-all hover:border-brand-300 hover:text-brand-700 hover:shadow-md"
          >
            {feedLabel}
            <Icon name="arrow-right" size={14} />
          </Link>
        </div>

        {featured ? (
          <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
            <FeaturedPost post={featured} />

            <div className="flex flex-col gap-3.5">
              {rest.map((post, index) => (
                <CompactPost key={post.id} post={post} index={index} />
              ))}

              {/* Fill the rail when there are fewer than four posts */}
              {rest.length < 3 ? (
                <Link
                  href={feedHref}
                  className="group relative flex flex-1 items-center gap-4 overflow-hidden rounded-2xl border border-dashed border-brand-200 bg-white/60 p-5 backdrop-blur-sm transition-all hover:border-brand-300 hover:bg-white"
                >
                  <span className="flex size-11 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-md">
                    <Icon name="compass" size={20} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-extrabold text-ink-900">
                      Discover more teacher updates
                    </span>
                    <span className="mt-0.5 block text-[12px] font-semibold text-ink-500">
                      Follow teachers to shape this feed.
                    </span>
                  </span>
                  <Icon
                    name="arrow-right"
                    size={16}
                    className="ml-auto flex-none text-brand-500 transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              ) : null}
            </div>
          </div>
        ) : (
          <EmptyLatest />
        )}
      </div>
    </section>
  );
}

function FeaturedPost({ post }: { post: PostView }) {
  const meta = metaFor(post.type);
  const cover = post.images[0] ?? null;
  const href = `/post/${post.id}`;

  return (
    <article className="animate-fade-up group relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-lift ring-1 ring-ink-100 transition-shadow hover:shadow-xl">
      {cover ? (
        <Link href={href} className="relative block overflow-hidden bg-ink-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover}
            alt={`${post.author.name} — ${meta.label}`}
            className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
          <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-chip bg-ink-900/75 px-2.5 py-1 text-[10px] font-black tracking-[0.12em] text-white uppercase backdrop-blur-sm">
            <Icon name={meta.icon} size={11} strokeWidth={2.6} />
            {meta.label}
          </span>
          {post.images.length > 1 ? (
            <span className="absolute right-4 bottom-4 rounded-chip bg-ink-900/70 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
              +{post.images.length - 1} photos
            </span>
          ) : null}
        </Link>
      ) : (
        <Link
          href={href}
          className={cn(
            "relative flex min-h-44 items-center justify-center overflow-hidden bg-gradient-to-br text-white",
            meta.tile,
          )}
        >
          <span
            aria-hidden="true"
            className="absolute -top-10 -right-8 text-[180px] leading-none font-black text-white/10 select-none"
          >
            &ldquo;
          </span>
          <span className="relative flex size-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
            <Icon name={meta.icon} size={30} />
          </span>
          <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-chip bg-white/15 px-2.5 py-1 text-[10px] font-black tracking-[0.12em] uppercase backdrop-blur-sm">
            <Icon name={meta.icon} size={11} strokeWidth={2.6} />
            {meta.label}
          </span>
          {post.video ? (
            <span className="absolute right-4 bottom-4 inline-flex items-center gap-1.5 rounded-chip bg-ink-900/45 px-2.5 py-1 text-[10px] font-bold backdrop-blur-sm">
              <Icon name="play" size={11} /> Video
            </span>
          ) : null}
        </Link>
      )}

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-center gap-2.5">
          <Avatar
            name={post.author.name}
            src={post.author.avatarId ? `/api/media/${post.author.avatarId}` : null}
            size="sm"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="truncate text-[12.5px] font-extrabold text-ink-900">
                {post.author.name}
              </span>
              {post.author.verified ? <VerifiedTick /> : null}
            </div>
            <p className="text-[11px] font-semibold text-ink-400">
              {post.author.handle ? `@${post.author.handle} · ` : ""}
              {timeAgo(post.publishedAt)}
            </p>
          </div>
        </div>

        {post.title ? (
          <h3 className="mt-4 text-xl font-black tracking-tight text-ink-900">
            <Link href={href} className="transition-colors hover:text-brand-700">
              {post.title}
            </Link>
          </h3>
        ) : null}

        {post.text.trim() ? (
          <p
            className={cn(
              "text-[13.5px] leading-relaxed text-ink-600",
              post.title ? "mt-1.5" : "mt-4",
            )}
          >
            {truncate(post.text, 230)}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
          <div className="flex items-center gap-4 text-[11.5px] font-bold text-ink-400">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="heart" size={14} /> {compactNumber(post.likeCount)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="message" size={14} /> {compactNumber(post.commentCount)}
            </span>
            {post.viewCount > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="eye" size={14} /> {compactNumber(post.viewCount)}
              </span>
            ) : null}
          </div>

          <Link
            href={href}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3.5 py-2 text-[11.5px] font-extrabold text-brand-700 transition-colors hover:bg-brand-100"
          >
            Read post
            <Icon name="arrow-right" size={13} />
          </Link>
        </div>
      </div>
    </article>
  );
}

function CompactPost({ post, index }: { post: PostView; index: number }) {
  const meta = metaFor(post.type);
  const cover = post.images[0] ?? null;
  const title = post.title || post.text;

  return (
    <Link
      href={`/post/${post.id}`}
      className="animate-fade-up group flex items-stretch gap-3.5 overflow-hidden rounded-2xl bg-white p-3 shadow-md ring-1 ring-ink-100 transition-all hover:-translate-y-0.5 hover:shadow-lg"
      style={{ animationDelay: `${120 + index * 60}ms` }}
    >
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt=""
          loading="lazy"
          className="size-24 flex-none rounded-xl object-cover sm:size-[104px]"
        />
      ) : (
        <div
          className={cn(
            "flex size-24 flex-none items-center justify-center rounded-xl bg-gradient-to-br text-white sm:size-[104px]",
            meta.tile,
          )}
        >
          <Icon name={meta.icon} size={30} />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col justify-center py-0.5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-chip px-2 py-0.5 text-[9.5px] font-black tracking-[0.1em] uppercase",
              meta.chip,
            )}
          >
            <Icon name={meta.icon} size={10} strokeWidth={2.8} />
            {meta.label}
          </span>
          <span className="truncate text-[10.5px] font-semibold text-ink-400">
            {timeAgo(post.publishedAt)}
          </span>
        </div>

        <h3 className="mt-1.5 line-clamp-2 text-[13.5px] leading-snug font-extrabold text-ink-900 transition-colors group-hover:text-brand-700">
          {truncate(title, 110)}
        </h3>

        <div className="mt-2 flex items-center gap-2">
          <Avatar
            name={post.author.name}
            src={post.author.avatarId ? `/api/media/${post.author.avatarId}` : null}
            size="xs"
          />
          <span className="truncate text-[11px] font-bold text-ink-500">{post.author.name}</span>
          {post.author.verified ? <VerifiedTick /> : null}
          <span className="ml-auto inline-flex flex-none items-center gap-1 text-[10.5px] font-bold text-ink-400">
            <Icon name="heart" size={12} /> {compactNumber(post.likeCount)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function EmptyLatest() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-brand-100 bg-white/80 p-8 text-center shadow-lift backdrop-blur-sm sm:p-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -right-20 size-56 rounded-full bg-brand-500/10 blur-3xl"
      />
      <span className="relative mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-lg">
        <Icon name="bell" size={26} />
      </span>
      <h3 className="relative mt-5 text-xl font-black tracking-tight text-ink-900">
        The teacher feed starts here.
      </h3>
      <p className="relative mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-ink-500">
        Lessons, announcements and class updates from verified teachers will appear here. Are you a
        teacher? Publish your first post and reach students across Sri Lanka.
      </p>
      <div className="relative mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/register/teacher"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-500 to-accent-500 px-5 py-2.5 text-[12.5px] font-bold text-white shadow-md transition-transform hover:-translate-y-0.5"
        >
          Join as a teacher
          <Icon name="arrow-right" size={14} />
        </Link>
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-5 py-2.5 text-[12.5px] font-bold text-ink-600 transition-colors hover:border-brand-300 hover:text-brand-700"
        >
          Explore teachers
        </Link>
      </div>
    </div>
  );
}
