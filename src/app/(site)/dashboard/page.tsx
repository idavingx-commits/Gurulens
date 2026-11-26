import type { Metadata } from "next";
import Link from "next/link";

import { FollowButton } from "@/components/teacher/FollowButton";
import { Avatar } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { EmptyState, SectionHeader, Stat, VerifiedTick } from "@/components/ui/primitives";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLmsWorkspacesForUser } from "@/lib/lms";
import { getUserSubscription } from "@/lib/subscriptions";
import { compactNumber, formatDate, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "My Dashboard" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const firstName = user.name.split(" ")[0] ?? user.name;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-8 pb-8 sm:px-6">
      <div className="mb-6 flex items-center gap-4">
        <Avatar
          name={user.name}
          src={user.avatarKey ? `/api/media/${user.avatarKey}` : null}
          size="lg"
        />
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
            Hi {firstName} 👋
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-500">
            {user.role === "teacher"
              ? "Your teaching hub — reviews, quizzes and audience."
              : user.role === "admin" || user.role === "moderator"
                ? "Moderation and platform health at a glance."
                : "Track your learning, quizzes, reviews and the teachers you follow."}
          </p>
        </div>
      </div>

      {user.role === "teacher" ? <TeacherDashboard userId={user.id} /> : null}
      {user.role === "student" ? <StudentDashboard userId={user.id} /> : null}
      {user.role === "admin" || user.role === "moderator" ? (
        <AdminDashboard role={user.role} />
      ) : null}
    </div>
  );
}

async function StudentDashboard({ userId }: { userId: string }) {
  const [attempts, follows, reviewCount, savedCount] = await Promise.all([
    db.quizAttempt.findMany({
      where: { studentId: userId },
      orderBy: { completedAt: "desc" },
      take: 5,
      include: { quiz: { select: { id: true, title: true } } },
    }),
    db.follow.findMany({
      where: { followerId: userId },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            avatarKey: true,
            teacherProfile: { select: { handle: true, tagline: true, verifiedStatus: true } },
          },
        },
      },
    }),
    db.review.count({ where: { authorId: userId, status: "published" } }),
    db.savedPost.count({ where: { userId } }),
  ]);

  const attemptCount = await db.quizAttempt.count({ where: { studentId: userId } });
  const best = await db.quizAttempt.findFirst({
    where: { studentId: userId },
    orderBy: [{ score: "desc" }, { completedAt: "desc" }],
    select: { score: true, total: true, quiz: { select: { title: true } } },
  });
  const followCount = await db.follow.count({ where: { followerId: userId } });

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Quizzes taken" value={attemptCount} icon="target" />
        <Stat
          label="Best score"
          value={best ? `${best.score}/${best.total}` : "—"}
          icon="award"
          hint={best ? best.quiz.title : "Take your first quiz"}
        />
        <Stat label="Following" value={followCount} icon="users" />
        <Stat label="Reviews written" value={reviewCount} icon="star" hint={`${savedCount} saved posts`} />
      </div>

      <section>
        <SectionHeader
          title="Recent quiz attempts"
          action={
            <LinkButton href="/explore" variant="outline" size="sm">
              Find quizzes
            </LinkButton>
          }
        />
        {attempts.length > 0 ? (
          <div className="space-y-2.5">
            {attempts.map((a) => {
              const pct = Math.round((a.score / Math.max(1, a.total)) * 100);
              return (
                <Link
                  key={a.id}
                  href={`/quiz/${a.quiz.id}`}
                  className="card flex items-center justify-between gap-4 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 flex-none items-center justify-center rounded-2xl bg-accent-100 text-accent-700">
                      <Icon name="target" size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-bold text-ink-900">
                        {a.quiz.title}
                      </p>
                      <p className="text-[11.5px] font-semibold text-ink-400">
                        {timeAgo(a.completedAt)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={
                      pct >= 70
                        ? "rounded-chip bg-success-100 px-2.5 py-1 text-[12px] font-extrabold text-success-600 tabular-nums"
                        : pct >= 40
                          ? "rounded-chip bg-warn-100 px-2.5 py-1 text-[12px] font-extrabold text-warn-600 tabular-nums"
                          : "rounded-chip bg-danger-100 px-2.5 py-1 text-[12px] font-extrabold text-danger-600 tabular-nums"
                    }
                  >
                    {a.score}/{a.total}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon="target"
            title="No quiz attempts yet"
            description="Try a self-check quiz from any teacher profile to track your progress here."
            action={
              <LinkButton href="/explore" size="sm">
                Explore teachers
              </LinkButton>
            }
          />
        )}
      </section>

      <section>
        <SectionHeader title="Teachers you follow" subtitle="New lessons appear in your feed." />
        {follows.length > 0 ? (
          <div className="space-y-2.5">
            {follows.map((f) => {
              const p = f.teacher.teacherProfile;
              return (
                <div key={f.teacher.id} className="card flex items-center gap-3 p-3.5">
                  <Avatar
                    name={f.teacher.name}
                    src={f.teacher.avatarKey ? `/api/media/${f.teacher.avatarKey}` : null}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    {p ? (
                      <Link
                        href={`/teacher/${p.handle}`}
                        className="flex items-center gap-1.5 text-[13.5px] font-bold text-ink-900 hover:text-brand-700"
                      >
                        <span className="truncate">{f.teacher.name}</span>
                        {p.verifiedStatus === "verified" ? <VerifiedTick /> : null}
                      </Link>
                    ) : (
                      <span className="text-[13.5px] font-bold text-ink-900">{f.teacher.name}</span>
                    )}
                    {p?.tagline ? (
                      <p className="truncate text-[12px] text-ink-400">{p.tagline}</p>
                    ) : null}
                  </div>
                  {p ? (
                    <FollowButton
                      handle={p.handle}
                      initialFollowing
                      initialCount={0}
                      isAuthenticated
                      className="!px-3.5 !py-1.5 !text-[12px]"
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon="users"
            title="You're not following anyone yet"
            description="Follow teachers to see their lessons and announcements in your feed."
            action={
              <LinkButton href="/explore" size="sm">
                Explore teachers
              </LinkButton>
            }
          />
        )}
      </section>

      <div className="glass flex flex-col gap-3 rounded-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-600 text-white">
            <Icon name="book-open" size={20} />
          </span>
          <div>
            <p className="text-[14.5px] font-extrabold text-ink-900">My courses</p>
            <p className="text-[12.5px] text-ink-500">
              Continue learning on your enrolled LMS courses.
            </p>
          </div>
        </div>
        <LinkButton href="/lms" size="sm">
          Browse hubs
          <Icon name="arrow-right" size={14} strokeWidth={2.4} />
        </LinkButton>
      </div>
    </div>
  );
}

async function TeacherDashboard({ userId }: { userId: string }) {
  const [profile, followCount, postCount] = await Promise.all([
    db.teacherProfile.findUnique({
      where: { userId },
      select: { handle: true, verifiedStatus: true, createdAt: true },
    }),
    db.follow.count({ where: { teacherId: userId } }),
    db.post.count({ where: { authorId: userId, moderationStatus: "approved" } }),
  ]);

  const [reviewAgg, quizCount, attemptCount] = await Promise.all([
    db.review.aggregate({
      where: { teacherId: userId, status: "published" },
      _avg: { stars: true },
      _count: { _all: true },
    }),
    db.quiz.count({ where: { teacherId: userId } }),
    db.quizAttempt.count({ where: { quiz: { teacherId: userId } } }),
  ]);

  const [subscription, workspaces] = await Promise.all([
    getUserSubscription(userId),
    getLmsWorkspacesForUser(userId),
  ]);

  const planName = subscription?.plan?.name ?? "Free";
  const features = (subscription?.features ?? []) as string[];
  const limits = (subscription?.limits ?? {}) as unknown as Record<string, number>;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Followers" value={compactNumber(followCount)} icon="users" />
        <Stat
          label="Avg rating"
          value={reviewAgg._avg.stars !== null ? reviewAgg._avg.stars.toFixed(1) : "—"}
          icon="star"
          hint={`${reviewAgg._count._all} reviews`}
        />
        <Stat label="Approved posts" value={postCount} icon="pencil" />
        <Stat label="Quiz attempts" value={attemptCount} icon="target" hint={`${quizCount} quizzes`} />
      </div>

      <div className="glass flex flex-col gap-3 rounded-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white">
            <Icon name="video" size={20} />
          </span>
          <div>
            <p className="text-[14.5px] font-extrabold text-ink-900">Teacher Studio</p>
            <p className="text-[12.5px] text-ink-500">
              Compose posts, manage quizzes, enrollments and verification.
            </p>
          </div>
        </div>
        <LinkButton href="/studio" size="sm">
          Open Studio
          <Icon name="arrow-right" size={14} strokeWidth={2.4} />
        </LinkButton>
      </div>

      <div className="glass flex flex-col gap-3 rounded-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-600 text-white">
            <Icon name="globe" size={20} />
          </span>
          <div>
            <p className="text-[14.5px] font-extrabold text-ink-900">Learning Hub (LMS)</p>
            <p className="text-[12.5px] text-ink-500">
              {workspaces.length > 0
                ? `${workspaces.length} hub${workspaces.length === 1 ? "" : "s"} live · ${limits.lms_courses ?? 0} course slots`
                : "Claim a branded subdomain and run courses, lessons and learners."}
            </p>
          </div>
        </div>
        <LinkButton href={workspaces[0] ? `/lms/${workspaces[0].subdomain}/manage` : "/lms"} size="sm">
          {workspaces.length > 0 ? "Manage hub" : "Claim a hub"}
          <Icon name="arrow-right" size={14} strokeWidth={2.4} />
        </LinkButton>
      </div>

      <div className="card space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[14.5px] font-extrabold text-ink-900">Your plan</p>
            <p className="text-[12.5px] text-ink-500">
              {planName} · {subscription?.status ?? "free"}
            </p>
          </div>
          <LinkButton href="/pricing" size="sm" variant="outline">
            Change plan <Icon name="arrow-right" size={14} strokeWidth={2.4} />
          </LinkButton>
        </div>
        {features.length > 0 ? (
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {features.slice(0, 8).map((f) => (
              <li key={f} className="flex items-center gap-2 text-[12px] text-ink-600">
                <Icon name="check" size={12} className="flex-none text-success-600" strokeWidth={3} />
                {f.replace(/_/g, " ")}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12px] text-ink-500">Free plan — upgrade any time.</p>
        )}
        <p className="text-[11px] text-ink-400">
          Channels: {limits.channels ?? "—"} · Classes: {limits.classes ?? "—"} · Storage:{" "}
          {limits.storage_mb ?? "—"} MB · LMS courses: {limits.lms_courses ?? "—"}
        </p>
      </div>

      {profile ? (
        <p className="text-[12.5px] text-ink-400">
          Public profile:{" "}
          <Link href={`/teacher/${profile.handle}`} className="font-bold text-brand-700 hover:underline">
            /teacher/{profile.handle}
          </Link>{" "}
          · joined {formatDate(profile.createdAt)}
          {profile.verifiedStatus === "verified" ? " · verified teacher" : ""}
        </p>
      ) : null}
    </div>
  );
}

async function AdminDashboard({ role }: { role: string }) {
  const [openReports, pendingVerifications] = await Promise.all([
    db.report.count({ where: { status: "open" } }),
    db.verificationRequest.count({ where: { status: { in: ["pending", "in_review"] } } }),
  ]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Open reports" value={openReports} icon="flag" />
        <Stat label="Verification queue" value={pendingVerifications} icon="shield-check" />
        <Stat label="Your role" value={role} icon="shield" />
      </div>
      <div className="glass flex items-center justify-between gap-3 rounded-card p-5">
        <div>
          <p className="text-[14.5px] font-extrabold text-ink-900">Admin Console</p>
          <p className="text-[12.5px] text-ink-500">
            Review verifications, handle reports and moderate content.
          </p>
        </div>
        <LinkButton href="/admin" size="sm">
          Open console
        </LinkButton>
      </div>
    </div>
  );
}
