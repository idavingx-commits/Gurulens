import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CommentsSection, type CommentJson } from "@/components/post/CommentsSection";
import { PostCard } from "@/components/post/PostCard";
import { ReportButton } from "@/components/moderation/ReportButton";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icons";
import { VerifiedTick } from "@/components/ui/primitives";
import { getAuth } from "@/lib/auth";
import { hydratePosts, POST_INCLUDE } from "@/lib/data";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const post = await db.post.findUnique({
    where: { id },
    select: { title: true, text: true, author: { select: { name: true } } },
  });
  if (!post) return { title: "Post not found" };
  const title = post.title ?? post.text.slice(0, 60);
  return { title: `${title} — ${post.author.name}`, description: post.text.slice(0, 150) };
}

export default async function PostDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const auth = await getAuth();
  const viewerId = auth?.user.id ?? null;

  const post = await db.post.findUnique({ where: { id }, ...POST_INCLUDE });
  if (!post || post.moderationStatus !== "approved") notFound();

  if (post.visibility === "members" && viewerId !== post.authorId) {
    let allowed = false;
    if (viewerId) {
      const membership = await db.membership.findFirst({
        where: { memberId: viewerId, status: "active", tier: { teacherId: post.authorId } },
      });
      allowed = membership !== null;
    }
    if (!allowed) {
      return (
        <div className="mx-auto w-full max-w-2xl px-4 pt-16 pb-10 text-center sm:px-6">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-accent-100 text-accent-700">
            <Icon name="crown" size={26} />
          </span>
          <h1 className="mt-4 text-xl font-extrabold text-ink-900">Members-only post</h1>
          <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-ink-500">
            This post is available to supporters of {post.author.name}. Visit their profile to join
            the supporter tier — no payment is taken at launch.
          </p>
        </div>
      );
    }
  }

  const [view] = await hydratePosts([post], viewerId);

  const rawComments = await db.comment.findMany({
    where: { postId: id, moderationStatus: "approved" },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: { author: { select: { id: true, name: true, avatarKey: true, role: true } } },
  });

  const initialComments: CommentJson[] = rawComments.map((c) => ({
    id: c.id,
    text: c.text,
    createdAt: c.createdAt.toISOString(),
    author: {
      id: c.author.id,
      name: c.author.name,
      avatarId: c.author.avatarKey,
      role: c.author.role,
    },
  }));

  const profile = await db.teacherProfile.findUnique({
    where: { userId: post.authorId },
    select: { handle: true, verifiedStatus: true, tagline: true },
  });

  return (
    <div className="relative isolate mx-auto w-full max-w-2xl px-4 pt-6 pb-10 sm:px-6">
      {/* Background blob */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10">
        <div className="animate-float-slow absolute -top-40 -right-32 size-[26rem] rounded-full bg-brand-400/10 blur-3xl" />
      </div>

      <Link
        href="/feed"
        className="animate-fade-up mb-4 inline-flex items-center gap-1.5 rounded-chip px-2.5 py-1.5 text-[13px] font-bold text-ink-400 transition-colors hover:bg-ink-100/70 hover:text-ink-700"
      >
        <Icon name="chevron-left" size={14} strokeWidth={2.4} />
        Back to feed
      </Link>

      <div className="animate-fade-up" style={{ animationDelay: "50ms" }}>
        <PostCard post={view!} />
      </div>

      {profile ? (
        <div className="reveal glass mt-5 flex items-center justify-between gap-4 rounded-card p-4">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar
              name={post.author.name}
              src={post.author.avatarKey ? `/api/media/${post.author.avatarKey}` : null}
              size="md"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Link
                  href={`/teacher/${profile.handle}`}
                  className="truncate text-[14px] font-bold text-ink-900 hover:text-brand-700"
                >
                  {post.author.name}
                </Link>
                {profile.verifiedStatus === "verified" ? <VerifiedTick /> : null}
              </div>
              {profile.tagline ? (
                <p className="truncate text-[12.5px] text-ink-500">{profile.tagline}</p>
              ) : null}
            </div>
          </div>
          <Link
            href={`/teacher/${profile.handle}`}
            className="flex-none rounded-chip bg-brand-50 px-3.5 py-2 text-[12.5px] font-bold text-brand-700 transition-colors hover:bg-brand-100"
          >
            View profile
          </Link>
        </div>
      ) : null}

      <p className="mt-3 flex items-center justify-center gap-2 text-center text-[11.5px] text-ink-300">
        Published {formatDate(post.publishedAt)}
        {auth && viewerId !== post.authorId ? (
          <>
            <span aria-hidden="true">·</span>
            <ReportButton targetType="post" targetId={post.id} />
          </>
        ) : null}
      </p>

      <div className="mt-5">
        <CommentsSection
          postId={post.id}
          postAuthorId={post.authorId}
          viewer={
            auth
              ? {
                  id: auth.user.id,
                  name: auth.user.name,
                  avatarId: auth.user.avatarKey,
                  role: auth.user.role,
                }
              : null
          }
          initialComments={initialComments}
        />
      </div>
    </div>
  );
}
