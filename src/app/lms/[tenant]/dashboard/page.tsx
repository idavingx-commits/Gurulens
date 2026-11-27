import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LmsCourseCard } from "@/components/lms/LmsCourseCard";
import { Icon } from "@/components/ui/icons";
import { EmptyState, InfoNote, SectionHeader, Stat } from "@/components/ui/primitives";
import { getAuth } from "@/lib/auth";
import {
  getLmsAccess,
  getLmsBasePath,
  getLmsCourseCards,
  getLmsWorkspaceBySubdomain,
  lmsBrandColor,
} from "@/lib/lms";

type Props = { params: Promise<{ tenant: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenant } = await params;
  const workspace = await getLmsWorkspaceBySubdomain(tenant);
  return { title: workspace ? `My learning · ${workspace.name}` : "My learning" };
}

export default async function LmsDashboardPage({ params }: Props) {
  const { tenant } = await params;
  const workspace = await getLmsWorkspaceBySubdomain(tenant);
  if (!workspace) notFound();

  const auth = await getAuth();
  if (!auth) {
    return (
      <div className="mx-auto max-w-lg py-6">
        <EmptyState
          icon="target"
          title="Sign in to see your learning"
          description="Enroll in courses, track lesson progress and pick up where you left off."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-[13px] font-bold text-white hover:bg-brand-700"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-5 py-2.5 text-[13px] font-bold text-ink-700 hover:border-brand-300 hover:text-brand-700"
              >
                Create free account
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  const access = await getLmsAccess(workspace, auth.user);
  const base = await getLmsBasePath(workspace.subdomain);
  const brand = lmsBrandColor(workspace.brandColor);

  const cards = await getLmsCourseCards(workspace.id, auth.user.id, {
    includeDrafts: access.canManage,
  });
  const enrolled = cards.filter((course) => course.enrolled);
  const inProgress = enrolled.filter(
    (course) => course.enrollmentStatus !== "completed" && course.progress < 100,
  );
  const completed = enrolled.filter(
    (course) => course.enrollmentStatus === "completed" || course.progress >= 100,
  );
  const notStarted = enrolled.filter((course) => course.progress === 0);

  const pending = enrolled.filter((course) => course.enrollmentStatus === "pending");

  const totalLessons = enrolled.reduce((sum, course) => sum + course.lessonCount, 0);
  const overall =
    totalLessons === 0
      ? 0
      : Math.round(
          enrolled.reduce((sum, course) => sum + (course.progress / 100) * course.lessonCount, 0) /
            totalLessons,
        );

  const nextCourse =
    inProgress[0] ??
    enrolled.find((course) => course.enrollmentStatus !== "pending" && course.progress === 0) ??
    null;
  const ringRadius = 30;
  const ringCircumference = 2 * Math.PI * ringRadius;

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={base || "/"}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-ink-500 hover:text-brand-700"
        >
          <Icon name="arrow-left" size={14} /> {workspace.name}
        </Link>
        <span className="text-ink-300">/</span>
        <span className="text-[12.5px] font-bold text-ink-800">My learning</span>
        <Link
          href={`${base}/courses`}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-ink-800"
        >
          <Icon name="book-open" size={13} /> Browse courses
        </Link>
      </div>

      <section className="relative overflow-hidden rounded-[1.9rem] bg-ink-900 text-white shadow-[0_28px_60px_-32px_rgba(5,16,38,0.8)]">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: `linear-gradient(120deg, #07152e 10%, ${brand} 150%)` }}
        />
        <div
          aria-hidden="true"
          className="absolute -top-20 -right-10 size-64 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-24 left-1/3 size-56 rounded-full bg-accent-500/25 blur-3xl"
        />

        <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[9.5px] font-black tracking-[0.14em] uppercase backdrop-blur-sm">
              <Icon name="target" size={11} /> My learning
            </span>
            <h1 className="mt-2.5 text-[26px] leading-[1.1] font-black tracking-tight sm:text-[32px]">
              Welcome back, {auth.user.name.split(" ")[0]}
            </h1>
            <p className="mt-1.5 max-w-lg text-[12.5px] leading-relaxed text-white/65">
              Here&apos;s where you stand across every course in {workspace.name}. Keep going — your
              progress is saved lesson by lesson.
            </p>

            {nextCourse ? (
              <Link
                href={`${base}/courses/${nextCourse.id}`}
                className="mt-4 inline-flex max-w-full items-center gap-2.5 rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 backdrop-blur-sm transition-colors hover:bg-white/15"
              >
                <span className="flex size-8 flex-none items-center justify-center rounded-xl bg-white text-ink-900">
                  <Icon name="play" size={14} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[9px] font-black tracking-[0.12em] text-white/45 uppercase">
                    {nextCourse.progress > 0 ? "Continue where you stopped" : "Start next"}
                  </span>
                  <span className="block truncate text-[12px] font-extrabold text-white">
                    {nextCourse.title}
                  </span>
                </span>
                <Icon name="arrow-right" size={14} className="ml-1 flex-none text-white/50" />
              </Link>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`${base}/courses`}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[11.5px] font-black text-ink-900 shadow-lg transition-transform hover:-translate-y-0.5"
              >
                <Icon name="book-open" size={13} /> Browse courses
              </Link>
              <Link
                href={base || "/"}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[11.5px] font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <Icon name="globe" size={13} /> Hub home
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-[1.4rem] border border-white/15 bg-white/10 p-4 backdrop-blur-md">
            <div className="relative size-[76px] flex-none">
              <svg viewBox="0 0 76 76" className="size-full -rotate-90">
                <circle
                  cx="38"
                  cy="38"
                  r={ringRadius}
                  fill="none"
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth="8"
                />
                <circle
                  cx="38"
                  cy="38"
                  r={ringRadius}
                  fill="none"
                  stroke="white"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${ringCircumference} ${ringCircumference}`}
                  strokeDashoffset={ringCircumference * (1 - overall / 100)}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[16px] font-black tabular-nums">
                {overall}%
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[9.5px] font-black tracking-[0.14em] text-white/45 uppercase">
                Overall progress
              </p>
              <p className="mt-1 text-[12.5px] leading-snug font-extrabold">
                {overall >= 100
                  ? "Every course complete"
                  : overall > 0
                    ? "You're making progress"
                    : "Ready when you are"}
              </p>
              <p className="mt-0.5 text-[10.5px] font-semibold text-white/50">
                {completed.length} of {enrolled.length} course
                {enrolled.length === 1 ? "" : "s"} completed
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Courses enrolled" value={enrolled.length} icon="book-open" />
          <Stat label="In progress" value={inProgress.length} icon="play" />
          <Stat label="Completed" value={completed.length} icon="award" />
          <Stat label="Lessons done" value={`${overall}%`} icon="target" />
        </div>
      </section>

      {pending.length > 0 ? (
        <InfoNote icon="clock" tone="warn">
          {pending.length} enrollment{pending.length === 1 ? "" : "s"} waiting for teacher approval.
          You&apos;ll be notified once {pending.length === 1 ? "it's" : "they're"} approved.
        </InfoNote>
      ) : null}

      {inProgress.length > 0 ? (
        <section>
          <SectionHeader
            title="Continue learning"
            subtitle="Courses you've started but not finished."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inProgress.map((course) => (
              <LmsCourseCard key={course.id} course={course} base={base} />
            ))}
          </div>
        </section>
      ) : null}

      {notStarted.length > 0 ? (
        <section>
          <SectionHeader title="Not started yet" subtitle="Enrolled courses waiting for you." />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {notStarted
              .filter((course) => course.enrollmentStatus !== "pending")
              .map((course) => (
                <LmsCourseCard key={course.id} course={course} base={base} />
              ))}
          </div>
        </section>
      ) : null}

      {completed.length > 0 ? (
        <section>
          <SectionHeader title="Completed" subtitle="Courses you've finished. Great work!" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {completed.map((course) => (
              <LmsCourseCard key={course.id} course={course} base={base} />
            ))}
          </div>
        </section>
      ) : null}

      {enrolled.length === 0 ? (
        <EmptyState
          icon="target"
          title="No courses yet"
          description="Browse the catalogue and enroll in your first course to start tracking progress."
          action={
            <Link
              href={`${base}/courses`}
              className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-[13px] font-bold text-white hover:bg-brand-700"
            >
              <Icon name="book-open" size={15} /> Browse courses
            </Link>
          }
        />
      ) : null}
    </div>
  );
}
