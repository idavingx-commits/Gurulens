import Link from "next/link";

import { ReviewItem } from "@/components/teacher/Reviews";
import { LinkButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { EmptyState, InfoNote, SectionHeader, Stat } from "@/components/ui/primitives";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { compactNumber, timeAgo } from "@/lib/format";

export default async function StudioOverviewPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const profile = await db.teacherProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, handle: true, verifiedStatus: true, consentPublic: true },
  });
  if (!profile) return null;

  const [followers, reviewAgg, postCount, quizCount, attemptCount, openRequest, memberCount, codeCount] =
    await Promise.all([
      db.follow.count({ where: { teacherId: user.id } }),
      db.review.aggregate({
        where: { teacherId: user.id, status: "published" },
        _avg: { stars: true },
        _count: { _all: true },
      }),
      db.post.count({ where: { authorId: user.id, moderationStatus: "approved" } }),
      db.quiz.count({ where: { teacherId: user.id } }),
      db.quizAttempt.count({ where: { quiz: { teacherId: user.id } } }),
      db.verificationRequest.findFirst({
        where: { teacherId: user.id, status: { in: ["pending", "in_review", "more_info"] } },
        orderBy: { createdAt: "desc" },
        select: { status: true, createdAt: true },
      }),
      db.membership.count({ where: { tier: { teacherId: user.id }, status: "active" } }),
      db.enrollmentCode.count({ where: { teacherId: user.id } }),
    ]);

  const recentReviews = await db.review.findMany({
    where: { teacherId: user.id, status: "published" },
    orderBy: { createdAt: "desc" },
    take: 2,
    include: { author: { select: { id: true, name: true, avatarKey: true } } },
  });

  const latestComments = await db.comment.findMany({
    where: { post: { authorId: user.id }, moderationStatus: "approved" },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: {
      author: { select: { name: true, avatarKey: true } },
      post: { select: { id: true, text: true } },
    },
  });

  return (
    <div className="space-y-8">
      {profile.verifiedStatus === "verified" ? null : openRequest ? (
        <InfoNote icon="clock" tone="warn">
          Verification request is <strong className="font-bold capitalize">{openRequest.status.replace("_", " ")}</strong>{" "}
          — submitted {timeAgo(openRequest.createdAt)}.{" "}
          <Link href="/studio/verification" className="font-bold text-warn-600 hover:underline">
            View status
          </Link>
        </InfoNote>
      ) : (
        <InfoNote icon="shield-check">
          Get the <strong className="font-bold">Verified Teacher</strong> badge to build trust and rank
          higher in Explore.{" "}
          <Link href="/studio/verification" className="font-bold text-brand-700 hover:underline">
            Request verification
          </Link>
        </InfoNote>
      )}

      {!profile.consentPublic ? (
        <InfoNote icon="alert" tone="danger">
          Your public profile is currently hidden, so students cannot find you or see your posts.{" "}
          <Link href="/settings" className="font-bold text-danger-600 hover:underline">
            Enable the public profile
          </Link>{" "}
          in Settings to go live.
        </InfoNote>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Followers" value={compactNumber(followers)} icon="users" />
        <Stat
          label="Avg rating"
          value={reviewAgg._avg.stars !== null ? reviewAgg._avg.stars.toFixed(1) : "—"}
          icon="star"
          hint={`${reviewAgg._count._all} reviews`}
        />
        <Stat label="Posts" value={postCount} icon="pencil" />
        <Stat label="Quizzes" value={quizCount} icon="target" hint={`${attemptCount} attempts`} />
        <Stat label="Members" value={memberCount} icon="crown" />
        <Stat label="Codes" value={codeCount} icon="key" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/studio/posts"
          className="card group flex items-center gap-4 p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift"
        >
          <span className="flex size-11 flex-none items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <Icon name="plus" size={20} strokeWidth={2.4} />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-extrabold text-ink-900 group-hover:text-brand-700">
              Publish a new post
            </p>
            <p className="text-[12.5px] text-ink-500">
              Lesson notes, announcements, photos, reels or videos.
            </p>
          </div>
        </Link>
        <Link
          href="/studio/quizzes"
          className="card group flex items-center gap-4 p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift"
        >
          <span className="flex size-11 flex-none items-center justify-center rounded-2xl bg-accent-100 text-accent-700">
            <Icon name="target" size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-extrabold text-ink-900 group-hover:text-accent-700">
              Create a quiz
            </p>
            <p className="text-[12.5px] text-ink-500">
              Self-check quizzes with instant scores and explanations.
            </p>
          </div>
        </Link>
      </div>

      <section>
        <SectionHeader
          title="Latest reviews"
          action={
            <LinkButton href={`/teacher/${profile.handle}?tab=reviews`} variant="outline" size="sm">
              View all
            </LinkButton>
          }
        />
        {recentReviews.length > 0 ? (
          <div className="space-y-3">
            {recentReviews.map((r) => (
              <ReviewItem
                key={r.id}
                review={{
                  id: r.id,
                  stars: r.stars,
                  clarity: r.clarity,
                  support: r.support,
                  organization: r.organization,
                  feedback: r.feedback,
                  createdAt: r.createdAt,
                  teacherReply: r.teacherReply,
                  author: r.author,
                }}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="star-outline"
            title="No reviews yet"
            description="Share enrollment codes with your students so they can verify and review your classes."
            action={
              <LinkButton href="/studio/audience" size="sm">
                Manage enrollment codes
              </LinkButton>
            }
          />
        )}
      </section>

      <section>
        <SectionHeader title="Latest comments" subtitle="Conversations on your posts." />
        {latestComments.length > 0 ? (
          <div className="space-y-2.5">
            {latestComments.map((c) => (
              <Link
                key={c.id}
                href={`/post/${c.post.id}`}
                className="card block p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift"
              >
                <p className="line-clamp-1 text-[12px] font-semibold text-ink-400">
                  on “{c.post.text.slice(0, 70)}”
                </p>
                <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-700">
                  <span className="font-bold text-ink-900">{c.author.name}:</span> {c.text}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-ink-300">{timeAgo(c.createdAt)}</p>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="message"
            title="No comments yet"
            description="Post a lesson update and your students' questions will appear here."
          />
        )}
      </section>
    </div>
  );
}
