import type { Metadata } from "next";

import { PostCard } from "@/components/post/PostCard";
import { Icon } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/primitives";
import { getCurrentUser } from "@/lib/auth";
import { hydratePosts, POST_INCLUDE } from "@/lib/data";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Saved" };

export default async function SavedPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const saved = await db.savedPost.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: { post: { ...POST_INCLUDE } },
  });

  let posts = saved.map((s) => s.post).filter((p) => p.moderationStatus === "approved");

  const membersOnly = posts.filter((p) => p.visibility === "members" && p.authorId !== user.id);
  if (membersOnly.length > 0) {
    const memberships = await db.membership.findMany({
      where: { memberId: user.id, status: "active" },
      select: { tier: { select: { teacherId: true } } },
    });
    const allowed = new Set(memberships.map((m) => m.tier.teacherId));
    posts = posts.filter((p) => p.visibility === "public" || p.authorId === user.id || allowed.has(p.authorId));
  }

  const views = await hydratePosts(posts, user.id);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-8 pb-6 sm:px-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500 to-brand-500 text-white">
          <Icon name="bookmark" size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Saved</h1>
          <p className="text-[13px] text-ink-500">Posts you bookmarked to revisit later.</p>
        </div>
      </div>

      {views.length > 0 ? (
        <div className="space-y-4">
          {views.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="bookmark"
          title="Nothing saved yet"
          description="Tap the bookmark icon on any post to keep it here for later."
        />
      )}
    </div>
  );
}
