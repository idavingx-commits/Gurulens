/**
 * Guardian Portal
 * Parent/Guardian dashboard to monitor children's education
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuth } from "@/lib/auth";
import { getGuardianChildren, getChildEnrollments, getChildAttendanceSummary, getChildAssignments } from "@/lib/guardians";
import { LinkButton } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/format";

export const metadata = {
  title: "Guardian Portal | GuruLens",
  description: "Monitor your children's educational progress",
};

type Child = Awaited<ReturnType<typeof getGuardianChildren>>[0];
type Enrollment = Awaited<ReturnType<typeof getChildEnrollments>>[0];
type AttendanceSummary = Awaited<ReturnType<typeof getChildAttendanceSummary>>;
type Assignment = Awaited<ReturnType<typeof getChildAssignments>>[0];

type ChildWithData = {
  child: Child;
  enrollments: Enrollment[];
  attendance: AttendanceSummary;
  assignments: Assignment[];
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

function ChildCard({ data }: { data: ChildWithData }) {
  const { child, enrollments, attendance, assignments } = data;
  
  // Pending assignments are those without a submission
  const pendingAssignments = assignments.filter(a => !a.submission && a.dueAt && new Date(a.dueAt) >= new Date());
  const pendingCount = pendingAssignments.length;
  const attendanceRate = attendance.summary.attendanceRate;

  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="border-b p-4">
        <div className="flex items-center gap-4">
          <Avatar name={child.name} size="lg" />
          <div>
            <h2 className="text-lg font-semibold text-ink-900">{child.name}</h2>
            <p className="text-sm text-ink-500">{child.email}</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Quick Stats */}
        <div className="mb-4 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-ink-900">
              {enrollments.length}
            </div>
            <p className="text-xs text-ink-500">Classes</p>
          </div>
          <div className="text-center">
            <div
              className={cn(
                "text-2xl font-bold",
                attendanceRate >= 80
                  ? "text-success-600"
                  : attendanceRate >= 60
                  ? "text-amber-600"
                  : "text-danger-600"
              )}
            >
              {attendanceRate}%
            </div>
            <p className="text-xs text-ink-500">Attendance</p>
          </div>
          <div className="text-center">
            <div
              className={cn(
                "text-2xl font-bold",
                pendingCount > 3 ? "text-amber-600" : "text-ink-900"
              )}
            >
              {pendingCount}
            </div>
            <p className="text-xs text-ink-500">Pending</p>
          </div>
        </div>

        {/* Enrolled Classes */}
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-semibold text-ink-700">Enrolled Classes</h3>
          {enrollments.length === 0 ? (
            <p className="text-sm text-ink-500">Not enrolled in any classes</p>
          ) : (
            <div className="space-y-2">
              {enrollments.slice(0, 3).map((enrollment) => (
                <div
                  key={enrollment.classId}
                  className="flex items-center justify-between rounded-lg bg-ink-50 p-2"
                >
                  <span className="text-sm font-medium text-ink-900">
                    {enrollment.className}
                  </span>
                  <span className="text-xs text-ink-500">
                    {enrollment.teacher.name}
                  </span>
                </div>
              ))}
              {enrollments.length > 3 && (
                <p className="text-xs text-ink-500">
                  +{enrollments.length - 3} more classes
                </p>
              )}
            </div>
          )}
        </div>

        {/* Attendance Summary */}
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-semibold text-ink-700">Attendance Summary</h3>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-success-600">
              <Icon name="check" size={14} className="inline" /> {attendance.summary.present} present
            </span>
            <span className="text-amber-600">
              <Icon name="clock" size={14} className="inline" /> {attendance.summary.late} late
            </span>
            <span className="text-danger-600">
              <Icon name="x" size={14} className="inline" /> {attendance.summary.absent} absent
            </span>
          </div>
        </div>

        {/* Pending Assignments Warning */}
        {pendingCount > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-center gap-2">
              <Icon name="alert-triangle" size={16} className="text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                {pendingCount} assignment{pendingCount !== 1 ? "s" : ""} due soon
              </span>
            </div>
            <ul className="mt-2 space-y-1">
              {pendingAssignments.slice(0, 3).map((assignment) => (
                <li key={assignment.id} className="text-xs text-amber-700">
                  • {assignment.title} (due{" "}
                  {assignment.dueAt ? new Date(assignment.dueAt).toLocaleDateString() : "N/A"})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="border-t p-4">
        <Link href={`/guardian/child/${child.id}`}>
          <span className="flex items-center justify-center gap-1 text-sm font-medium text-brand-600 hover:underline">
            View Full Details
            <Icon name="chevron-right" size={16} />
          </span>
        </Link>
      </div>
    </div>
  );
}

export default async function GuardianPortalPage() {
  const auth = await getAuth();

  if (!auth) {
    redirect("/login?redirect=/guardian");
  }

  // Get children linked to this guardian
  const children = await getGuardianChildren(auth.user.id);

  // Get data for each child
  const childrenWithData: ChildWithData[] = await Promise.all(
    children.map(async (child) => {
      const [enrollments, attendance, assignments] = await Promise.all([
        getChildEnrollments(auth.user.id, child.id),
        getChildAttendanceSummary(auth.user.id, child.id),
        getChildAssignments(auth.user.id, child.id),
      ]);
      
      return {
        child,
        enrollments,
        attendance,
        assignments,
      };
    })
  );

  // Calculate totals
  const totalClasses = childrenWithData.reduce(
    (acc, { enrollments }) => acc + enrollments.length,
    0
  );
  const totalPending = childrenWithData.reduce(
    (acc, { assignments }) => acc + assignments.filter(a => !a.submission && a.dueAt && new Date(a.dueAt) >= new Date()).length,
    0
  );

  // Calculate average attendance
  const avgAttendance = childrenWithData.length > 0
    ? Math.round(
        childrenWithData.reduce(
          (acc, { attendance }) => acc + attendance.summary.attendanceRate,
          0
        ) / childrenWithData.length
      )
    : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-ink-900">
            <Icon name="users" size={32} className="text-brand-500" />
            Guardian Portal
          </h1>
          <p className="text-ink-500">
            Monitor your children's educational progress
          </p>
        </div>
        <LinkButton href="/guardian/link">
          <Icon name="user-plus" size={16} />
          Link Child Account
        </LinkButton>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Children"
          value={children.length}
          subtitle="Linked accounts"
          icon="users"
        />
        <StatCard
          title="Total Classes"
          value={totalClasses}
          subtitle="Active enrollments"
          icon="book-open"
        />
        <StatCard
          title="Avg. Attendance"
          value={childrenWithData.length > 0 ? `${avgAttendance}%` : "N/A"}
          subtitle="All children"
          icon="check-circle"
          color="green"
        />
        <StatCard
          title="Pending Assignments"
          value={totalPending}
          subtitle="Due soon"
          icon="file-text"
          color={totalPending > 3 ? "amber" : "brand"}
        />
      </div>

      {/* Children Cards */}
      {children.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
          <Icon name="users" size={48} className="mx-auto mb-4 text-ink-300" />
          <h2 className="mb-2 text-xl font-semibold text-ink-900">
            No Children Linked
          </h2>
          <p className="mb-4 text-ink-500">
            Link your children's GuruLens accounts to monitor their progress.
          </p>
          <LinkButton href="/guardian/link">Link Child Account</LinkButton>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {childrenWithData.map((data) => (
            <ChildCard key={data.child.id} data={data} />
          ))}
        </div>
      )}
    </div>
  );
}
