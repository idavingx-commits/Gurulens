import type { Metadata } from "next";
import Link from "next/link";

import { ReelViewer, type ReelData } from "@/components/reel/ReelViewer";
import { Icon } from "@/components/ui/icons";
import { getCurrentUser } from "@/lib/auth";
import { hydratePosts, POST_INCLUDE } from "@/lib/data";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  alternates: { canonical: "/reels" },
  title: "Reels",
  description: "Short lesson clips and quick tips from GuruLens teachers.",
};

export default async function ReelsPage() {
  const user = await getCurrentUser();

  const posts = await db.post.findMany({
    where: {
      type: "reel",
      moderationStatus: "approved",
      visibility: "public",
      videoId: { not: null },
      author: { status: "active" },
    },
    orderBy: { publishedAt: "desc" },
    take: 60,
    ...POST_INCLUDE,
  });

  // Hydrate posts with media, reactions, saves
  const views = await hydratePosts(posts, user?.id ?? null);

  // Transform to ReelData format (only posts with videos)
  const reels: ReelData[] = views
    .filter((v) => v.video !== null)
    .map((v) => ({
      id: v.id,
      text: v.text ?? "",
      videoUrl: v.video!.url,
      likeCount: v.likeCount,
      viewCount: v.viewCount,
      commentCount: v.commentCount,
      isLiked: v.likedByMe,
      isSaved: v.savedByMe,
      author: {
        name: v.author.name,
        avatarId: v.author.avatarId,
        handle: v.author.handle,
        verified: v.author.verified,
      },
    }));

  return (
    <div className="relative">
      {/* Back button overlay */}
      <div className="fixed top-4 left-4 z-50 flex items-center gap-3">
        <Link
          href="/"
          className="flex size-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md transition-colors hover:bg-black/50"
          aria-label="Back to home"
        >
          <Icon name="arrow-left" size={20} />
        </Link>
        <h1 className="text-lg font-bold text-white drop-shadow-lg">Reels</h1>
      </div>

      {/* Full screen reel viewer */}
      <ReelViewer reels={reels} />
    </div>
  );
}
