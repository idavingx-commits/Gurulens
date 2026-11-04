import Link from "next/link";

import { PostActions } from "@/components/post/PostActions";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icons";
import { VerifiedTick } from "@/components/ui/primitives";
import type { PostView } from "@/lib/data";
import { cn, compactNumber, timeAgo } from "@/lib/format";

const TYPE_META: Record<string, { label: string; icon: string; className: string }> = {
  post: { label: "Post", icon: "pencil", className: "bg-ink-100 text-ink-600" },
  announcement: { label: "Announcement", icon: "bell", className: "bg-warn-100 text-warn-600" },
  lesson: { label: "Lesson", icon: "book", className: "bg-brand-50 text-brand-700" },
  reel: { label: "Reel", icon: "film", className: "bg-accent-100 text-accent-700" },
  video: { label: "Video", icon: "play", className: "bg-danger-100 text-danger-600" },
};

export function PostCard({ post, className }: { post: PostView; className?: string }) {
  const meta = TYPE_META[post.type] ?? TYPE_META.post!;
  const profileHref = post.author.handle ? `/teacher/${post.author.handle}` : null;

  return (
    <article
      className={cn(
        "card overflow-hidden",
        post.type === "announcement" && "border-warn-500/25",
        className,
      )}
    >
      <div className="p-4 sm:p-5">
        <header className="flex items-start gap-3">
          {profileHref ? (
            <Link href={profileHref} className="flex-none">
              <Avatar
                name={post.author.name}
                src={post.author.avatarId ? `/api/media/${post.author.avatarId}` : null}
                size="md"
              />
            </Link>
          ) : (
            <Avatar
              name={post.author.name}
              src={post.author.avatarId ? `/api/media/${post.author.avatarId}` : null}
              size="md"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              {profileHref ? (
                <Link
                  href={profileHref}
                  className="flex items-center gap-1 text-[14px] font-bold text-ink-900 hover:text-brand-700"
                >
                  {post.author.name}
                  {post.author.verified ? <VerifiedTick /> : null}
                </Link>
              ) : (
                <span className="flex items-center gap-1 text-[14px] font-bold text-ink-900">
                  {post.author.name}
                </span>
              )}
              <span className="text-[12px] text-ink-400">· {timeAgo(post.publishedAt)}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-chip px-2 py-0.5 text-[10.5px] font-bold tracking-wide uppercase",
                  meta.className,
                )}
              >
                <Icon name={meta.icon} size={11} strokeWidth={2.4} />
                {meta.label}
              </span>
              {post.viewCount > 0 ? (
                <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-ink-300">
                  <Icon name="eye" size={12} />
                  {compactNumber(post.viewCount)}
                </span>
              ) : null}
            </div>
          </div>
        </header>

        {post.title ? (
          <h3 className="mt-3.5 text-[15.5px] font-extrabold tracking-tight text-ink-900">{post.title}</h3>
        ) : null}
        <p className={cn("whitespace-pre-line text-[14px] leading-relaxed text-ink-700", post.title ? "mt-1" : "mt-3.5")}>
          {post.text}
        </p>
      </div>

      {post.video ? (
        <div className="bg-ink-900">
          <video
            controls
            playsInline
            preload="metadata"
            src={post.video.url}
            className="mx-auto max-h-[70dvh] w-full"
          />
        </div>
      ) : null}

      {post.images.length > 0 ? (
        <div
          className={cn(
            "grid gap-0.5 px-4 pb-1 sm:px-5",
            post.images.length === 1 ? "grid-cols-1" : post.images.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3",
          )}
        >
          {post.images.slice(0, 6).map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt={`${post.author.name} — attachment ${i + 1}`}
              loading="lazy"
              className={cn(
                "w-full rounded-xl object-cover",
                post.images.length === 1 ? "max-h-[480px]" : "aspect-square",
              )}
            />
          ))}
        </div>
      ) : null}

      <footer className="flex items-center justify-between px-3 py-2.5 sm:px-4">
        <PostActions
          postId={post.id}
          likeCount={post.likeCount}
          commentCount={post.commentCount}
          liked={post.likedByMe}
          saved={post.savedByMe}
        />
        {post.author.handle ? (
          <Link
            href={`/teacher/${post.author.handle}`}
            className="hidden items-center gap-1 rounded-chip px-3 py-1.5 text-[12px] font-bold text-brand-600 transition-colors hover:bg-brand-50 sm:inline-flex"
          >
            View profile
            <Icon name="arrow-right" size={13} strokeWidth={2.4} />
          </Link>
        ) : null}
      </footer>
    </article>
  );
}
