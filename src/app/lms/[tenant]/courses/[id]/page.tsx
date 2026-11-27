import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Icon } from "@/components/ui/icons";
import { Badge, InfoNote, ProgressBar } from "@/components/ui/primitives";
import { getAuth } from "@/lib/auth";
import {
  getLmsAccess,
  getLmsBasePath,
  getLmsCourseDetail,
  getLmsWorkspaceBySubdomain,
  lmsBrandColor,
} from "@/lib/lms";
import { CourseEnrollButton } from "@/components/lms/CourseEnrollButton";

type Props = { params: Promise<{ tenant: string; id: string }> };

const LEVEL_LABEL: Record<string, string> = {
  all: "All levels",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenant, id } = await params;
  const workspace = await getLmsWorkspaceBySubdomain(tenant);
  if (!workspace) return { title: "Course" };
  const course = await getLmsCourseDetail(workspace.id, id, null);
  if (!course) return { title: "Course" };
  return {
    title: `${course.title} · ${workspace.name}`,
    description: course.description ?? undefined,
  };
}

export default async function LmsCoursePage({ params }: Props) {
  const { tenant, id } = await params;
  const workspace = await getLmsWorkspaceBySubdomain(tenant);
  if (!workspace) notFound();

  const auth = await getAuth();
  const access = await getLmsAccess(workspace, auth?.user ?? null);
  const base = await getLmsBasePath(workspace.subdomain);
  const brand = lmsBrandColor(workspace.brandColor);

  const course = await getLmsCourseDetail(workspace.id, id, auth?.user.id ?? null);
  if (!course) notFound();

  const locked =
    course.visibility === "members" && !access.member && !course.enrollment;
  const started = Boolean(course.enrollment && course.enrollment.status !== "dropped");
  const firstLesson = course.modules
    .flatMap((module) => module.lessons)
    .find(() => true);
  const totalMinutes = course.modules
    .flatMap((module) => module.lessons)
    .reduce((sum, lesson) => sum + (lesson.durationMin ?? 0), 0);

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-2 text-[12.5px] font-bold text-ink-500">
        <Link href={base || "/"} className="hover:text-brand-700">
          {workspace.name}
        </Link>
        <span className="text-ink-300">/</span>
        <Link href={`${base}/courses`} className="hover:text-brand-700">
          Courses
        </Link>
        <span className="text-ink-300">/</span>
        <span className="truncate text-ink-800">{course.title}</span>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-[1.9rem] bg-ink-900 text-white shadow-[0_30px_70px_-35px_rgba(5,16,38,0.8)]">
        {course.coverKey ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/media/${course.coverKey}`}
            alt=""
            className="absolute inset-0 size-full object-cover opacity-40"
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: `linear-gradient(125deg, #07152e 0%, ${brand} 145%)` }}
          />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-ink-900/90 via-ink-900/60 to-ink-900/30"
        />
        <div
          aria-hidden="true"
          className="absolute -top-20 -right-10 size-64 rounded-full bg-white/10 blur-3xl"
        />

        <div className="relative grid gap-6 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[1fr_300px] lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-[9.5px] font-black tracking-[0.12em] uppercase backdrop-blur-sm">
                {LEVEL_LABEL[course.level] ?? course.level}
              </span>
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-[9.5px] font-black tracking-wide uppercase backdrop-blur-sm">
                {course.visibility === "public" ? "Open course" : "Members only"}
              </span>
              {course.status !== "published" ? (
                <span className="rounded-full bg-warn-500 px-2.5 py-1 text-[9.5px] font-black uppercase">
                  {course.status}
                </span>
              ) : null}
              {course.enrollment?.status === "completed" ? (
                <span className="rounded-full bg-success-500 px-2.5 py-1 text-[9.5px] font-black uppercase">
                  Completed
                </span>
              ) : null}
            </div>

            <h1 className="mt-3 max-w-2xl text-[27px] leading-[1.1] font-black tracking-tight sm:text-[36px]">
              {course.title}
            </h1>
            {course.description ? (
              <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-white/70">
                {course.description}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11.5px] font-semibold text-white/65">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="grid" size={13} /> {course.modules.length} modules
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="play" size={13} /> {course.totalLessons} lessons
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="users" size={13} /> {course._count.enrollments} learners
              </span>
              {totalMinutes > 0 ? (
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="clock" size={13} /> {totalMinutes} min of lessons
                </span>
              ) : null}
              {course.enrollment?.completedAt ? (
                <span className="inline-flex items-center gap-1.5 text-success-300">
                  <Icon name="check" size={13} /> Finished
                </span>
              ) : null}
            </div>
          </div>

          <div className="rounded-[1.4rem] border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur-md">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[9px] font-black tracking-[0.14em] uppercase">
              <Icon name="sparkles" size={10} /> Free during launch
            </span>

            {started ? (
              <>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-[9.5px] font-black tracking-[0.14em] text-white/45 uppercase">
                      Your progress
                    </p>
                    <p className="mt-0.5 text-[28px] leading-none font-black tabular-nums">
                      {course.progress}%
                    </p>
                  </div>
                  <span className="rounded-full bg-white/12 px-2 py-1 text-[9.5px] font-bold text-white/70">
                    {course.completedLessons}/{course.totalLessons} lessons
                  </span>
                </div>
                <ProgressBar
                  value={course.progress}
                  tone={course.progress >= 100 ? "success" : "brand"}
                  className="mt-3 h-2 bg-white/20"
                />
              </>
            ) : (
              <p className="mt-3 text-[12.5px] leading-relaxed text-white/65">
                {course.visibility === "public"
                  ? "Enroll in one click and start learning immediately."
                  : "Request to join and unlock every lesson in this course."}
              </p>
            )}

            <div className="mt-4">
              <CourseEnrollButton
                courseId={course.id}
                base={base}
                signedIn={Boolean(auth)}
                visibility={course.visibility}
                isMember={access.member}
                enrolled={started}
                status={course.enrollment?.status ?? null}
              />
            </div>

            <ul className="mt-4 space-y-1.5 border-t border-white/15 pt-3 text-[10.5px] font-semibold text-white/55">
              <li className="flex items-center gap-1.5">
                <Icon name="check" size={11} className="text-success-300" /> Progress saved
                automatically
              </li>
              <li className="flex items-center gap-1.5">
                <Icon name="check" size={11} className="text-success-300" /> Learn at your own pace
              </li>
              <li className="flex items-center gap-1.5">
                <Icon name="check" size={11} className="text-success-300" /> Works on mobile and
                desktop
              </li>
            </ul>
          </div>
        </div>
      </section>

      {locked ? (
        <InfoNote icon="lock" tone="warn">
          This is a members-only course. Enroll to unlock every lesson, or browse the preview lesson
          below.
        </InfoNote>
      ) : null}

      {course.enrollment?.status === "pending" ? (
        <InfoNote icon="clock" tone="warn">
          Your enrollment is pending approval from the teacher. You&apos;ll be notified as soon as
          it&apos;s approved.
        </InfoNote>
      ) : null}

      {/* Curriculum */}
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-ink-900">Curriculum</h2>
            <p className="mt-0.5 text-[13px] text-ink-500">
              {course.modules.length} module{course.modules.length === 1 ? "" : "s"} ·{" "}
              {course.totalLessons} lesson{course.totalLessons === 1 ? "" : "s"}
            </p>
          </div>
          {course.completedLessons > 0 ? (
            <Badge tone="success" icon="check">
              {course.completedLessons}/{course.totalLessons} done
            </Badge>
          ) : null}
        </div>

        {course.modules.length === 0 ? (
          <div className="card p-6 text-center text-[13px] text-ink-500">
            The curriculum for this course hasn&apos;t been added yet.
          </div>
        ) : (
          <div className="space-y-3">
            {course.modules.map((module, moduleIndex) => (
              <div key={module.id} className="card overflow-hidden">
                <div className="flex items-center gap-3 border-b border-ink-100 bg-ink-50/70 px-4 py-3">
                  <span className="flex size-7 flex-none items-center justify-center rounded-lg bg-white text-[11.5px] font-black text-ink-700 ring-1 ring-ink-200">
                    {moduleIndex + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-[13.5px] font-extrabold text-ink-900">
                      {module.title}
                    </h3>
                    {module.description ? (
                      <p className="truncate text-[11.5px] text-ink-500">{module.description}</p>
                    ) : null}
                  </div>
                  <span className="ml-auto flex flex-none items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-ink-500 ring-1 ring-ink-200">
                    <Icon
                      name="check"
                      size={10}
                      strokeWidth={3}
                      className={
                        module.lessons.length > 0 &&
                        module.lessons.filter((lesson) => lesson.progress?.length).length ===
                          module.lessons.length
                          ? "text-success-600"
                          : "text-ink-300"
                      }
                    />
                    {module.lessons.filter((lesson) => lesson.progress?.length).length}/
                    {module.lessons.length}
                  </span>
                </div>

                <ul className="divide-y divide-ink-50">
                  {module.lessons.map((lesson, lessonIndex) => {
                    const done = Boolean(lesson.progress?.length);
                    const open = !locked || lesson.isPreview || access.canManage || started;
                    const href = open
                      ? `${base}/courses/${course.id}/lessons/${lesson.id}`
                      : undefined;
                    const inner = (
                      <div className="flex items-center gap-3 px-4 py-3">
                        <span
                          className={
                            done
                              ? "flex size-6 flex-none items-center justify-center rounded-full bg-success-500 text-white"
                              : "flex size-6 flex-none items-center justify-center rounded-full border border-ink-200 bg-white text-[11px] font-bold text-ink-400"
                          }
                        >
                          {done ? <Icon name="check" size={12} strokeWidth={3} /> : lessonIndex + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p
                            className={
                              open
                                ? "truncate text-[13px] font-bold text-ink-800"
                                : "truncate text-[13px] font-bold text-ink-400"
                            }
                          >
                            {lesson.title}
                          </p>
                          {lesson.description ? (
                            <p className="truncate text-[11.5px] text-ink-400">
                              {lesson.description}
                            </p>
                          ) : null}
                        </div>
                        {lesson.isPreview ? (
                          <span className="flex-none rounded-full bg-brand-50 px-2 py-0.5 text-[9.5px] font-black text-brand-700 uppercase">
                            Preview
                          </span>
                        ) : null}
                        {lesson.durationMin ? (
                          <span className="flex-none text-[11px] font-semibold text-ink-400">
                            {lesson.durationMin} min
                          </span>
                        ) : null}
                        {lesson.videoUrl ? (
                          <Icon name="video" size={14} className="flex-none text-ink-300" />
                        ) : null}
                        {open ? (
                          <Icon name="chevron-right" size={15} className="flex-none text-ink-300" />
                        ) : (
                          <Icon name="lock" size={14} className="flex-none text-ink-300" />
                        )}
                      </div>
                    );

                    return (
                      <li key={lesson.id}>
                        {href ? (
                          <Link href={href} className="block transition-colors hover:bg-brand-50/50">
                            {inner}
                          </Link>
                        ) : (
                          <div className="cursor-not-allowed opacity-70">{inner}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {firstLesson && !locked ? (
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`${base}/courses/${course.id}/lessons/${firstLesson.id}`}
            className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-[13px] font-bold text-white shadow-lg shadow-brand-500/25 transition-colors hover:bg-brand-700"
          >
            <Icon name="play" size={15} />{" "}
            {course.progress > 0 ? "Continue course" : "Start first lesson"}
          </Link>
          <Link
            href={`${base}/courses`}
            className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-5 py-2.5 text-[13px] font-bold text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-700"
          >
            <Icon name="arrow-left" size={14} /> Back to courses
          </Link>
        </div>
      ) : null}
    </div>
  );
}
