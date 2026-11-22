import type { Metadata } from "next";
import Link from "next/link";

import { EnrollButton } from "@/components/classhub/enroll-button";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { EmptyState, SectionHeader, VerifiedTick } from "@/components/ui/primitives";
import { ShareButton } from "@/components/ui/share-button";
import { getCurrentUser } from "@/lib/auth";
import { getOpenClasses } from "@/lib/classhub";
import { db } from "@/lib/db";
import { compactNumber } from "@/lib/format";

export const metadata: Metadata = {
  title: "Classes",
  description:
    "Browse tuition classes in Sri Lanka, meet the teacher, and join the class that fits your schedule.",
  alternates: { canonical: "/classes" },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const MODE_META: Record<string, { label: string; icon: string; chip: string }> = {
  physical: {
    label: "Physical",
    icon: "location",
    chip: "bg-brand-50 text-brand-700",
  },
  online: {
    label: "Online",
    icon: "globe",
    chip: "bg-accent-50 text-accent-700",
  },
  both: {
    label: "Hybrid",
    icon: "grid",
    chip: "bg-success-50 text-success-700",
  },
};

function parseSchedule(raw: string | null): { days: string; time: string } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as {
      days?: unknown;
      startTime?: unknown;
      endTime?: unknown;
    };
    const days = Array.isArray(parsed.days)
      ? parsed.days.filter((day): day is string => typeof day === "string")
      : [];
    const time =
      typeof parsed.startTime === "string" && typeof parsed.endTime === "string"
        ? `${parsed.startTime} – ${parsed.endTime}`
        : "";
    if (days.length === 0 && !time) return null;
    return { days: days.join(", "), time };
  } catch {
    return null;
  }
}

export default async function ClassesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const rawQuery = sp.q;
  const query = (Array.isArray(rawQuery) ? rawQuery[0] : rawQuery)?.trim() ?? "";

  const user = await getCurrentUser();
  const { classes, enrolledClassIds } = await getOpenClasses({
    query: query || undefined,
    viewerId: user?.id ?? null,
  });

  const subjectIds = [...new Set(classes.map((cls) => cls.subjectId).filter(Boolean))] as string[];
  const subjects =
    subjectIds.length > 0
      ? await db.subject.findMany({
          where: { id: { in: subjectIds } },
          select: { id: true, name: true },
        })
      : [];
  const subjectById = new Map(subjects.map((subject) => [subject.id, subject.name]));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-8 pb-16 sm:px-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-accent-700 p-7 text-white shadow-2xl sm:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 -left-10 size-72 rounded-full bg-accent-400/20 blur-3xl"
        />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-[10.5px] font-black tracking-[0.16em] uppercase backdrop-blur-sm">
            <Icon name="school" size={13} /> ClassHub
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
            Find a class that fits your week.
          </h1>
          <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed font-semibold text-white/85">
            Join live classes from teachers across Sri Lanka — track sessions, assignments and
            attendance all in one place.
          </p>

          <form action="/classes" className="relative mt-6 flex max-w-lg gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-white/60">
                <Icon name="search" size={16} />
              </span>
              <Input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search by class or teacher…"
                className="h-11 border-white/20 bg-white/95 pl-9 text-ink-900 placeholder:text-ink-400"
                aria-label="Search classes"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-11 flex-none items-center gap-2 rounded-full bg-white px-5 text-[13px] font-bold text-brand-700 shadow-lg transition-transform hover:-translate-y-0.5"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Results */}
      <section className="mt-8">
        <SectionHeader
          title={query ? `Results for “${query}”` : "Open classes"}
          subtitle={
            classes.length === 0
              ? undefined
              : `${classes.length} class${classes.length === 1 ? "" : "es"} accepting students`
          }
          action={
            user?.role === "teacher" ? (
              <Link
                href="/classhub/create"
                className="text-sm font-bold text-brand-600 hover:underline"
              >
                Create a class
              </Link>
            ) : undefined
          }
        />

        {classes.length === 0 ? (
          <EmptyState
            icon="school"
            title={query ? "No classes match that search" : "No open classes yet"}
            description={
              query
                ? "Try a different subject, teacher or class name."
                : "Teachers are setting up their classrooms. Check back soon, or explore teachers directly."
            }
            action={
              query ? (
                <Link href="/classes" className="text-sm font-bold text-brand-600 hover:underline">
                  Clear search
                </Link>
              ) : (
                <Link href="/explore" className="text-sm font-bold text-brand-600 hover:underline">
                  Explore teachers
                </Link>
              )
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls) => {
              const mode = MODE_META[cls.mode] ?? MODE_META.both!;
              const schedule = parseSchedule(cls.schedule);
              const enrolled = enrolledClassIds.has(cls.id);
              const isTeacher = user?.id === cls.teacher.id;
              const seatsLeft = cls.maxStudents
                ? Math.max(0, cls.maxStudents - cls._count.enrollments)
                : null;
              const isFull = seatsLeft === 0;
              const fillPct =
                cls.maxStudents && cls.maxStudents > 0
                  ? Math.min(100, Math.round((cls._count.enrollments / cls.maxStudents) * 100))
                  : null;

              return (
                <article
                  key={cls.id}
                  className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-ink-100 transition-all hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <div className="relative h-36 overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-accent-700">
                    {cls.coverKey ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/media/${cls.coverKey}`}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <>
                        <div
                          aria-hidden="true"
                          className="absolute -top-10 -right-8 size-32 rounded-full bg-white/10 blur-2xl"
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-white/75">
                          <Icon name="school" size={34} />
                        </div>
                      </>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-900/45 via-transparent to-transparent" />
                    <span
                      className={`absolute top-3 left-3 inline-flex items-center gap-1 rounded-chip px-2 py-0.5 text-[9.5px] font-black tracking-[0.1em] uppercase shadow-sm ${mode.chip}`}
                    >
                      <Icon name={mode.icon} size={10} strokeWidth={2.8} />
                      {mode.label}
                    </span>
                    {enrolled ? (
                      <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-chip bg-success-600/95 px-2 py-0.5 text-[9.5px] font-black tracking-[0.1em] text-white uppercase shadow-sm">
                        <Icon name="check" size={10} strokeWidth={3} /> Joined
                      </span>
                    ) : isFull ? (
                      <span className="absolute top-3 right-3 rounded-chip bg-ink-900/70 px-2 py-0.5 text-[9.5px] font-black tracking-[0.1em] text-white uppercase backdrop-blur-sm">
                        Full
                      </span>
                    ) : null}
                  </div>

                  <div className="flex-1 p-5">
                    <h3 className="line-clamp-2 text-[17px] leading-snug font-extrabold text-ink-900 transition-colors group-hover:text-brand-700">
                      <Link href={`/classhub/class/${cls.id}`}>{cls.name}</Link>
                    </h3>

                    {cls.description ? (
                      <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-ink-500">
                        {cls.description}
                      </p>
                    ) : null}

                    <Link
                      href={
                        cls.teacher.teacherProfile?.handle
                          ? `/teacher/${cls.teacher.teacherProfile.handle}`
                          : "/classes"
                      }
                      className="mt-3 flex items-center gap-2 text-[12px] font-bold text-ink-600 hover:text-brand-700"
                    >
                      <Avatar
                        name={cls.teacher.name}
                        src={cls.teacher.avatarKey ? `/api/media/${cls.teacher.avatarKey}` : null}
                        size="xs"
                      />
                      <span className="truncate">{cls.teacher.name}</span>
                      {cls.teacher.teacherProfile?.verifiedStatus === "verified" ? (
                        <VerifiedTick />
                      ) : null}
                    </Link>

                    <dl className="mt-4 space-y-1.5 text-[11.5px] font-semibold text-ink-500">
                      {schedule ? (
                        <div className="flex items-start gap-2">
                          <dt className="mt-0.5 flex-none text-brand-500">
                            <Icon name="calendar" size={13} />
                          </dt>
                          <dd className="min-w-0">
                            <span className="block truncate">{schedule.days || "Flexible days"}</span>
                            {schedule.time ? (
                              <span className="block text-ink-400">{schedule.time}</span>
                            ) : null}
                          </dd>
                        </div>
                      ) : null}
                      {cls.subjectId && subjectById.get(cls.subjectId) ? (
                        <div className="flex items-center gap-2">
                          <dt className="flex-none text-brand-500">
                            <Icon name="book" size={13} />
                          </dt>
                          <dd className="truncate">{subjectById.get(cls.subjectId)}</dd>
                        </div>
                      ) : null}
                      <div className="flex items-center gap-2">
                        <dt className="flex-none text-brand-500">
                          <Icon name="users" size={13} />
                        </dt>
                        <dd>
                          {cls._count.enrollments}
                          {cls.maxStudents ? ` / ${cls.maxStudents}` : ""} students
                          {seatsLeft !== null && seatsLeft > 0 && seatsLeft <= 5 ? (
                            <span className="ml-1.5 font-bold text-warn-600">
                              · {seatsLeft} left
                            </span>
                          ) : null}
                        </dd>
                      </div>
                    </dl>

                    {fillPct !== null ? (
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-100">
                        <div
                          className={`h-full rounded-full ${
                            isFull
                              ? "bg-ink-400"
                              : fillPct > 80
                                ? "bg-warn-500"
                                : "bg-gradient-to-r from-brand-500 to-accent-500"
                          }`}
                          style={{ width: `${Math.max(4, fillPct)}%` }}
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-ink-100 bg-ink-50/60 px-5 py-3.5">
                    <div className="min-w-0">
                      {cls.feeAmount ? (
                        <>
                          <span className="block text-[14px] font-black text-ink-900">
                            Rs. {compactNumber(cls.feeAmount)}
                          </span>
                          <span className="text-[10.5px] font-bold text-ink-400 capitalize">
                            {cls.feeFrequency === "per_session"
                              ? "per session"
                              : cls.feeFrequency === "course"
                                ? "full course"
                                : "per month"}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="block text-[14px] font-black text-success-700">Free</span>
                          <span className="text-[10.5px] font-bold text-ink-400">no fee listed</span>
                        </>
                      )}
                    </div>
                    <div className="flex flex-none items-center gap-2">
                      <ShareButton
                        path={`/classhub/class/${cls.id}`}
                        title={`${cls.name} · GuruLens`}
                        text={`Join ${cls.name} with ${cls.teacher.name} on GuruLens`}
                        label="Share class"
                        iconOnly
                      />
                      <EnrollButton
                        classId={cls.id}
                        studentId={user?.id ?? null}
                        initialEnrolled={enrolled}
                        isAuthenticated={Boolean(user)}
                        isTeacher={isTeacher}
                        isFull={isFull}
                        className="w-36 flex-none"
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
