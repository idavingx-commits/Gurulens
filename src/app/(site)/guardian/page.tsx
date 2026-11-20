import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { EmptyState, SectionHeader, Stat } from "@/components/ui/primitives";
import { getAuth } from "@/lib/auth";
import { getGuardianChildren, getChildEnrollments, getChildAttendanceSummary, getChildAssignments } from "@/lib/guardians";

export const metadata: Metadata = { title: "Guardian Portal" };

export default async function GuardianPortalPage() {
  const auth = await getAuth();
  if (!auth) redirect("/login?redirect=/guardian");

  const children = await getGuardianChildren(auth.user.id);

  // Get data for each child
  const childrenData = await Promise.all(
    children.map(async (child) => {
      const [enrollments, attendance, assignments] = await Promise.all([
        getChildEnrollments(auth.user.id, child.id),
        getChildAttendanceSummary(auth.user.id, child.id),
        getChildAssignments(auth.user.id, child.id),
      ]);
      const pending = assignments.filter((a) => !a.submission && a.dueAt && new Date(a.dueAt) >= new Date());
      return { child, enrollments, attendance, pending };
    })
  );

  const totalClasses = childrenData.reduce((acc, { enrollments }) => acc + enrollments.length, 0);
  const totalPending = childrenData.reduce((acc, { pending }) => acc + pending.length, 0);
  const avgAttendance = childrenData.length > 0
    ? Math.round(childrenData.reduce((acc, { attendance }) => acc + attendance.summary.attendanceRate, 0) / childrenData.length)
    : 0;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-8 pb-12 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Guardian Portal</h1>
          <p className="mt-1 text-[13px] text-ink-500">
            Monitor your children's educational progress.
          </p>
        </div>
        <LinkButton href="/guardian/link">
          <Icon name="user-plus" size={18} /> Link Child
        </LinkButton>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Children" value={children.length} icon="users" />
        <Stat label="Classes" value={totalClasses} icon="book-open" />
        <Stat label="Attendance" value={`${avgAttendance}%`} icon="check-circle" />
        <Stat
          label="Pending"
          value={totalPending}
          icon="file-text"
          tone={totalPending > 3 ? "warn" : "default"}
          hint="assignments"
        />
      </div>

      {/* Children */}
      {children.length === 0 ? (
        <EmptyState
          icon="users"
          title="No children linked"
          description="Link your children's GuruLens accounts to monitor their progress"
          action={<LinkButton href="/guardian/link">Link Child Account</LinkButton>}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {childrenData.map(({ child, enrollments, attendance, pending }) => (
            <div key={child.id} className="card overflow-hidden">
              {/* Child Header */}
              <div className="border-b border-ink-100 p-4">
                <div className="flex items-center gap-3">
                  <Avatar name={child.name} size="lg" />
                  <div>
                    <p className="font-bold text-ink-900">{child.name}</p>
                    <p className="text-sm text-ink-500">{child.email}</p>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 divide-x divide-ink-100 border-b border-ink-100">
                <div className="p-3 text-center">
                  <p className="text-xl font-extrabold text-ink-900">{enrollments.length}</p>
                  <p className="text-xs text-ink-500">Classes</p>
                </div>
                <div className="p-3 text-center">
                  <p className={`text-xl font-extrabold ${
                    attendance.summary.attendanceRate >= 80
                      ? "text-success-600"
                      : attendance.summary.attendanceRate >= 60
                      ? "text-warn-600"
                      : "text-danger-600"
                  }`}>
                    {attendance.summary.attendanceRate}%
                  </p>
                  <p className="text-xs text-ink-500">Attendance</p>
                </div>
                <div className="p-3 text-center">
                  <p className={`text-xl font-extrabold ${pending.length > 3 ? "text-warn-600" : "text-ink-900"}`}>
                    {pending.length}
                  </p>
                  <p className="text-xs text-ink-500">Pending</p>
                </div>
              </div>

              {/* Enrolled Classes */}
              <div className="p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-400">Classes</p>
                {enrollments.length === 0 ? (
                  <p className="text-sm text-ink-500">Not enrolled in any classes</p>
                ) : (
                  <div className="space-y-1">
                    {enrollments.slice(0, 3).map((e) => (
                      <div key={e.classId} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2">
                        <span className="text-sm font-medium text-ink-900">{e.className}</span>
                        <span className="text-xs text-ink-500">{e.teacher.name}</span>
                      </div>
                    ))}
                    {enrollments.length > 3 && (
                      <p className="text-xs text-ink-400">+{enrollments.length - 3} more</p>
                    )}
                  </div>
                )}

                {/* Pending Assignments */}
                {pending.length > 0 && (
                  <div className="mt-4 rounded-xl border border-warn-200 bg-warn-50 p-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-warn-800">
                      <Icon name="alert-triangle" size={16} />
                      {pending.length} assignment{pending.length !== 1 ? "s" : ""} due soon
                    </div>
                    <ul className="mt-2 space-y-1">
                      {pending.slice(0, 2).map((a) => (
                        <li key={a.id} className="text-xs text-warn-700">
                          • {a.title} (due {a.dueAt ? new Date(a.dueAt).toLocaleDateString() : "N/A"})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-ink-100 p-4">
                <Link
                  href={`/guardian/child/${child.id}`}
                  className="flex items-center justify-center gap-1 text-sm font-bold text-brand-600 hover:underline"
                >
                  View Full Details <Icon name="chevron-right" size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
