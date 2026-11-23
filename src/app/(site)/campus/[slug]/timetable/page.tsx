import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { EmptyState, InfoNote, SectionHeader, Stat } from "@/components/ui/primitives";
import { ShareButton } from "@/components/ui/share-button";
import { getAuth } from "@/lib/auth";
import {
  campusDayKey,
  campusDayLabel,
  campusTimeLabel,
  getCampusTimetable,
  getCampusUpcomingSessions,
  getCampusWeeklySchedule,
} from "@/lib/campus";
import { getOrgAccess, getOrganizationBySlug } from "@/lib/organizations";
import {
  canViewSchoolContent,
  getSchoolClasses,
  getSchoolContext,
  getSchoolTimetable,
  SCHOOL_DAYS,
} from "@/lib/school";
import { CampusNav } from "../campus-nav";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ branch?: string; range?: string; class?: string }>;
};

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 14, label: "2 weeks" },
  { days: 30, label: "30 days" },
] as const;

const MODE_LABEL: Record<string, string> = {
  physical: "Physical",
  online: "Online",
  both: "Hybrid",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);
  if (!org) return { title: "Campus not found" };
  const imageKey = org.coverKey ?? org.logoKey;
  const imageUrl = imageKey ? `/api/media/${imageKey}` : "/brand/og-default.png";
  return {
    title: `${org.name} timetable · Campus`,
    description: `See upcoming classes and the weekly timetable at ${org.name}.`,
    alternates: { canonical: `/campus/${slug}/timetable` },
    openGraph: {
      type: "website",
      title: `${org.name} timetable · GuruLens Campus`,
      description: `Upcoming classes and weekly schedule at ${org.name}.`,
      url: `/campus/${slug}/timetable`,
      images: [{ url: imageUrl, alt: `${org.name} on GuruLens Campus` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${org.name} timetable · GuruLens Campus`,
      description: `Upcoming classes and weekly schedule at ${org.name}.`,
      images: [imageUrl],
    },
  };
}

export default async function CampusTimetablePage({ params, searchParams }: Props) {
  const auth = await getAuth();
  const { slug } = await params;
  if (!auth) redirect(`/login?redirect=/campus/${slug}/timetable`);

  const org = await getOrganizationBySlug(slug);
  if (!org) notFound();
  const campusSlug = org.slug;

  const access = await getOrgAccess(auth.user.id, auth.user.role, org.id);
  const query = await searchParams;

  // -------------------------------------------------------------------------
  // Schools: weekly period grid, members only.
  // -------------------------------------------------------------------------
  if (org.type === "school") {
    const context = await getSchoolContext(auth.user.id, org.id);
    const allowed = canViewSchoolContent(auth.user.role, context.isMember);
    const classes = await getSchoolClasses(org.id);

    const ownClassId = context.membership?.schoolClassId ?? null;
    const selectedClassId =
      classes.find((c) => c.id === query.class)?.id ??
      (ownClassId && classes.some((c) => c.id === ownClassId) ? ownClassId : null) ??
      classes[0]?.id ??
      null;

    const entries =
      allowed && selectedClassId ? await getSchoolTimetable(org.id, selectedClassId) : [];

    const cellMap = new Map(entries.map((e) => [`${e.dayOfWeek}:${e.period}`, e]));
    const maxPeriod = Math.max(8, ...entries.map((e) => e.period));
    const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1);
    const hasWeekend = entries.some((e) => e.dayOfWeek >= 6);
    const days = SCHOOL_DAYS.filter((d) => d.day <= 5 || (hasWeekend && d.day >= 6));
    const selectedClass = classes.find((c) => c.id === selectedClassId) ?? null;

    return (
      <div className="mx-auto w-full max-w-5xl px-4 pt-6 pb-12 sm:px-6">
        <div className="mb-1">
          <Link
            href={`/campus/${org.slug}`}
            className="inline-flex items-center gap-1 text-[12px] font-bold text-ink-400 transition-colors hover:text-brand-600"
          >
            <Icon name="arrow-left" size={13} /> Back to {org.name}
          </Link>
        </div>

        <CampusNav slug={org.slug} active="timetable" canManage={access.canManage} />

        <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
              School timetable
            </h1>
            <p lang="si" className="font-si mt-1 text-[13px] font-semibold leading-[1.85] text-ink-500">
              {org.name} — සතියේ පන්ති කාලසටහන. විද්‍යාලයේ සිසුන්ට සහ ගුරුවරුන්ට පමණි.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {access.canManage ? (
              <LinkButton href={`/campus/${org.slug}/manage#timetable`} size="sm">
                <Icon name="pencil" size={14} /> Edit timetable
              </LinkButton>
            ) : null}
            <ShareButton
              path={`/campus/${org.slug}`}
              title={`${org.name} · GuruLens Campus`}
              text={`Visit ${org.name} on GuruLens Campus`}
              label="Share school"
            />
          </div>
        </header>

        {!allowed ? (
          <div className="mt-6">
            <InfoNote icon="lock" tone="warn">
              <p className="font-bold">This timetable is for {org.name} students and teachers only.</p>
              <p className="mt-1">
                Anyone can view the school profile and published posts, but class timetables are
                private to the school. Register with your admission number (student) or staff ID
                (teacher) to get access.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {context.isPending ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-warn-100 px-3.5 py-1.5 text-[12px] font-bold text-warn-600">
                    <Icon name="clock" size={13} /> Your registration is awaiting approval
                  </span>
                ) : (
                  <LinkButton href={`/campus/${org.slug}/join`} size="sm">
                    <Icon name="user-plus" size={14} /> Join this school
                  </LinkButton>
                )}
                <LinkButton href={`/campus/${org.slug}`} variant="outline" size="sm">
                  <Icon name="grid" size={14} /> View public profile
                </LinkButton>
              </div>
            </InfoNote>
          </div>
        ) : classes.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon="calendar"
              title="No classes set up yet"
              description={
                access.canManage
                  ? "Create grade/section groups (like 10-A) and build their weekly timetables from the manage page."
                  : "The school has not published its class groups yet. Check back soon."
              }
              action={
                access.canManage ? (
                  <LinkButton href={`/campus/${org.slug}/manage#timetable`} size="sm">
                    <Icon name="plus" size={14} /> Set up classes
                  </LinkButton>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            {/* Class selector */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {classes.map((c) => (
                <Link
                  key={c.id}
                  href={`/campus/${campusSlug}/timetable?class=${c.id}`}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition-colors ${
                    selectedClassId === c.id
                      ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                      : "border-ink-200 bg-white/80 text-ink-600 hover:border-brand-300 hover:text-brand-700"
                  }`}
                >
                  <Icon name="school" size={12} />
                  {c.name}
                  {ownClassId === c.id ? (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase ${
                        selectedClassId === c.id ? "bg-white/20" : "bg-brand-50 text-brand-600"
                      }`}
                    >
                      My class
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Class" value={selectedClass?.name ?? "—"} icon="school" />
              <Stat label="Students" value={selectedClass?._count.members ?? 0} icon="users" />
              <Stat label="Periods / day" value={maxPeriod} icon="clock" />
              <Stat
                label="Room"
                value={selectedClass?.room ?? "—"}
                icon="location"
              />
            </div>

            {/* Period grid */}
            <div className="card mt-5 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="bg-ink-50/80">
                    <th className="w-16 px-3 py-2.5 text-[10.5px] font-black tracking-wide text-ink-400 uppercase">
                      Period
                    </th>
                    {days.map((d) => (
                      <th
                        key={d.day}
                        className="px-3 py-2.5 text-[11px] font-extrabold tracking-wide text-ink-700 uppercase"
                      >
                        {d.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periods.map((period) => (
                    <tr key={period} className="border-t border-ink-100">
                      <td className="px-3 py-2 align-top text-[12px] font-extrabold text-ink-400 tabular-nums">
                        {period}
                      </td>
                      {days.map((d) => {
                        const entry = cellMap.get(`${d.day}:${period}`);
                        return (
                          <td key={d.day} className="px-2 py-2 align-top">
                            {entry ? (
                              <div className="rounded-xl bg-brand-50/70 px-2.5 py-2">
                                <p className="text-[12px] leading-snug font-extrabold text-ink-900">
                                  {entry.subject}
                                </p>
                                {entry.teacher ? (
                                  <p className="mt-0.5 truncate text-[10.5px] font-semibold text-ink-500">
                                    {entry.teacher}
                                  </p>
                                ) : null}
                                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[9.5px] font-bold text-brand-600">
                                  {entry.startTime ? (
                                    <span className="tabular-nums">
                                      {entry.startTime}
                                      {entry.endTime ? `–${entry.endTime}` : ""}
                                    </span>
                                  ) : null}
                                  {entry.room ? (
                                    <span className="inline-flex items-center gap-0.5 text-ink-400">
                                      <Icon name="location" size={9} />
                                      {entry.room}
                                    </span>
                                  ) : null}
                                </p>
                              </div>
                            ) : (
                              <span className="block px-2.5 py-2 text-[11px] text-ink-200">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {entries.length === 0 ? (
              <p className="mt-3 text-[12px] font-semibold text-ink-400">
                No periods have been added for {selectedClass?.name ?? "this class"} yet.
                {access.canManage ? " Use “Edit timetable” to build the week." : ""}
              </p>
            ) : null}
          </>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Institutes: the original session-based timetable.
  // -------------------------------------------------------------------------
  if (!access.canView) notFound();

  const branches = org.branches;
  const branchId = branches.some((branch) => branch.id === query.branch) ? query.branch : undefined;
  const range = RANGES.find((item) => String(item.days) === query.range)?.days ?? 14;

  const now = new Date();
  const to = new Date(now.getTime() + range * 24 * 60 * 60 * 1000);

  const [sessions, weekly, nextUp] = await Promise.all([
    getCampusTimetable(org.id, { from: now, to, branchId }),
    getCampusWeeklySchedule(org.id),
    getCampusUpcomingSessions(org.id, { take: 1, branchId }),
  ]);

  const groups = new Map<string, typeof sessions>();
  for (const session of sessions) {
    const key = campusDayKey(session.scheduledAt);
    const list = groups.get(key) ?? [];
    list.push(session);
    groups.set(key, list);
  }

  const days = [...groups.entries()].map(([key, list]) => ({
    key,
    label: campusDayLabel(list[0].scheduledAt),
    sessions: list,
  }));

  const todayKey = campusDayKey(now);
  const tomorrowKey = campusDayKey(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  const classIds = new Set(sessions.map((session) => session.class.id));
  const filteredWeekly = weekly
    .map((day) => ({
      ...day,
      entries: branchId
        ? day.entries.filter((entry) => entry.branch?.id === branchId)
        : day.entries,
    }))
    .filter((day) => day.entries.length > 0);

  function href(next: { branch?: string; range?: number }) {
    const params = new URLSearchParams();
    const nextBranch = next.branch !== undefined ? next.branch : branchId;
    const nextRange = next.range ?? range;
    if (nextBranch) params.set("branch", nextBranch);
    if (nextRange !== 14) params.set("range", String(nextRange));
    const qs = params.toString();
    return qs ? `/campus/${campusSlug}/timetable?${qs}` : `/campus/${campusSlug}/timetable`;
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-6 pb-12 sm:px-6">
      <div className="mb-1">
        <Link
          href={`/campus/${org.slug}`}
          className="inline-flex items-center gap-1 text-[12px] font-bold text-ink-400 transition-colors hover:text-brand-600"
        >
          <Icon name="arrow-left" size={13} /> Back to {org.name}
        </Link>
      </div>

      <CampusNav slug={org.slug} active="timetable" canManage={access.canManage} />

      <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Timetable</h1>
          <p className="mt-1 text-[13px] text-ink-500">
            Upcoming sessions and the regular weekly schedule for {org.name}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ShareButton
            path={`/campus/${org.slug}/timetable`}
            title={`${org.name} timetable · GuruLens Campus`}
            text={`See the timetable at ${org.name} on GuruLens`}
            label="Share timetable"
          />
          <LinkButton href={`/campus/${org.slug}`} variant="outline" size="sm">
            <Icon name="grid" size={14} /> Overview
          </LinkButton>
        </div>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Sessions" value={sessions.length} icon="calendar" />
        <Stat label="Classes" value={classIds.size} icon="book-open" />
        <Stat label="Days" value={days.length} icon="clock" />
        <Stat
          label="Next up"
          value={nextUp[0] ? campusTimeLabel(nextUp[0].scheduledAt) : "—"}
          icon="zap"
          hint={nextUp[0] ? nextUp[0].class.name : "Nothing scheduled"}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {RANGES.map((item) => (
          <Link
            key={item.days}
            href={href({ range: item.days })}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition-colors ${
              range === item.days
                ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                : "border-ink-200 bg-white/80 text-ink-600 hover:border-brand-300 hover:text-brand-700"
            }`}
          >
            <Icon name="clock" size={12} /> {item.label}
          </Link>
        ))}
        {branches.length > 1 ? (
          <span className="ml-auto flex flex-wrap items-center gap-2">
            <Link
              href={href({ branch: "" })}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11.5px] font-bold transition-colors ${
                !branchId
                  ? "border-ink-900 bg-ink-900 text-white"
                  : "border-ink-200 bg-white/80 text-ink-600 hover:border-brand-300"
              }`}
            >
              <Icon name="location" size={12} /> All branches
            </Link>
            {branches.map((branch) => (
              <Link
                key={branch.id}
                href={href({ branch: branch.id })}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11.5px] font-bold transition-colors ${
                  branchId === branch.id
                    ? "border-ink-900 bg-ink-900 text-white"
                    : "border-ink-200 bg-white/80 text-ink-600 hover:border-brand-300"
                }`}
              >
                {branch.name}
              </Link>
            ))}
          </span>
        ) : null}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <SectionHeader
            title="Upcoming sessions"
            subtitle={`Next ${range} days${sessions.length === 0 ? "" : ` · ${sessions.length} session${sessions.length === 1 ? "" : "s"}`}`}
          />
          {sessions.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="No sessions scheduled"
              description="When teachers schedule class sessions they will appear here automatically."
              action={
                access.canManage ? (
                  <LinkButton href="/classhub" variant="outline">
                    Open ClassHub
                  </LinkButton>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-5">
              {days.map((day) => (
                <div key={day.key}>
                  <div className="mb-2 flex items-center gap-2">
                    <h3 className="text-[13px] font-extrabold tracking-wide text-ink-800 uppercase">
                      {day.key === todayKey
                        ? "Today"
                        : day.key === tomorrowKey
                          ? "Tomorrow"
                          : day.label}
                    </h3>
                    <span className="rounded-chip bg-ink-100 px-2 py-0.5 text-[10.5px] font-bold text-ink-500">
                      {day.sessions.length} session{day.sessions.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="card divide-y divide-ink-100">
                    {day.sessions.map((session) => (
                      <div key={session.id} className="flex flex-wrap items-start gap-3 p-3.5">
                        <div className="flex w-14 flex-none flex-col items-center rounded-xl bg-brand-50 px-2 py-1.5 text-brand-700">
                          <span className="text-[13px] font-extrabold tabular-nums">
                            {campusTimeLabel(session.scheduledAt)}
                          </span>
                          <span className="text-[10px] font-bold text-brand-500">
                            {session.duration} min
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-1.5">
                            <Link
                              href={`/classhub/class/${session.class.id}`}
                              className="truncate text-[13px] font-bold text-ink-900 hover:text-brand-700"
                            >
                              {session.class.name}
                            </Link>
                            {session.status === "in_progress" ? (
                              <span className="rounded-chip bg-success-100 px-1.5 py-0.5 text-[10px] font-bold text-success-600">
                                Live
                              </span>
                            ) : null}
                            <span className="rounded-chip bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold text-ink-500">
                              {MODE_LABEL[session.class.mode] ?? session.class.mode}
                            </span>
                          </p>
                          {session.topic ? (
                            <p className="mt-0.5 line-clamp-1 text-[12px] text-ink-500">
                              {session.topic}
                            </p>
                          ) : null}
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] font-semibold text-ink-400">
                            <span className="inline-flex items-center gap-1">
                              <Avatar
                                name={session.class.teacher.name}
                                src={
                                  session.class.teacher.avatarKey
                                    ? `/api/media/${session.class.teacher.avatarKey}`
                                    : null
                                }
                                size="xs"
                              />
                              {session.class.teacher.name}
                            </span>
                            {session.class.branch ? (
                              <span className="inline-flex items-center gap-0.5">
                                <Icon name="location" size={10} />
                                {session.class.branch.name}
                              </span>
                            ) : null}
                          </p>
                        </div>
                        <Link
                          href={`/classhub/class/${session.class.id}`}
                          className="flex-none text-[11.5px] font-bold text-brand-600 hover:underline"
                        >
                          Open class
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionHeader title="Weekly schedule" subtitle="Regular class times" />
          {filteredWeekly.length === 0 ? (
            <InfoNote icon="clock">
              No weekly class times have been added yet. Teachers can add them from ClassHub.
            </InfoNote>
          ) : (
            <div className="card divide-y divide-ink-100">
              {filteredWeekly.map((day) => (
                <div key={day.day} className="p-3.5">
                  <p className="text-[11.5px] font-extrabold tracking-wide text-ink-500 uppercase">
                    {day.day}
                  </p>
                  <ul className="mt-1.5 space-y-1.5">
                    {day.entries.map((entry, index) => (
                      <li key={`${entry.classId}-${index}`} className="flex items-start gap-2">
                        <span className="w-[86px] flex-none text-[11.5px] font-bold text-brand-600 tabular-nums">
                          {entry.startTime}
                          {entry.endTime ? `–${entry.endTime}` : ""}
                        </span>
                        <span className="min-w-0">
                          <Link
                            href={`/classhub/class/${entry.classId}`}
                            className="block truncate text-[12px] font-bold text-ink-800 hover:text-brand-700"
                          >
                            {entry.name}
                          </Link>
                          <span className="block truncate text-[10.5px] font-semibold text-ink-400">
                            {entry.teacher.name}
                            {entry.branch ? ` · ${entry.branch.name}` : ""}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
