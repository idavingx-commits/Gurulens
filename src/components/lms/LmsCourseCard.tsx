import Link from "next/link";

import { Icon } from "@/components/ui/icons";
import { ProgressBar } from "@/components/ui/primitives";
import type { LmsCourseCard as LmsCourseCardData } from "@/lib/lms";
import { cn } from "@/lib/format";

const LEVEL_LABEL: Record<string, string> = {
  all: "All levels",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export function LmsCourseCard({
  course,
  base,
}: {
  course: LmsCourseCardData;
  base: string;
}) {
  const completed = course.enrollmentStatus === "completed" || course.progress >= 100;

  return (
    <Link
      href={`${base}/courses/${course.id}`}
      className="group card relative flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-[0_24px_50px_-24px_rgba(10,27,61,0.35)]"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 z-10 h-0.5 bg-gradient-to-r from-brand-500 via-accent-500 to-brand-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />

      <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-ink-900 via-brand-800 to-accent-700">
        {course.coverKey ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/media/${course.coverKey}`}
            alt=""
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <>
            <div
              aria-hidden="true"
              className="absolute -top-10 -right-8 size-36 rounded-full bg-white/20 blur-2xl"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-12 -left-8 size-32 rounded-full bg-accent-400/25 blur-2xl"
            />
            <div className="absolute inset-0 opacity-[0.09]">
              <div
                className="size-full"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
                  backgroundSize: "26px 26px",
                }}
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md transition-transform duration-300 group-hover:scale-105">
                <Icon name="book-open" size={24} />
              </span>
            </div>
          </>
        )}

        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ink-900/55 to-transparent" />

        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-ink-900/70 px-2 py-0.5 text-[9px] font-black tracking-wide text-white uppercase backdrop-blur-sm">
            {LEVEL_LABEL[course.level] ?? course.level}
          </span>
          {course.status !== "published" ? (
            <span className="rounded-full bg-warn-500 px-2 py-0.5 text-[9px] font-black tracking-wide text-white uppercase">
              {course.status}
            </span>
          ) : null}
          {course.visibility === "members" ? (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-black tracking-wide text-white uppercase backdrop-blur-sm">
              Members
            </span>
          ) : null}
        </div>

        <span className="absolute right-2.5 bottom-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[9.5px] font-black text-ink-700 shadow-sm">
          <Icon name="play" size={9} /> {course.lessonCount} lessons
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-2">
          <h3 className="line-clamp-2 flex-1 text-[14.5px] leading-snug font-extrabold text-ink-900 transition-colors group-hover:text-brand-700">
            {course.title}
          </h3>
          <span className="mt-0.5 flex size-6 flex-none items-center justify-center rounded-full border border-ink-100 bg-white text-ink-300 transition-all group-hover:border-brand-200 group-hover:bg-brand-50 group-hover:text-brand-600">
            <Icon name="arrow-right" size={12} strokeWidth={2.6} />
          </span>
        </div>
        {course.description ? (
          <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-ink-500">
            {course.description}
          </p>
        ) : null}

        <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10.5px] font-bold text-ink-400">
          <span className="inline-flex items-center gap-1">
            <Icon name="grid" size={11} /> {course.moduleCount} modules
          </span>
          <span className="size-1 rounded-full bg-ink-200" aria-hidden="true" />
          <span className="inline-flex items-center gap-1">
            <Icon name="users" size={11} /> {course.learnerCount} learners
          </span>
          {course.enrollmentStatus && !completed ? (
            <span
              className={cn(
                "ml-auto inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase",
                course.enrollmentStatus === "pending"
                  ? "bg-warn-100 text-warn-600"
                  : "bg-brand-50 text-brand-700",
              )}
            >
              {course.enrollmentStatus === "pending" ? "Pending" : "Enrolled"}
            </span>
          ) : null}
          {completed ? (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-success-100 px-1.5 py-0.5 text-[9px] font-black text-success-600 uppercase">
              <Icon name="check" size={9} strokeWidth={3} /> Completed
            </span>
          ) : null}
        </div>

        {course.enrolled ? (
          <div className="mt-auto pt-3.5">
            <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold">
              <span className="text-ink-400">{completed ? "Finished" : "Your progress"}</span>
              <span className={completed ? "text-success-600" : "text-ink-700"}>
                {course.progress}%
              </span>
            </div>
            <ProgressBar
              value={course.progress}
              tone={course.progress >= 100 ? "success" : "brand"}
              className="h-1.5"
            />
          </div>
        ) : (
          <span className="mt-auto inline-flex items-center gap-1 pt-3.5 text-[10.5px] font-black tracking-wide text-brand-600 uppercase">
            {course.visibility === "public" ? "Start course" : "View course"}
            <Icon
              name="arrow-right"
              size={11}
              strokeWidth={2.6}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </span>
        )}
      </div>
    </Link>
  );
}
