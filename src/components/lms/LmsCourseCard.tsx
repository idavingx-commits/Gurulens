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
  return (
    <Link
      href={`${base}/courses/${course.id}`}
      className="group card flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-ink-900 via-brand-800 to-accent-700">
        {course.coverKey ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/media/${course.coverKey}`}
            alt=""
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <>
            <div
              aria-hidden="true"
              className="absolute -top-10 -right-8 size-32 rounded-full bg-white/15 blur-2xl"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/20 backdrop-blur-sm">
                <Icon name="book-open" size={26} />
              </span>
            </div>
          </>
        )}

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

        <span className="absolute right-2.5 bottom-2.5 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[9.5px] font-bold text-ink-700 shadow-sm">
          <Icon name="play" size={9} /> {course.lessonCount}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-[14px] leading-snug font-extrabold text-ink-900 group-hover:text-brand-700">
          {course.title}
        </h3>
        {course.description ? (
          <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-ink-500">
            {course.description}
          </p>
        ) : null}

        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[10.5px] font-bold text-ink-400">
          <span className="inline-flex items-center gap-1">
            <Icon name="book-open" size={11} /> {course.moduleCount} modules
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="users" size={11} /> {course.learnerCount}
          </span>
          {course.enrollmentStatus ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase",
                course.enrollmentStatus === "completed"
                  ? "bg-success-100 text-success-600"
                  : course.enrollmentStatus === "pending"
                    ? "bg-warn-100 text-warn-600"
                    : "bg-brand-50 text-brand-700",
              )}
            >
              {course.enrollmentStatus === "completed"
                ? "Completed"
                : course.enrollmentStatus === "pending"
                  ? "Pending"
                  : "Enrolled"}
            </span>
          ) : null}
        </div>

        {course.enrolled ? (
          <div className="mt-auto pt-3">
            <div className="mb-1 flex items-center justify-between text-[10px] font-bold">
              <span className="text-ink-400">Progress</span>
              <span className="text-ink-700">{course.progress}%</span>
            </div>
            <ProgressBar
              value={course.progress}
              tone={course.progress >= 100 ? "success" : "brand"}
              className="h-1.5"
            />
          </div>
        ) : (
          <span className="mt-3 inline-flex items-center gap-1 pt-0.5 text-[10.5px] font-black tracking-wide text-brand-600 uppercase">
            {course.visibility === "public" ? "Start course" : "View course"}
            <Icon name="arrow-right" size={11} strokeWidth={2.6} />
          </span>
        )}
      </div>
    </Link>
  );
}
