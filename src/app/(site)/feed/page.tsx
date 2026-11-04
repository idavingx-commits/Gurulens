import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PostFeed } from "@/components/post/PostFeed";
import { LinkButton } from "@/components/ui/button";
import { FloatingDecorations } from "@/components/ui/floating-decorations";
import { getCurrentUser } from "@/lib/auth";
import { getFeedPosts } from "@/lib/data";
import { cn } from "@/lib/format";

export const metadata: Metadata = {
  title: "Feed",
  description: "Lesson posts, announcements, reels and videos from teachers you follow.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function FeedPage({ searchParams }: { searchParams: SearchParams }) {
  const [user, sp] = await Promise.all([getCurrentUser(), searchParams]);
  if (!user) redirect("/login?next=/feed");

  const tabRaw = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const scope = tabRaw === "following" ? "following" : "latest";

  const { postViews, nextCursor } = await getFeedPosts({ scope, viewerId: user.id });

  return (
    <div className="relative isolate mx-auto w-full max-w-2xl px-4 pt-10 pb-10 sm:px-6">
      {/* Floating education decorations */}
      <FloatingDecorations variant="default" />
      
      {/* Cinematic background orbs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden">
        <div className="orb orb-brand animate-float-slow absolute -top-48 -right-32 size-[450px]" />
        <div className="orb orb-accent animate-float-slower absolute top-96 -left-48 size-[500px]" />
      </div>

      {/* Page header */}
      <div className="animate-fade-up mb-8">
        <h1 className="text-3xl font-black tracking-tight text-ink-900 sm:text-4xl">Your Feed</h1>
        <p lang="si" className="font-si mt-2 text-[15px] font-semibold text-ink-500">
          ගුරුවරුන්ගේ අලුත්ම පාඩම්, දැන්වීම් සහ videos.
        </p>
      </div>

      {/* Tab bar */}
      <div
        className="animate-fade-up mb-6 flex gap-1 rounded-2xl bg-white/70 p-1.5 shadow-md ring-1 ring-ink-100/50 backdrop-blur-sm"
        style={{ animationDelay: "50ms" }}
      >
        <FeedTab href="/feed" active={scope === "latest"} label="For you" />
        <FeedTab href="/feed?tab=following" active={scope === "following"} label="Following" />
      </div>

      <div className="reveal">
        <PostFeed
          initialPosts={postViews}
          initialCursor={nextCursor}
          scope={scope}
          emptyTitle={scope === "following" ? "Your following feed is quiet" : "No posts yet"}
          emptyDescription={
            scope === "following"
              ? "ගුරුවරුන් follow කරන්න — ඔවුන්ගේ අලුත්ම content මෙහි පෙනෙයි."
              : "ගුරුවරුන් content publish කළ විට මෙහි පෙනෙයි."
          }
        />
      </div>

      {scope === "following" && postViews.length === 0 ? (
        <div className="mt-5 flex justify-center">
          <LinkButton href="/explore" variant="outline" size="sm">
            Find teachers to follow
          </LinkButton>
        </div>
      ) : null}
    </div>
  );
}

function FeedTab({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex-1 rounded-full px-4 py-2.5 text-center text-[13px] font-bold transition-all",
        active
          ? "bg-gradient-to-r from-brand-500 to-accent-500 text-white shadow-lg"
          : "text-ink-500 hover:text-ink-900",
      )}
    >
      {label}
    </Link>
  );
}
