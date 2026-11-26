import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LmsCourseCard } from "@/components/lms/LmsCourseCard";
import { Icon } from "@/components/ui/icons";
import { EmptyState, InfoNote, ProgressBar, SectionHeader, Stat } from "@/components/ui/primitives";
import { getAuth } from "@/lib/auth";
import {
  getLmsAccess,
  getLmsBasePath,
  getLmsCourseCards,
  getLmsWorkspaceBySubdomain,
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

      <section>
        <SectionHeader
          title={`Welcome back, ${auth.user.name.split(" ")[0]}`}
          subtitle="Here's where you stand across every course in this hub."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Courses enrolled" value={enrolled.length} icon="book-open" />
          <Stat label="In progress" value={inProgress.length} icon="play" />
          <Stat label="Completed" value={completed.length} icon="award" />
          <Stat label="Lessons done" value={`${overall}%`} icon="target" />
        </div>

        {enrolled.length > 0 ? (
          <div className="mt-4 card p-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[13.5px] font-extrabold text-ink-900">Overall progress</h3>
              <span className="text-[12.5px] font-black text-ink-700">{overall}%</span>
            </div>
            <ProgressBar
              value={overall}
              tone={overall >= 100 ? "success" : "brand"}
              className="h-2.5"
            />
            <p className="mt-2 text-[11.5px] text-ink-400">
              {completed.length} of {enrolled.length} course
              {enrolled.length === 1 ? "" : "s"} completed.
            </p>
          </div>
        ) : null}
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
