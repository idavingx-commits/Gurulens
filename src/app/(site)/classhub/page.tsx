/**
 * ClassHub Dashboard
 * Teacher's class management dashboard
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuth } from "@/lib/auth";
import { getTeacherDashboard, getTeacherClasses } from "@/lib/classhub";
import { Button, LinkButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/format";

export const metadata = {
  title: "ClassHub | GuruLens",
  description: "Manage your classes, students, and attendance",
};

function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink-500">{title}</span>
        <Icon name={icon} size={18} className="text-ink-400" />
      </div>
      <div className="mt-2 text-2xl font-bold text-ink-900">{value}</div>
      <p className="text-xs text-ink-400">{subtitle}</p>
    </div>
  );
}

export default async function ClassHubPage() {
  const auth = await getAuth();

  if (!auth) {
    redirect("/login?redirect=/classhub");
  }

  if (auth.user.role !== "teacher" && auth.user.role !== "admin") {
    redirect("/?error=teacher_only");
  }

  const [dashboard, classes] = await Promise.all([
    getTeacherDashboard(auth.user.id),
    getTeacherClasses(auth.user.id, { status: "active" }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ink-900">ClassHub</h1>
          <p className="text-ink-500">
            Manage your classes, track attendance, and monitor student progress
          </p>
        </div>
        <LinkButton href="/classhub/create">
          <Icon name="plus" size={16} />
          Create Class
        </LinkButton>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Classes"
          value={dashboard.classes}
          subtitle="Active classes"
          icon="book-open"
        />
        <StatCard
          title="Total Students"
          value={dashboard.totalStudents}
          subtitle="Enrolled students"
          icon="users"
        />
        <StatCard
          title="Upcoming Sessions"
          value={dashboard.upcomingSessions.length}
          subtitle="This week"
          icon="calendar"
        />
        <StatCard
          title="Pending Reviews"
          value={dashboard.pendingSubmissions}
          subtitle="Submissions to grade"
          icon="clipboard-check"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Classes List */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="font-semibold text-ink-900">Your Classes</h2>
              <Link href="/classhub/classes" className="text-sm font-medium text-brand-600 hover:underline">
                View All
              </Link>
            </div>
            <div className="p-4">
              {classes.length === 0 ? (
                <div className="py-8 text-center">
                  <Icon name="book-open" size={48} className="mx-auto mb-4 text-ink-300" />
                  <p className="mb-4 text-ink-500">You haven't created any classes yet.</p>
                  <LinkButton href="/classhub/create">Create Your First Class</LinkButton>
                </div>
              ) : (
                <div className="space-y-3">
                  {classes.slice(0, 5).map((cls) => (
                    <Link key={cls.id} href={`/classhub/class/${cls.id}`}>
                      <div className="flex items-center justify-between rounded-lg border bg-white p-4 transition-colors hover:bg-ink-50">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-ink-900">{cls.name}</h3>
                            <span className="rounded bg-ink-100 px-2 py-0.5 text-xs text-ink-600">
                              {cls.mode}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-4 text-sm text-ink-500">
                            <span className="flex items-center gap-1">
                              <Icon name="users" size={14} />
                              {cls._count.enrollments} students
                            </span>
                            <span className="flex items-center gap-1">
                              <Icon name="calendar" size={14} />
                              {cls._count.sessions} sessions
                            </span>
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

        {/* Upcoming Sessions */}
        <div>
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="border-b p-4">
              <h2 className="flex items-center gap-2 font-semibold text-ink-900">
                <Icon name="clock" size={20} />
                Upcoming Sessions
              </h2>
            </div>
            <div className="p-4">
              {dashboard.upcomingSessions.length === 0 ? (
                <p className="py-4 text-center text-sm text-ink-500">
                  No upcoming sessions scheduled.
                </p>
              ) : (
                <div className="space-y-4">
                  {dashboard.upcomingSessions.map((session) => (
                    <div key={session.id} className="flex items-start gap-3">
                      <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                        <span className="text-xs font-medium">
                          {new Date(session.scheduledAt).toLocaleDateString("en-US", {
                            weekday: "short",
                          })}
                        </span>
                        <span className="text-lg font-bold">
                          {new Date(session.scheduledAt).getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium text-ink-900">{session.class.name}</p>
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
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="mb-4 font-semibold text-ink-900">Quick Actions</h2>
            <div className="space-y-2">
              <LinkButton href="/classhub/create" variant="outline" className="w-full justify-start">
                <Icon name="plus" size={16} />
                Create New Class
              </LinkButton>
              <LinkButton href="/classhub/attendance" variant="outline" className="w-full justify-start">
                <Icon name="clipboard-check" size={16} />
                Take Attendance
              </LinkButton>
              <LinkButton href="/classhub/assignments" variant="outline" className="w-full justify-start">
                <Icon name="book-open" size={16} />
                Manage Assignments
              </LinkButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
