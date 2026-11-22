import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { EmptyState, InfoNote, SectionHeader, Stat } from "@/components/ui/primitives";
import { ShareButton } from "@/components/ui/share-button";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, timeAgo } from "@/lib/format";
import { ClassCover } from "@/components/classhub/class-cover";
import { EnrollButton } from "@/components/classhub/enroll-button";
import {
  ClassAssignments,
  type AssignmentItem,
  type SubmissionItem,
} from "./class-assignments";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const cls = await db.class.findUnique({
    where: { id },
    select: {
      name: true,
      description: true,
      coverKey: true,
      teacher: { select: { name: true } },
    },
  });
  if (!cls) return { title: "Class not found" };

  const description =
    cls.description?.slice(0, 150) ??
    `Join ${cls.name} with ${cls.teacher.name} on GuruLens ClassHub.`;
  const imageUrl = cls.coverKey ? `/api/media/${cls.coverKey}` : "/brand/og-default.png";

  return {
    title: cls.name,
    description,
    openGraph: {
      type: "website",
      title: `${cls.name} · GuruLens`,
      description,
      url: `/classhub/class/${id}`,
      images: [{ url: imageUrl, alt: `${cls.name} on GuruLens` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${cls.name} · GuruLens`,
      description,
      images: [imageUrl],
    },
  };
}

const MODE_LABEL: Record<string, string> = {
  physical: "Physical class",
  online: "Online class",
  both: "Physical & online",
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

function parseStringArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function toSubmission(row: {
  id: string;
  studentId: string;
  status: string;
  content: string | null;
  attachments: string | null;
  score: number | null;
  feedback: string | null;
  submittedAt: Date;
  student: { name: string; avatarKey: string | null };
}): SubmissionItem {
  return {
    id: row.id,
    studentId: row.studentId,
    studentName: row.student.name,
    studentAvatarKey: row.student.avatarKey,
    status: row.status,
    content: row.content,
    attachments: parseStringArray(row.attachments),
    score: row.score,
    feedback: row.feedback,
    submittedAt: row.submittedAt.toISOString(),
  };
}

export default async function ClassDetailPage({ params }: Props) {
  const { id } = await params;
  const auth = await getAuth();
  if (!auth) redirect(`/login?redirect=/classhub/class/${id}`);

  const cls = await db.class.findUnique({
    where: { id },
    include: {
      teacher: {
        select: {
          id: true,
          name: true,
          avatarKey: true,
          teacherProfile: { select: { handle: true, verifiedStatus: true } },
        },
      },
      organization: { select: { id: true, name: true, slug: true } },
      enrollments: {
        where: { status: "active" },
        include: {
          student: { select: { id: true, name: true, avatarKey: true } },
        },
        orderBy: { enrolledAt: "asc" },
      },
      _count: {
        select: {
          enrollments: { where: { status: "active" } },
          assignments: true,
          sessions: true,
        },
      },
    },
  });

  if (!cls) notFound();

  const isAdmin = auth.user.role === "admin" || auth.user.role === "moderator";
  const isManager = cls.teacherId === auth.user.id || isAdmin;
  const myEnrollment = cls.enrollments.find((row) => row.studentId === auth.user.id) ?? null;
  const isEnrolled = Boolean(myEnrollment);

  if (cls.status !== "active" && !isManager) notFound();

  const [assignmentRows, sessions] = await Promise.all([
    db.assignment.findMany({
      where: { classId: id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { submissions: true } },
        submissions: {
          where: isManager ? undefined : { studentId: auth.user.id },
          include: { student: { select: { name: true, avatarKey: true } } },
          orderBy: { submittedAt: "desc" },
        },
      },
    }),
    db.classSession.findMany({
      where: { classId: id },
      orderBy: { scheduledAt: "desc" },
      take: 12,
    }),
  ]);

  const assignments: AssignmentItem[] = assignmentRows.map((assignment) => {
    const submissions = assignment.submissions.map(toSubmission);
    return {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      dueAt: assignment.dueAt ? assignment.dueAt.toISOString() : null,
      maxScore: assignment.maxScore,
      createdAt: assignment.createdAt.toISOString(),
      submissionCount: assignment._count.submissions,
      mySubmission: isManager
        ? null
        : (submissions.find((row) => row.studentId === auth.user.id) ?? null),
      submissions: isManager ? submissions : [],
    };
  });

  const schedule = parseSchedule(cls.schedule);
  const teacherHref = cls.teacher.teacherProfile?.handle
    ? `/teacher/${cls.teacher.teacherProfile.handle}`
    : "/explore";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-6 pb-16 sm:px-6">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-[12px] font-bold text-ink-400">
        <Link href={isManager ? "/classhub" : "/classes"} className="hover:text-brand-600">
          {isManager ? "ClassHub" : "Classes"}
        </Link>
        <Icon name="chevron-right" size={13} />
        <span className="truncate text-ink-600">{cls.name}</span>
      </div>

      {/* Class hero */}
      <section className="overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-ink-100">
        <ClassCover
          classId={cls.id}
          coverUrl={cls.coverKey ? `/api/media/${cls.coverKey}` : null}
          canEdit={isManager}
        />
        <div className="relative p-6 sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-brand-500/10 blur-3xl"
          />
          <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-chip bg-brand-50 px-2.5 py-1 text-[10px] font-black tracking-[0.12em] text-brand-700 uppercase">
                <Icon name={cls.mode === "online" ? "globe" : "school"} size={11} />
                {MODE_LABEL[cls.mode] ?? "Class"}
              </span>
              {cls.organization ? (
                <span className="rounded-chip bg-accent-50 px-2.5 py-1 text-[10px] font-black tracking-[0.12em] text-accent-700 uppercase">
                  {cls.organization.name}
                </span>
              ) : null}
              {isEnrolled ? (
                <span className="inline-flex items-center gap-1 rounded-chip bg-success-50 px-2.5 py-1 text-[10px] font-black tracking-[0.12em] text-success-700 uppercase">
                  <Icon name="check" size={10} strokeWidth={3} /> Enrolled
                </span>
              ) : null}
            </div>

            <h1 className="mt-3 text-2xl font-black tracking-tight text-ink-900 sm:text-3xl">
              {cls.name}
            </h1>

            <Link
              href={teacherHref}
              className="mt-2 inline-flex items-center gap-2 text-[12.5px] font-bold text-ink-600 hover:text-brand-700"
            >
              <Avatar
                name={cls.teacher.name}
                src={cls.teacher.avatarKey ? `/api/media/${cls.teacher.avatarKey}` : null}
                size="xs"
              />
              {cls.teacher.name}
              {cls.teacher.teacherProfile?.verifiedStatus === "verified" ? (
                <Icon name="shield-check" size={13} className="text-brand-500" />
              ) : null}
            </Link>

            {cls.description ? (
              <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed whitespace-pre-line text-ink-600">
                {cls.description}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[12px] font-semibold text-ink-500">
              {schedule ? (
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="calendar" size={14} className="text-brand-500" />
                  {schedule.days || "Flexible days"}
                  {schedule.time ? ` · ${schedule.time}` : ""}
                </span>
              ) : null}
              {cls.location ? (
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="location" size={14} className="text-brand-500" />
                  {cls.location}
                </span>
              ) : null}
              {cls.feeAmount ? (
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="credit-card" size={14} className="text-brand-500" />
                  Rs. {cls.feeAmount.toLocaleString("en-LK")}
                  {cls.feeFrequency === "per_session"
                    ? " / session"
                    : cls.feeFrequency === "course"
                      ? " / course"
                      : " / month"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-success-700">
                  <Icon name="check-circle" size={14} /> Free
                </span>
              )}
            </div>
          </div>

          <div className="w-full flex-none sm:w-48">
            <EnrollButton
              classId={cls.id}
              studentId={auth.user.id}
              initialEnrolled={isEnrolled}
              isAuthenticated
              isTeacher={isManager}
              isFull={
                cls.maxStudents !== null && cls._count.enrollments >= cls.maxStudents && !isEnrolled
              }
            />
            {isManager ? (
              <LinkButton
                href="/classhub"
                variant="outline"
                size="sm"
                className="mt-2 w-full"
              >
                <Icon name="settings" size={14} /> Class dashboard
              </LinkButton>
            ) : null}
            <ShareButton
              path={`/classhub/class/${cls.id}`}
              title={`${cls.name} · GuruLens`}
              text={`Join ${cls.name} with ${cls.teacher.name} on GuruLens`}
              label="Share class"
              className="mt-2 w-full"
            />
            {cls.onlineLink && (isEnrolled || isManager) ? (
              <a
                href={cls.onlineLink}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-accent-50 px-3 py-2 text-[12px] font-bold text-accent-700 transition-colors hover:bg-accent-100"
              >
                <Icon name="video" size={14} /> Join online class
              </a>
            ) : null}
          </div>
          </div>
        </div>
      </section>

      {!isEnrolled && !isManager ? (
        <div className="mt-4">
          <InfoNote icon="info" tone="brand">
            You are previewing this class. Join it to submit assignments and see class updates.
          </InfoNote>
        </div>
      ) : null}

      {/* Stats */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Students" value={cls._count.enrollments} icon="users" />
        <Stat label="Assignments" value={cls._count.assignments} icon="clipboard" />
        <Stat label="Sessions" value={cls._count.sessions} icon="calendar" />
        <Stat
          label="Capacity"
          value={cls.maxStudents ? `${cls._count.enrollments}/${cls.maxStudents}` : "Open"}
          icon="grid"
          hint={cls.maxStudents ? "seats filled" : "unlimited seats"}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0 space-y-8">
          {/* Assignments */}
          <section id="assignments">
            <SectionHeader
              title="Assignments"
              subtitle={
                isManager
                  ? "Post work and grade submissions."
                  : "Submit your work and check feedback."
              }
            />
            <ClassAssignments
              classId={cls.id}
              canManage={isManager}
              isEnrolled={isEnrolled}
              assignments={assignments}
            />
          </section>

          {/* Sessions */}
          <section>
            <SectionHeader title="Class sessions" subtitle="Most recent first" />
            {sessions.length === 0 ? (
              <EmptyState
                icon="calendar"
                title="No sessions scheduled"
                description={
                  isManager
                    ? "Sessions you schedule for this class will appear here."
                    : "Your teacher has not scheduled any sessions yet."
                }
              />
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-3.5 shadow-sm"
                  >
                    <div className="flex size-11 flex-none flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                      <span className="text-[9px] font-black uppercase">
                        {session.scheduledAt.toLocaleDateString("en-GB", { month: "short" })}
                      </span>
                      <span className="text-base leading-none font-extrabold">
                        {session.scheduledAt.getDate()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-ink-900">
                        {session.topic || "Class session"}
                      </p>
                      <p className="text-[11.5px] font-semibold text-ink-400">
                        {formatDate(session.scheduledAt)} ·{" "}
                        {session.scheduledAt.toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        · {session.duration} min
                      </p>
                    </div>
                    <span className="flex-none rounded-chip bg-ink-100 px-2 py-0.5 text-[9.5px] font-black tracking-[0.1em] text-ink-500 uppercase">
                      {session.status.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          {/* Teacher card */}
          <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
            <h2 className="text-[11px] font-black tracking-[0.14em] text-ink-400 uppercase">
              Your teacher
            </h2>
            <div className="mt-3 flex items-center gap-3">
              <Avatar
                name={cls.teacher.name}
                src={cls.teacher.avatarKey ? `/api/media/${cls.teacher.avatarKey}` : null}
                size="md"
              />
              <div className="min-w-0">
                <Link
                  href={teacherHref}
                  className="block truncate text-[13.5px] font-extrabold text-ink-900 hover:text-brand-700"
                >
                  {cls.teacher.name}
                </Link>
                <span className="text-[11.5px] font-semibold text-ink-400">
                  {cls.teacher.teacherProfile?.verifiedStatus === "verified"
                    ? "Verified teacher"
                    : "Teacher"}
                </span>
              </div>
            </div>
            <LinkButton href={teacherHref} variant="outline" size="sm" className="mt-3 w-full">
              <Icon name="user" size={14} /> View profile
            </LinkButton>
          </section>

          {/* Students */}
          {isManager ? (
            <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[11px] font-black tracking-[0.14em] text-ink-400 uppercase">
                  Enrolled students
                </h2>
                <span className="rounded-chip bg-ink-100 px-2 py-0.5 text-[10px] font-black text-ink-500">
                  {cls.enrollments.length}
                </span>
              </div>
              {cls.enrollments.length === 0 ? (
                <p className="mt-3 text-[12px] font-semibold text-ink-400">
                  No students have joined yet. Share the class link to invite them.
                </p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {cls.enrollments.slice(0, 12).map((enrollment) => (
                    <li key={enrollment.id} className="flex items-center gap-2.5">
                      <Avatar
                        name={enrollment.student.name}
                        src={
                          enrollment.student.avatarKey
                            ? `/api/media/${enrollment.student.avatarKey}`
                            : null
                        }
                        size="xs"
                      />
                      <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-ink-700">
                        {enrollment.student.name}
                      </span>
                      <span className="flex-none text-[10.5px] font-semibold text-ink-400">
                        {timeAgo(enrollment.enrolledAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : (
            <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
              <h2 className="text-[11px] font-black tracking-[0.14em] text-ink-400 uppercase">
                What you get
              </h2>
              <ul className="mt-3 space-y-2.5 text-[12.5px] font-semibold text-ink-600">
                {[
                  "Submit assignments and get teacher feedback",
                  "See every scheduled class session",
                  "Track your learning in one class space",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-0.5 flex size-4 flex-none items-center justify-center rounded-full bg-success-50 text-success-600">
                      <Icon name="check" size={10} strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
