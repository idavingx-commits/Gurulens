import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icons";
import { VerifiedTick } from "@/components/ui/primitives";
import type { TeacherCard as TeacherCardData } from "@/lib/data";
import { cn } from "@/lib/format";

const MODE_LABEL: Record<string, string> = {
  physical: "Physical",
  online: "Online",
  both: "Online + Physical",
};

export function TeacherCard({
  teacher,
  className,
}: {
  teacher: TeacherCardData;
  className?: string;
}) {
  const subjects = teacher.subjects.slice(0, 3);
  const extraSubjects = teacher.subjects.length - subjects.length;
  const districts = teacher.districts.slice(0, 2).map((d) => d.name);
  const extraDistricts = teacher.districts.length - districts.length;

  return (
    <Link
      href={`/teacher/${teacher.handle}`}
      className={cn(
        "group relative flex flex-col gap-4 overflow-hidden rounded-2xl bg-white p-5 shadow-md ring-1 ring-ink-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-brand-200/50",
        className,
      )}
    >
      {/* Subtle gradient overlay on hover */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-brand-50/0 to-accent-50/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-hover:from-brand-50/50 group-hover:to-accent-50/30"
      />
      <div className="flex items-start gap-3.5">
        <Avatar name={teacher.name} src={teacher.avatarId ? `/api/media/${teacher.avatarId}` : null} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-[15px] font-bold text-ink-900 group-hover:text-brand-700">
              {teacher.name}
            </h3>
            {teacher.verified ? <VerifiedTick /> : null}
          </div>
          {teacher.tagline ? (
            <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-ink-500">{teacher.tagline}</p>
          ) : null}
          <div className="mt-1.5 flex items-center gap-2 text-[12px] font-semibold text-ink-400">
            <span className="inline-flex items-center gap-1">
              <Icon name="star" size={13} className="text-warn-500" />
              <span className="text-ink-700 tabular-nums">
                {teacher.avgStars !== null && teacher.reviewCount > 0 ? teacher.avgStars.toFixed(1) : "New"}
              </span>
              {teacher.reviewCount > 0 ? (
                <span className="font-medium text-ink-400">({teacher.reviewCount})</span>
              ) : null}
            </span>
            {teacher.experienceYears ? (
              <span className="inline-flex items-center gap-1">
                <Icon name="clock" size={13} />
                {teacher.experienceYears} yr{teacher.experienceYears > 1 ? "s" : ""}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {subjects.map((s) => (
          <span
            key={s.slug}
            className="rounded-chip bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700"
          >
            {s.name}
          </span>
        ))}
        {extraSubjects > 0 ? (
          <span className="rounded-chip bg-ink-100 px-2.5 py-1 text-[11px] font-bold text-ink-500">
            +{extraSubjects}
          </span>
        ) : null}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-ink-100 pt-3 text-[12px] font-semibold text-ink-400">
        <span className="inline-flex min-w-0 items-center gap-1 truncate">
          <Icon name="location" size={13} className="flex-none" />
          <span className="truncate">
            {districts.join(", ")}
            {extraDistricts > 0 ? ` +${extraDistricts}` : ""}
          </span>
        </span>
        <span
          className={cn(
            "flex-none rounded-chip px-2 py-0.5 text-[11px] font-bold",
            teacher.mode === "online" ? "bg-accent-100 text-accent-700" : "bg-success-100 text-success-600",
          )}
        >
          {MODE_LABEL[teacher.mode] ?? teacher.mode}
        </span>
      </div>
    </Link>
  );
}
