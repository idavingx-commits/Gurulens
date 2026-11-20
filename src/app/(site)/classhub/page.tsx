import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LinkButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { EmptyState, SectionHeader, Stat } from "@/components/ui/primitives";
import { getAuth } from "@/lib/auth";
import { getTeacherDashboard, getTeacherClasses } from "@/lib/classhub";
import { timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "ClassHub" };

export default async function ClassHubPage() {
  const auth = await getAuth();

  if (!auth) redirect("/login?redirect=/classhub");
  if (auth.user.role !== "teacher" && auth.user.role !== "admin") redirect("/");

  const [dashboard, classes] = await Promise.all([
    getTeacherDashboard(auth.user.id),
    getTeacherClasses(auth.user.id, { status: "active" }),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-8 pb-12 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">ClassHub</h1>
          <p className="mt-1 text-[13px] text-ink-500">
            Manage your classes, track attendance, and monitor students.
          </p>
        </div>
        <LinkButton href="/classhub/create">
          <Icon name="plus" size={18} /> Create Class
        </LinkButton>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Classes" value={dashboard.classes} icon="book-open" />
        <Stat label="Students" value={dashboard.totalStudents} icon="users" />
        <Stat label="Upcoming" value={dashboard.upcomingSessions.length} icon="calendar" />
        <Stat
          label="Pending"
          value={dashboard.pendingSubmissions}
          icon="clipboard"
          tone={dashboard.pendingSubmissions > 5 ? "warn" : "default"}
          hint="submissions to grade"
        />
      </div>

      {/* Classes */}
      <section className="mb-8">
        <SectionHeader
          title="Your Classes"
          action={
            classes.length > 5 ? (
              <Link href="/classhub/classes" className="text-sm font-bold text-brand-600 hover:underline">
                View all
              </Link>
            ) : undefined
          }
        />
        {classes.length === 0 ? (
          <EmptyState
            icon="book-open"
            title="No classes yet"
            description="Create your first class to get started"
            action={<LinkButton href="/classhub/create">Create Class</LinkButton>}
          />
        ) : (
          <div className="space-y-3">
            {classes.slice(0, 5).map((cls) => (
              <Link key={cls.id} href={`/classhub/class/${cls.id}`} className="card flex items-center justify-between p-4 transition-shadow hover:shadow-md">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink-900">{cls.name}</span>
                    <span className="rounded bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-600">{cls.mode}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-ink-500">
                    <span className="flex items-center gap-1">
                      <Icon name="users" size={12} /> {cls._count.enrollments} students
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon name="calendar" size={12} /> {cls._count.sessions} sessions
                    </span>
                  </div>
                </div>
                <Icon name="chevron-right" size={18} className="text-ink-400" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Upcoming Sessions */}
      <section className="mb-8">
        <SectionHeader title="Upcoming Sessions" subtitle="Next 7 days" />
        {dashboard.upcomingSessions.length === 0 ? (
          <div className="card p-6 text-center text-sm text-ink-500">
            No upcoming sessions scheduled.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {dashboard.upcomingSessions.map((session) => (
              <div key={session.id} className="card flex items-center gap-3 p-4">
                <div className="flex size-12 flex-none flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <span className="text-[10px] font-bold uppercase">
                    {new Date(session.scheduledAt).toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                  <span className="text-lg font-extrabold">
                    {new Date(session.scheduledAt).getDate()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-bold text-ink-900">{session.class.name}</p>
                  <p className="text-sm text-ink-500">
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

      {/* Quick Actions */}
      <section>
        <SectionHeader title="Quick Actions" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Link href="/classhub/create" className="card flex items-center gap-3 p-4 transition-colors hover:bg-ink-50">
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Icon name="plus" size={20} />
            </span>
            <span className="font-medium text-ink-900">New Class</span>
          </Link>
          <Link href="/classhub/attendance" className="card flex items-center gap-3 p-4 transition-colors hover:bg-ink-50">
            <span className="flex size-10 items-center justify-center rounded-xl bg-success-50 text-success-600">
              <Icon name="check-square" size={20} />
            </span>
            <span className="font-medium text-ink-900">Take Attendance</span>
          </Link>
          <Link href="/classhub/assignments" className="card flex items-center gap-3 p-4 transition-colors hover:bg-ink-50">
            <span className="flex size-10 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
              <Icon name="file-text" size={20} />
            </span>
            <span className="font-medium text-ink-900">Assignments</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
