import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LessonCompleteButton } from "@/components/lms/LessonCompleteButton";
import { Icon } from "@/components/ui/icons";
import { Badge, InfoNote } from "@/components/ui/primitives";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getLmsAccess,
  getLmsBasePath,
  getLmsWorkspaceBySubdomain,
  lmsBrandColor,
} from "@/lib/lms";

type Props = { params: Promise<{ tenant: string; id: string; lessonId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lessonId } = await params;
  const lesson = await db.lmsLesson.findUnique({
    where: { id: lessonId },
    select: { title: true },
  });
  return { title: lesson ? `${lesson.title} · Lesson` : "Lesson" };
}

function videoEmbed(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (parsed.hostname.includes("vimeo.com")) {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

function renderContent(content: string) {
  return content.split(/\n{2,}/).map((block, index) => {
    const trimmed = block.trim();
    if (!trimmed) return null;
    if (/^#{1,3}\s/.test(trimmed)) {
      return (
        <h3 key={index} className="mt-5 text-[16px] font-extrabold text-ink-900 first:mt-0">
          {trimmed.replace(/^#{1,3}\s/, "")}
        </h3>
      );
    }
    if (/^[-*]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
      const items = trimmed.split("\n").map((line) => line.replace(/^([-*]|\d+\.)\s/, "").trim());
      return (
        <ul key={index} className="mt-3 space-y-2">
          {items.map((item, itemIndex) => (
            <li key={itemIndex} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-ink-700">
              <span className="mt-1.5 size-1.5 flex-none rounded-full bg-brand-500" />
              {item}
            </li>
          ))}
        </ul>
      );
    }
    return (
      <p key={index} className="mt-3 text-[13.5px] leading-[1.75] text-ink-700 first:mt-0">
        {trimmed}
      </p>
    );
  });
}

export default async function LmsLessonPage({ params }: Props) {
  const { tenant, lessonId } = await params;
  const workspace = await getLmsWorkspaceBySubdomain(tenant);
  if (!workspace) notFound();

  const auth = await getAuth();
  const access = await getLmsAccess(workspace, auth?.user ?? null);
  const base = await getLmsBasePath(workspace.subdomain);
  const brand = lmsBrandColor(workspace.brandColor);

  const lesson = await db.lmsLesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: { include: { workspace: { select: { id: true } } } },
          lessons: { orderBy: { sortOrder: "asc" }, select: { id: true, title: true } },
        },
      },
      progress: {
        where: { userId: auth?.user.id ?? "__none__" },
        select: { id: true },
      },
    },
  });

  if (!lesson || lesson.module.course.workspaceId !== workspace.id) notFound();

  const course = lesson.module.course;
  const enrollment = auth
    ? await db.lmsEnrollment.findUnique({
        where: { courseId_userId: { courseId: course.id, userId: auth.user.id } },
        select: { status: true },
      })
    : null;

  const started = Boolean(enrollment && ["active", "completed"].includes(enrollment.status));
  const locked =
    course.visibility === "members" && !access.member && !started && !lesson.isPreview;

  const flatLessons = lesson.module.lessons;
  const currentIndex = flatLessons.findIndex((item) => item.id === lesson.id);
  const prev = currentIndex > 0 ? flatLessons[currentIndex - 1] : null;
  const next = currentIndex < flatLessons.length - 1 ? flatLessons[currentIndex + 1] : null;

  const allModules = await db.lmsModule.findMany({
    where: { courseId: course.id },
    orderBy: { sortOrder: "asc" },
    include: {
      lessons: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          title: true,
          durationMin: true,
          isPreview: true,
          progress: { where: { userId: auth?.user.id ?? "__none__" }, select: { id: true } },
        },
      },
    },
  });
  const totalLessons = allModules.reduce((sum, module) => sum + module.lessons.length, 0);
  const doneLessons = allModules.reduce(
    (sum, module) => sum + module.lessons.filter((item) => item.progress.length).length,
    0,
  );
  const progress = totalLessons === 0 ? 0 : Math.round((doneLessons / totalLessons) * 100);
  const lessonNumber =
    allModules
      .flatMap((module) => module.lessons)
      .findIndex((item) => item.id === lesson.id) + 1;

  const embed = lesson.videoUrl ? videoEmbed(lesson.videoUrl) : null;
  const done = lesson.progress.length > 0;

  if (locked) {
    return (
      <div className="mx-auto max-w-2xl space-y-5 py-6">
        <Link
          href={`${base}/courses/${course.id}`}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-ink-500 hover:text-brand-700"
        >
          <Icon name="arrow-left" size={14} /> Back to course
        </Link>
        <div className="card p-8 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-warn-100 text-warn-600">
            <Icon name="lock" size={24} />
          </span>
          <h1 className="mt-4 text-xl font-black text-ink-900">This lesson is locked</h1>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-ink-500">
            {course.title} is a members-only course. Enroll to unlock every lesson and track your
            progress.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link
              href={`${base}/courses/${course.id}`}
              className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-[13px] font-bold text-white hover:bg-brand-700"
            >
              <Icon name="eye" size={15} /> View course &amp; enroll
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0 space-y-5">
        <nav className="flex flex-wrap items-center gap-2 text-[12.5px] font-bold text-ink-500">
          <Link href={`${base}/courses`} className="hover:text-brand-700">
            Courses
          </Link>
          <span className="text-ink-300">/</span>
          <Link href={`${base}/courses/${course.id}`} className="truncate hover:text-brand-700">
            {course.title}
          </Link>
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">
            Lesson {lessonNumber} of {totalLessons}
          </Badge>
          <Badge tone="neutral">{lesson.module.title}</Badge>
          {lesson.durationMin ? (
            <Badge tone="neutral" icon="clock">
              {lesson.durationMin} min
            </Badge>
          ) : null}
          {lesson.isPreview ? <Badge tone="brand">Preview lesson</Badge> : null}
          {done ? (
            <Badge tone="success" icon="check">
              Completed
            </Badge>
          ) : null}
        </div>

        <h1 className="text-[24px] leading-tight font-black tracking-tight text-ink-900 sm:text-[30px]">
          {lesson.title}
        </h1>
        {lesson.description ? (
          <p className="text-[13.5px] leading-relaxed text-ink-500">{lesson.description}</p>
        ) : null}

        <div className="card flex items-center gap-3 p-3.5">
          <div className="relative size-11 flex-none">
            <svg viewBox="0 0 44 44" className="size-full -rotate-90">
              <circle
                cx="22"
                cy="22"
                r="17"
                fill="none"
                stroke="rgb(226 232 240)"
                strokeWidth="5"
              />
              <circle
                cx="22"
                cy="22"
                r="17"
                fill="none"
                stroke={progress >= 100 ? "rgb(22 163 74)" : brand}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 17} ${2 * Math.PI * 17}`}
                strokeDashoffset={2 * Math.PI * 17 * (1 - progress / 100)}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[9.5px] font-black text-ink-700">
              {progress}%
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9.5px] font-black tracking-[0.12em] text-ink-400 uppercase">
              Course progress
            </p>
            <p className="text-[12px] font-extrabold text-ink-900">
              {doneLessons} of {totalLessons} lessons completed
            </p>
          </div>
          {auth ? (
            <Link
              href={`${base}/dashboard`}
              className="hidden flex-none items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 sm:inline-flex"
            >
              My learning <Icon name="arrow-right" size={11} />
            </Link>
          ) : null}
        </div>

        {embed ? (
          <div className="overflow-hidden rounded-2xl border border-ink-100 bg-ink-900 shadow-lg">
            <iframe
              src={embed}
              title={lesson.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="aspect-video w-full"
            />
          </div>
        ) : lesson.videoUrl ? (
          <a
            href={lesson.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50/70 p-4 transition-colors hover:bg-brand-50"
          >
            <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-brand-600 text-white">
              <Icon name="video" size={18} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13.5px] font-extrabold text-ink-900">
                Watch the lesson video
              </span>
              <span className="block truncate text-[11.5px] text-ink-500">{lesson.videoUrl}</span>
            </span>
            <Icon name="external" size={16} className="ml-auto flex-none text-brand-600" />
          </a>
        ) : null}

        {lesson.content ? (
          <article className="card p-5 sm:p-6">{renderContent(lesson.content)}</article>
        ) : !lesson.videoUrl ? (
          <div className="card p-6 text-center text-[13px] text-ink-500">
            This lesson doesn&apos;t have content yet.
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 border-t border-ink-100 pt-5">
          <LessonCompleteButton lessonId={lesson.id} initialCompleted={done} disabled={locked} />
          <div className="ml-auto flex gap-2">
            {prev ? (
              <Link
                href={`${base}/courses/${course.id}/lessons/${prev.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-4 py-2 text-[12.5px] font-bold text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-700"
              >
                <Icon name="arrow-left" size={14} /> Previous
              </Link>
            ) : null}
            {next ? (
              <Link
                href={`${base}/courses/${course.id}/lessons/${next.id}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-4 py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-ink-800"
              >
                Next lesson <Icon name="arrow-right" size={14} />
              </Link>
            ) : null}
          </div>
        </div>

        {next === null && totalLessons > 0 && progress >= 100 ? (
          <InfoNote icon="award" tone="brand">
            You&apos;ve reached the end of {course.title}. Nice work!{" "}
            <Link href={`${base}/dashboard`} className="font-bold underline">
              See your dashboard
            </Link>
            .
          </InfoNote>
        ) : null}
      </div>

      {/* Sidebar */}
      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-extrabold text-ink-900">Course content</h2>
            <span className="text-[11px] font-bold text-ink-400">
              {doneLessons}/{totalLessons}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-4 max-h-[52vh] space-y-3 overflow-y-auto pr-1">
            {allModules.map((module, moduleIndex) => (
              <div key={module.id}>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-[10.5px] font-black text-ink-400">{moduleIndex + 1}.</span>
                  <span className="truncate text-[11.5px] font-extrabold text-ink-700">
                    {module.title}
                  </span>
                </div>
                <ul className="space-y-1">
                  {module.lessons.map((item) => {
                    const isCurrent = item.id === lesson.id;
                    const isDone = item.progress.length > 0;
                    const open = !locked || item.isPreview || access.canManage || started;
                    const content = (
                      <div
                        className={
                          isCurrent
                            ? "flex items-center gap-2 rounded-xl bg-brand-50 px-2.5 py-2 ring-1 ring-brand-200"
                            : "flex items-center gap-2 rounded-xl px-2.5 py-2 transition-colors hover:bg-ink-50"
                        }
                      >
                        <span
                          className={
                            isDone
                              ? "flex size-4 flex-none items-center justify-center rounded-full bg-success-500 text-white"
                              : "flex size-4 flex-none items-center justify-center rounded-full border border-ink-200 bg-white"
                          }
                        >
                          {isDone ? <Icon name="check" size={9} strokeWidth={3.5} /> : null}
                        </span>
                        <span
                          className={
                            isCurrent
                              ? "min-w-0 flex-1 truncate text-[11.5px] font-bold text-brand-700"
                              : open
                                ? "min-w-0 flex-1 truncate text-[11.5px] font-semibold text-ink-600"
                                : "min-w-0 flex-1 truncate text-[11.5px] font-semibold text-ink-400"
                          }
                        >
                          {item.title}
                        </span>
                        {!open ? <Icon name="lock" size={11} className="flex-none text-ink-300" /> : null}
                      </div>
                    );
                    return (
                      <li key={item.id}>
                        {open ? (
                          <Link href={`${base}/courses/${course.id}/lessons/${item.id}`}>
                            {content}
                          </Link>
                        ) : (
                          <div className="cursor-not-allowed opacity-60">{content}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <Link
          href={`${base}/courses/${course.id}`}
          className="flex items-center justify-center gap-2 rounded-2xl border border-ink-200 bg-white px-4 py-3 text-[12.5px] font-bold text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-700"
        >
          <Icon name="book-open" size={14} /> Course overview
        </Link>
        <div
          aria-hidden="true"
          className="h-1 w-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${brand}, #6d5bff)` }}
        />
      </aside>
    </div>
  );
}
