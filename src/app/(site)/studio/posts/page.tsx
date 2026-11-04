import { MyPostsList, type MyPost } from "@/components/studio/MyPostsList";
import { PostComposer } from "@/components/studio/PostComposer";
import { EmptyState, SectionHeader } from "@/components/ui/primitives";
import { getCurrentUser } from "@/lib/auth";
import { getTaxonomy } from "@/lib/data";
import { db } from "@/lib/db";

export default async function StudioPostsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [taxonomy, posts] = await Promise.all([
    getTaxonomy(),
    db.post.findMany({
      where: { authorId: user.id },
      orderBy: { publishedAt: "desc" },
      take: 50,
      select: {
        id: true,
        type: true,
        title: true,
        text: true,
        publishedAt: true,
        visibility: true,
        likeCount: true,
        commentCount: true,
        viewCount: true,
      },
    }),
  ]);

  const myPosts: MyPost[] = posts.map((p) => ({
    ...p,
    publishedAt: p.publishedAt.toISOString(),
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,380px)]">
      <div className="lg:order-2">
        <div className="lg:sticky lg:top-20">
          <PostComposer
            subjects={taxonomy.subjects.map((s) => ({ id: s.id, name: s.name }))}
            grades={taxonomy.grades.map((g) => ({ id: g.id, name: g.name }))}
          />
        </div>
      </div>

      <div className="lg:order-1">
        <SectionHeader
          title="Your posts"
          subtitle={`${myPosts.length} post${myPosts.length === 1 ? "" : "s"} total`}
        />
        {myPosts.length > 0 ? (
          <MyPostsList posts={myPosts} />
        ) : (
          <EmptyState
            icon="pencil"
            title="Nothing published yet"
            description="Use the composer to publish your first lesson, announcement or reel."
          />
        )}
      </div>
    </div>
  );
}
