/**
 * Student Dashboard
 * View enrolled classes, attendance, and assignments
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { LinkButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/format";

export const metadata = {
  title: "My Dashboard | GuruLens",
  description: "View your enrolled classes and track your progress",
};

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color = "brand",
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  color?: "brand" | "green" | "amber" | "red";
}) {
  const colors = {
    brand: "text-brand-500",
    green: "text-success-500",
    amber: "text-amber-500",
    red: "text-danger-500",
  };

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink-500">{title}</span>
        <Icon name={icon} size={18} className={colors[color]} />
      </div>
      <div className="mt-2 text-2xl font-bold text-ink-900">{value}</div>
      <p className="text-xs text-ink-400">{subtitle}</p>
    </div>
  );
}

export default async function StudentDashboardPage() {
  const auth = await getAuth();

  if (!auth) {
    redirect("/login?redirect=/dashboard/student");
  }

  // Get student's enrollments with class details
  const enrollments = await db.classEnrollment.findMany({
    where: { studentId: auth.user.id, status: "active" },
    include: {
      class: {
        include: {
          teacher: { select: { id: true, name: true, avatarKey: true } },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

  // Get upcoming sessions
  const upcomingSessions = await db.classSession.findMany({
    where: {
      class: {
        enrollments: { some: { studentId: auth.user.id, status: "active" } },
      },
      scheduledAt: { gte: new Date() },
      status: "scheduled",
    },
    include: { class: { select: { name: true } } },
    orderBy: { scheduledAt: "asc" },
    take: 5,
  });

  // Get recent attendance
  const recentAttendance = await db.attendance.findMany({
    where: { studentId: auth.user.id },
    include: { session: { include: { class: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Get pending assignments
  const pendingAssignments = await db.assignment.findMany({
    where: {
      class: {
        enrollments: { some: { studentId: auth.user.id, status: "active" } },
      },
      dueAt: { gte: new Date() },
      submissions: { none: { studentId: auth.user.id } },
    },
    include: { class: { select: { name: true } } },
    orderBy: { dueAt: "asc" },
    take: 5,
  });

  // Calculate stats
  const totalClasses = enrollments.length;
  const attendanceRate =
    recentAttendance.length > 0
      ? Math.round(
          (recentAttendance.filter((a) => a.status === "present").length /
            recentAttendance.length) *
            100
        )
      : 100;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ink-900">My Dashboard</h1>
        <p className="text-ink-500">
          Track your classes, attendance, and assignments
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Enrolled Classes"
          value={totalClasses}
          subtitle="Active enrollments"
          icon="book-open"
        />
        <StatCard
          title="Attendance Rate"
          value={`${attendanceRate}%`}
          subtitle="Last 10 sessions"
          icon="check-circle"
          color={attendanceRate >= 80 ? "green" : attendanceRate >= 60 ? "amber" : "red"}
        />
        <StatCard
          title="Upcoming Sessions"
          value={upcomingSessions.length}
          subtitle="Scheduled"
          icon="calendar"
        />
        <StatCard
          title="Pending Assignments"
          value={pendingAssignments.length}
          subtitle="Due soon"
          icon="file-text"
          color={pendingAssignments.length > 3 ? "amber" : "brand"}
        />
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Enrolled Classes */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="font-semibold text-ink-900">My Classes</h2>
              <Link
                href="/explore"
                className="text-sm font-medium text-brand-600 hover:underline"
              >
                Find More
              </Link>
            </div>
            <div className="p-4">
              {enrollments.length === 0 ? (
                <div className="py-8 text-center">
                  <Icon name="book-open" size={48} className="mx-auto mb-4 text-ink-300" />
                  <p className="mb-4 text-ink-500">You're not enrolled in any classes yet.</p>
                  <LinkButton href="/explore">Explore Teachers</LinkButton>
                </div>
              ) : (
                <div className="space-y-3">
                  {enrollments.map((enrollment) => (
                    <Link
                      key={enrollment.id}
                      href={`/class/${enrollment.class.id}`}
                    >
                      <div className="flex items-center justify-between rounded-lg border bg-white p-4 transition-colors hover:bg-ink-50">
                        <div className="flex items-center gap-4">
                          <Avatar
                            name={enrollment.class.teacher.name}
                            size="md"
                          />
                          <div>
                            <h3 className="font-medium text-ink-900">
                              {enrollment.class.name}
                            </h3>
                            <p className="text-sm text-ink-500">
                              {enrollment.class.teacher.name}
                            </p>
                          </div>
                        </div>
                        <Icon name="chevron-right" size={20} className="text-ink-400" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Sessions */}
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="border-b p-4">
              <h2 className="flex items-center gap-2 font-semibold text-ink-900">
                <Icon name="clock" size={20} />
                Upcoming Sessions
              </h2>
            </div>
            <div className="p-4">
              {upcomingSessions.length === 0 ? (
                <p className="py-4 text-center text-sm text-ink-500">
                  No upcoming sessions
                </p>
              ) : (
                <div className="space-y-4">
                  {upcomingSessions.map((session) => (
                    <div key={session.id} className="flex items-start gap-3">
                      <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                        <span className="text-xs font-medium">
                          {new Date(session.scheduledAt).toLocaleDateString(
                            "en-US",
                            { weekday: "short" }
                          )}
                        </span>
                        <span className="text-sm font-bold">
                          {new Date(session.scheduledAt).getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium text-ink-900">
                          {session.class.name}
                        </p>
                        <p className="text-sm text-ink-500">
                          {new Date(session.scheduledAt).toLocaleTimeString(
                            "en-US",
                            { hour: "numeric", minute: "2-digit" }
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pending Assignments */}
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="border-b p-4">
              <h2 className="flex items-center gap-2 font-semibold text-ink-900">
                <Icon name="file-text" size={20} />
                Due Soon
              </h2>
            </div>
            <div className="p-4">
              {pendingAssignments.length === 0 ? (
                <p className="py-4 text-center text-sm text-ink-500">
                  No pending assignments
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingAssignments.map((assignment) => (
                    <Link
                      key={assignment.id}
                      href={`/assignment/${assignment.id}`}
                    >
                      <div className="rounded-lg border p-3 transition-colors hover:bg-ink-50">
                        <p className="font-medium text-ink-900">
                          {assignment.title}
                        </p>
                        <p className="text-sm text-ink-500">
                          {assignment.class.name}
                        </p>
                        {assignment.dueAt && (
                          <p className="mt-1 text-xs text-amber-600">
                            Due {new Date(assignment.dueAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
