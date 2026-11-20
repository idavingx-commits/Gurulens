import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { EmptyState, SectionHeader, Stat } from "@/components/ui/primitives";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Student Dashboard" };

export default async function StudentDashboardPage() {
  const auth = await getAuth();
  if (!auth) redirect("/login?redirect=/dashboard/student");

  const [enrollments, upcomingSessions, recentAttendance, pendingAssignments] = await Promise.all([
    db.classEnrollment.findMany({
      where: { studentId: auth.user.id, status: "active" },
      include: {
        class: {
          include: {
            teacher: { select: { id: true, name: true, avatarKey: true } },
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    }),
    db.classSession.findMany({
      where: {
        class: { enrollments: { some: { studentId: auth.user.id, status: "active" } } },
        scheduledAt: { gte: new Date() },
        status: "scheduled",
      },
      include: { class: { select: { name: true } } },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    }),
    db.attendance.findMany({
      where: { studentId: auth.user.id },
      include: { session: { include: { class: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.assignment.findMany({
      where: {
        class: { enrollments: { some: { studentId: auth.user.id, status: "active" } } },
        dueAt: { gte: new Date() },
        submissions: { none: { studentId: auth.user.id } },
      },
      include: { class: { select: { id: true, name: true } } },
      orderBy: { dueAt: "asc" },
      take: 5,
    }),
  ]);

  const attendanceRate = recentAttendance.length > 0
    ? Math.round((recentAttendance.filter((a) => a.status === "present").length / recentAttendance.length) * 100)
    : 100;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-8 pb-12 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">My Dashboard</h1>
        <p className="mt-1 text-[13px] text-ink-500">
          Track your classes, attendance, and assignments.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Classes" value={enrollments.length} icon="book-open" />
        <Stat
          label="Attendance"
          value={`${attendanceRate}%`}
          icon="check-circle"
          tone={attendanceRate < 60 ? "danger" : attendanceRate < 80 ? "warn" : "default"}
        />
        <Stat label="Upcoming" value={upcomingSessions.length} icon="calendar" />
        <Stat
          label="Pending"
          value={pendingAssignments.length}
          icon="file-text"
          tone={pendingAssignments.length > 3 ? "warn" : "default"}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Enrolled Classes */}
          <section>
            <SectionHeader
              title="My Classes"
              action={
                <Link href="/explore" className="text-sm font-bold text-brand-600 hover:underline">
                  Find more
                </Link>
              }
            />
            {enrollments.length === 0 ? (
              <EmptyState
                icon="book-open"
                title="No classes yet"
                description="Explore teachers and enroll in classes"
                action={<LinkButton href="/explore">Explore Teachers</LinkButton>}
              />
            ) : (
              <div className="space-y-3">
                {enrollments.map((enrollment) => (
                  <Link
                    key={enrollment.id}
                    href={`/classhub/class/${enrollment.class.id}`}
                    className="card flex items-center justify-between p-4 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={enrollment.class.teacher.name} size="md" />
                      <div>
                        <p className="font-bold text-ink-900">{enrollment.class.name}</p>
                        <p className="text-sm text-ink-500">{enrollment.class.teacher.name}</p>
                      </div>
                    </div>
                    <Icon name="chevron-right" size={18} className="text-ink-400" />
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Upcoming Sessions */}
          <section>
            <SectionHeader title="Upcoming" />
            {upcomingSessions.length === 0 ? (
              <div className="card p-4 text-center text-sm text-ink-500">
                No upcoming sessions
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingSessions.map((session) => (
                  <div key={session.id} className="card flex items-center gap-3 p-3">
                    <div className="flex size-10 flex-col items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <span className="text-[9px] font-bold uppercase">
                        {new Date(session.scheduledAt).toLocaleDateString("en-US", { weekday: "short" })}
                      </span>
                      <span className="text-sm font-extrabold">
                        {new Date(session.scheduledAt).getDate()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink-900">{session.class.name}</p>
                      <p className="text-xs text-ink-500">
                        {new Date(session.scheduledAt).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Pending Assignments */}
          <section>
            <SectionHeader title="Due Soon" />
            {pendingAssignments.length === 0 ? (
              <div className="card p-4 text-center text-sm text-ink-500">
                No pending assignments
              </div>
            ) : (
              <div className="space-y-2">
                {pendingAssignments.map((assignment) => (
                  <Link
                    key={assignment.id}
                    href={`/classhub/class/${assignment.class.id}#assignments`}
                    className="card block p-3 transition-colors hover:bg-ink-50"
                  >
                    <p className="text-sm font-bold text-ink-900">{assignment.title}</p>
                    <p className="text-xs text-ink-500">{assignment.class.name}</p>
                    {assignment.dueAt && (
                      <p className="mt-1 text-xs font-medium text-warn-600">
                        Due {new Date(assignment.dueAt).toLocaleDateString()}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
