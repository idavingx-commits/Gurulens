import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ReportButton } from "@/components/moderation/ReportButton";
import { PostCard } from "@/components/post/PostCard";
import { QuizCard } from "@/components/quiz/QuizCard";
import { ClaimCodeForm } from "@/components/teacher/ClaimCodeForm";
import { FollowButton } from "@/components/teacher/FollowButton";
import { ReviewForm } from "@/components/teacher/ReviewForm";
import { RatingSummary, ReviewItem } from "@/components/teacher/Reviews";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icons";
import { CopyButton } from "@/components/ui/interactive";
import { Badge, EmptyState, InfoNote, Stat, VerifiedTick } from "@/components/ui/primitives";
import { getCurrentUser } from "@/lib/auth";
import { getTeacherPageData } from "@/lib/data";
import { db } from "@/lib/db";
import { compactNumber, formatDate, timeAgo } from "@/lib/format";
import { ratingBuckets } from "@/lib/ranking";

type Params = Promise<{ handle: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { handle } = await params;
  const profile = await db.teacherProfile.findUnique({
    where: { handle },
    select: {
      tagline: true,
      bio: true,
      verifiedStatus: true,
      user: { select: { name: true } },
    },
  });
  if (!profile) return { title: "Teacher not found" };
  const name = profile.user.name;
  return {
    title: `${name} — Teacher profile`,
    description:
      profile.tagline ??
      profile.bio?.slice(0, 150) ??
      `View ${name}'s classes, reviews, videos and quizzes on GuruLens.`,
  };
}

const TABS = [
  { key: "about", label: "About", icon: "user" },
  { key: "posts", label: "Posts", icon: "pencil" },
  { key: "reels", label: "Reels", icon: "film" },
  { key: "videos", label: "Videos", icon: "video" },
  { key: "quizzes", label: "Quizzes", icon: "target" },
  { key: "reviews", label: "Reviews", icon: "star" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const MODE_LABEL: Record<string, string> = {
  physical: "Physical classes",
  online: "Online classes",
  both: "Online + Physical",
};

export default async function TeacherProfilePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [{ handle }, sp, user] = await Promise.all([params, searchParams, getCurrentUser()]);
  const data = await getTeacherPageData(handle, user?.id ?? null);
  if (!data) notFound();

  const {
    profile,
    postViews,
    quizzes,
    badges,
    reviews,
    reviewAgg,
    stars,
    followerCount,
    isFollowing,
    attemptCount,
    isSelf,
    viewerEligibility,
    viewerReview,
  } = data;

  const tabRaw = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const tab: TabKey = TABS.some((t) => t.key === tabRaw) ? (tabRaw as TabKey) : "about";

  const avatarSrc = profile.user.avatarKey ? `/api/media/${profile.user.avatarKey}` : null;
  const coverSrc = profile.coverKey ? `/api/media/${profile.coverKey}` : null;
  const avgStars = reviewAgg._avg.stars;
  const reviewCount = reviewAgg._count._all;
  const buckets = ratingBuckets(stars);

  const feedPosts = postViews.filter((p) => !["reel", "video"].includes(p.type));
  const reels = postViews.filter((p) => p.type === "reel");
  const videos = postViews.filter((p) => p.type === "video");

  const tabs = TABS.map((t) => ({
    ...t,
    count:
      t.key === "posts"
        ? feedPosts.length
        : t.key === "reels"
          ? reels.length
          : t.key === "videos"
            ? videos.length
            : t.key === "quizzes"
              ? quizzes.length
              : t.key === "reviews"
                ? reviewCount
                : null,
  }));

  return (
    <div className="relative isolate mx-auto w-full max-w-5xl px-4 pt-6 sm:px-6">
      {/* Background blobs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10">
        <div className="animate-float-slow absolute -top-40 right-[10%] size-[30rem] rounded-full bg-brand-400/12 blur-3xl" />
        <div className="animate-float-slower absolute top-96 -left-40 size-[32rem] rounded-full bg-accent-500/8 blur-3xl" />
      </div>

      {/* Cover */}
      <div className="animate-fade-up relative h-44 overflow-hidden rounded-card bg-gradient-to-br from-ink-900 via-brand-800 to-accent-600 sm:h-60">
        {coverSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/40 to-transparent" />
      </div>

      {/* Header */}
      <div className="glass-strong animate-fade-up -mt-16 rounded-card p-5 sm:-mt-20 sm:p-6" style={{ animationDelay: "50ms" }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          <Avatar name={profile.user.name} src={avatarSrc} size="2xl" ring className="-mt-14 sm:-mt-16" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl">
                {profile.user.name}
              </h1>
              {profile.verifiedStatus === "verified" ? <VerifiedTick className="size-5" live /> : null}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-ink-400">
              <span className="font-semibold">@{profile.handle}</span>
              <span>·</span>
              <span>Joined {formatDate(profile.createdAt)}</span>
              {attemptCount > 0 ? (
                <>
                  <span>·</span>
                  <span>{compactNumber(attemptCount)} quiz attempts</span>
                </>
              ) : null}
            </div>
            {profile.tagline ? (
              <p className="mt-1.5 text-[14px] font-semibold text-ink-600">{profile.tagline}</p>
            ) : null}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-chip bg-ink-100 px-2.5 py-1 text-[11.5px] font-bold text-ink-600">
                <Icon name="star" size={12} className="text-warn-500" />
                {avgStars !== null && reviewCount > 0 ? `${avgStars.toFixed(1)} rating` : "New teacher"}
                {reviewCount > 0 ? ` · ${reviewCount} review${reviewCount === 1 ? "" : "s"}` : ""}
              </span>
              {profile.verifiedStatus === "verified" && profile.verifiedAt ? (
                <span className="inline-flex items-center gap-1.5 rounded-chip bg-success-100 px-2.5 py-1 text-[11.5px] font-bold text-success-600">
                  <Icon name="shield-check" size={12} />
                  Verified {formatDate(profile.verifiedAt)}
                </span>
              ) : null}
              {badges.slice(0, 2).map((g) => (
                <span
                  key={g.id}
                  title={g.badge.description}
                  className="inline-flex items-center gap-1.5 rounded-chip bg-accent-100 px-2.5 py-1 text-[11.5px] font-bold text-accent-700"
                >
                  <Icon name="award" size={12} />
                  {g.badge.name}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-none flex-col items-stretch gap-2 sm:items-end">
            {isSelf ? (
              <span className="inline-flex items-center justify-center gap-2 rounded-chip border border-ink-200 bg-white/70 px-4 py-2.5 text-[13px] font-bold text-ink-500">
                This is your public profile
              </span>
            ) : (
              <FollowButton
                handle={profile.handle}
                initialFollowing={isFollowing}
                initialCount={followerCount}
                isAuthenticated={user !== null}
              />
            )}
            <CopyButton text={`/teacher/${profile.handle}`} label="Share profile" />
            {!isSelf && user ? (
              <ReportButton targetType="user" targetId={profile.userId} className="justify-center" />
            ) : null}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="Rating"
            value={avgStars !== null && reviewCount > 0 ? avgStars.toFixed(1) : "—"}
            icon="star"
            hint={`${reviewCount} verified review${reviewCount === 1 ? "" : "s"}`}
          />
          <Stat label="Followers" value={compactNumber(followerCount)} icon="users" hint="Students following" />
          <Stat
            label="Experience"
            value={profile.experienceYears ? `${profile.experienceYears} yr` : "—"}
            icon="clock"
            hint="Teaching experience"
          />
          <Stat
            label="Lessons"
            value={compactNumber(postViews.length)}
            icon="book"
            hint="Posts, videos & reels"
          />
        </div>

        {/* Meta chips */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {profile.subjects.map((s) => (
            <Link
              key={s.subject.id}
              href={`/explore?subject=${s.subject.slug}`}
              className="rounded-chip bg-brand-50 px-3 py-1.5 text-[12px] font-bold text-brand-700 transition-colors hover:bg-brand-100"
            >
              {s.subject.name}
              {s.subject.nameSi ? (
                <span lang="si" className="font-si">
                  {" "}
                  · {s.subject.nameSi}
                </span>
              ) : null}
            </Link>
          ))}
          {profile.grades.map((g) => (
            <span key={g.grade.id} className="rounded-chip bg-ink-100 px-3 py-1.5 text-[12px] font-semibold text-ink-600">
              {g.grade.name}
            </span>
          ))}
          <span className="rounded-chip bg-accent-100 px-3 py-1.5 text-[12px] font-bold text-accent-700">
            {MODE_LABEL[profile.mode] ?? profile.mode}
          </span>
          {profile.languages.map((l) => (
            <span key={l.language.id} className="rounded-chip border border-ink-200 bg-white/60 px-3 py-1.5 text-[12px] font-semibold text-ink-600">
              {l.language.name}
            </span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <nav className="mt-5 flex gap-1 overflow-x-auto border-b border-ink-100 pb-px" aria-label="Profile sections">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <Link
              key={t.key}
              href={`/teacher/${profile.handle}${t.key === "about" ? "" : `?tab=${t.key}`}`}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "flex flex-none items-center gap-1.5 rounded-t-xl border-b-2 border-brand-500 px-3.5 py-2.5 text-[13.5px] font-bold text-brand-700"
                  : "flex flex-none items-center gap-1.5 rounded-t-xl border-b-2 border-transparent px-3.5 py-2.5 text-[13.5px] font-semibold text-ink-400 transition-colors hover:text-ink-700"
              }
            >
              <Icon name={t.icon} size={14} />
              {t.label}
              {t.count !== null && t.count > 0 ? (
                <span className={active ? "text-brand-400" : "text-ink-300"}>{t.count}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="reveal py-6 pb-10">
        {tab === "about" ? (
          <AboutTab
            bio={profile.bio}
            qualifications={profile.qualifications}
            mode={profile.mode}
            experienceYears={profile.experienceYears}
            districts={profile.districts.map((d) => d.district.name)}
            grades={profile.grades.map((g) => g.grade.name)}
            languages={profile.languages.map((l) => l.language.name)}
            subjects={profile.subjects.map((s) => ({
              name: s.subject.name,
              nameSi: s.subject.nameSi,
              slug: s.subject.slug,
            }))}
            badges={badges.map((b) => ({
              id: b.id,
              name: b.badge.name,
              description: b.badge.description,
            }))}
            verified={profile.verifiedStatus === "verified"}
            postsCount={postViews.length}
            quizzesCount={quizzes.length}
          />
        ) : null}

        {tab === "posts" ? (
          feedPosts.length > 0 ? (
            <div className="mx-auto max-w-2xl space-y-5">
              {feedPosts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="pencil"
              title="No posts yet"
              description="This teacher hasn't published any posts. Follow to be notified when lessons go live."
            />
          )
        ) : null}

        {tab === "reels" ? (
          reels.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {reels.map((r) => (
                <div key={r.id} className="card group overflow-hidden">
                  {r.video ? (
                    <video
                      controls
                      playsInline
                      preload="metadata"
                      src={r.video.url}
                      className="aspect-[9/16] w-full bg-ink-900 object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[9/16] items-center justify-center bg-ink-900 text-white/40">
                      <Icon name="film" size={28} />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="line-clamp-2 text-[12.5px] font-semibold text-ink-700">{r.text}</p>
                    <p className="mt-1 text-[11px] text-ink-400">{timeAgo(r.publishedAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="film" title="No reels yet" description="Short lesson clips will appear here." />
          )
        ) : null}

        {tab === "videos" ? (
          videos.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {videos.map((v) => (
                <div key={v.id} className="card overflow-hidden">
                  {v.video ? (
                    <video
                      controls
                      playsInline
                      preload="metadata"
                      src={v.video.url}
                      className="aspect-video w-full bg-ink-900"
                    />
                  ) : null}
                  <div className="p-4">
                    <h3 className="text-[14px] font-bold text-ink-900">{v.title ?? "Lesson recording"}</h3>
                    <p className="mt-1 line-clamp-2 text-[12.5px] text-ink-500">{v.text}</p>
                    <div className="mt-2 flex items-center gap-3 text-[11.5px] font-semibold text-ink-400">
                      <span className="inline-flex items-center gap-1">
                        <Icon name="eye" size={12} />
                        {compactNumber(v.viewCount)} views
                      </span>
                      <span>{timeAgo(v.publishedAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="video"
              title="No videos yet"
              description="Full lesson recordings and paper discussions will appear here."
            />
          )
        ) : null}

        {tab === "quizzes" ? (
          quizzes.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {quizzes.map((q) => (
                <QuizCard key={q.id} quiz={q} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="target"
              title="No quizzes yet"
              description="Self-check quizzes posted by this teacher will appear here."
            />
          )
        ) : null}

        {tab === "reviews" ? (
          <div className="space-y-5">
            <RatingSummary
              avgStars={avgStars}
              reviewCount={reviewCount}
              clarity={reviewAgg._avg.clarity}
              support={reviewAgg._avg.support}
              organization={reviewAgg._avg.organization}
              buckets={buckets}
            />

            {user && !isSelf ? (
              viewerReview && viewerReview.status === "published" ? (
                <ReviewForm
                  teacherId={profile.userId}
                  teacherName={profile.user.name.split(" ")[0] ?? profile.user.name}
                  initial={{
                    reviewId: viewerReview.id,
                    stars: viewerReview.stars,
                    clarity: viewerReview.clarity,
                    support: viewerReview.support,
                    organization: viewerReview.organization,
                    feedback: viewerReview.feedback,
                  }}
                />
              ) : viewerEligibility && viewerEligibility.status !== "revoked" ? (
                <ReviewForm
                  teacherId={profile.userId}
                  teacherName={profile.user.name.split(" ")[0] ?? profile.user.name}
                />
              ) : (
                <ClaimCodeForm teacherName={profile.user.name} />
              )
            ) : null}

            {!user ? (
              <InfoNote icon="lock">
                <Link
                  href={`/login?next=${encodeURIComponent(`/teacher/${handle}?tab=reviews`)}`}
                  className="font-bold text-brand-700 hover:underline"
                >
                  Log in
                </Link>{" "}
                as a verified student to leave a review for this teacher.
              </InfoNote>
            ) : null}

            <InfoNote icon="shield-check">
              Only students verified through this teacher&apos;s enrollment codes can review. Reviews are
              never edited by GuruLens — teachers may publish one public reply.
            </InfoNote>

            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((r) => (
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
                description="Verified students can leave the first review for this teacher."
              />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AboutTab({
  bio,
  qualifications,
  mode,
  experienceYears,
  districts,
  grades,
  languages,
  subjects,
  badges,
  verified,
  postsCount,
  quizzesCount,
}: {
  bio: string | null;
  qualifications: string | null;
  mode: string;
  experienceYears: number | null;
  districts: string[];
  grades: string[];
  languages: string[];
  subjects: { name: string; nameSi: string | null; slug: string }[];
  badges: { id: string; name: string; description: string }[];
  verified: boolean;
  postsCount: number;
  quizzesCount: number;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <section className="card p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-ink-900">
            <Icon name="user" size={16} className="text-brand-600" />
            About
          </h2>
          {bio ? (
            <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-ink-700">{bio}</p>
          ) : (
            <p className="mt-3 text-[14px] text-ink-400">No bio added yet.</p>
          )}
          {qualifications ? (
            <div className="mt-4 rounded-2xl bg-ink-50/80 p-4">
              <div className="flex items-center gap-1.5 text-[11.5px] font-bold tracking-wide text-ink-400 uppercase">
                <Icon name="award" size={13} />
                Qualifications
              </div>
              <p className="mt-1 text-[13.5px] font-semibold text-ink-700">{qualifications}</p>
            </div>
          ) : null}
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-ink-900">
            <Icon name="book" size={16} className="text-brand-600" />
            Subjects taught
          </h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {subjects.map((s) => (
              <Link
                key={s.slug}
                href={`/explore?subject=${s.slug}`}
                className="rounded-chip bg-brand-50 px-3 py-1.5 text-[12.5px] font-bold text-brand-700 transition-colors hover:bg-brand-100"
              >
                {s.name}
                {s.nameSi ? <span className="ml-1 font-semibold text-brand-500">{s.nameSi}</span> : null}
              </Link>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-ink-100 p-3.5">
              <div className="text-[11px] font-bold tracking-wide text-ink-400 uppercase">Grades</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {grades.map((g) => (
                  <span key={g} className="rounded-chip bg-ink-100 px-2.5 py-1 text-[11.5px] font-semibold text-ink-600">
                    {g}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-ink-100 p-3.5">
              <div className="text-[11px] font-bold tracking-wide text-ink-400 uppercase">Medium</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {languages.map((l) => (
                  <span key={l} className="rounded-chip bg-ink-100 px-2.5 py-1 text-[11.5px] font-semibold text-ink-600">
                    {l}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="space-y-5">
        <section className="glass rounded-card p-5">
          <h2 className="flex items-center gap-2 text-[14px] font-extrabold text-ink-900">
            <Icon name="globe" size={15} className="text-brand-600" />
            Teaching details
          </h2>
          <dl className="mt-3 space-y-2.5 text-[13px]">
            <div className="flex items-center justify-between gap-3">
              <dt className="font-semibold text-ink-400">Mode</dt>
              <dd className="font-bold text-ink-800">{MODE_LABEL[mode] ?? mode}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="font-semibold text-ink-400">Experience</dt>
              <dd className="font-bold text-ink-800">
                {experienceYears ? `${experienceYears} years` : "—"}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="font-semibold text-ink-400">Districts</dt>
              <dd className="text-right font-bold text-ink-800">{districts.join(", ")}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="font-semibold text-ink-400">Lessons</dt>
              <dd className="font-bold text-ink-800">{postsCount}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="font-semibold text-ink-400">Quizzes</dt>
              <dd className="font-bold text-ink-800">{quizzesCount}</dd>
            </div>
          </dl>
        </section>

        <section className="glass rounded-card p-5">
          <h2 className="flex items-center gap-2 text-[14px] font-extrabold text-ink-900">
            <Icon name="shield-check" size={15} className="text-success-600" />
            Trust & badges
          </h2>
          <div className="mt-3 space-y-2">
            {verified ? (
              <div className="flex items-start gap-2.5 rounded-2xl bg-success-100/70 p-3">
                <VerifiedTick title="Verified" />
                <div>
                  <div className="text-[13px] font-bold text-success-600">
                    Identity & qualifications verified
                  </div>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-ink-500">
                    Documents were reviewed by the GuruLens team.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 rounded-2xl bg-ink-100/80 p-3">
                <Icon name="info" size={16} className="mt-0.5 text-ink-400" />
                <p className="text-[12px] leading-relaxed text-ink-500">
                  Verification is pending or not requested yet — check the reviews before enrolling.
                </p>
              </div>
            )}
            {badges.map((b) => (
              <div key={b.id} className="flex items-start gap-2.5 rounded-2xl bg-accent-100/60 p-3">
                <Icon name="award" size={16} className="mt-0.5 text-accent-700" />
                <div>
                  <div className="text-[13px] font-bold text-accent-700">{b.name}</div>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-ink-500">{b.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Badge tone="brand" className="w-full justify-center py-2">
          Ranking is based on verified reviews only
        </Badge>
      </div>
    </div>
  );
}
