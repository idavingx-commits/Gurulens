import Link from "next/link";

import { Icon } from "@/components/ui/icons";
import { SectionHeader, Stat } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { compactNumber, timeAgo } from "@/lib/format";

export default async function AdminOverviewPage() {
  const [
    openReports,
    pendingVerifications,
    totalUsers,
    teacherCount,
    studentCount,
    postCount,
    reviewCount,
    recentAudit,
    recentReports,
  ] = await Promise.all([
    db.report.count({ where: { status: "open" } }),
    db.verificationRequest.count({
      where: { status: { in: ["pending", "in_review", "more_info"] } },
    }),
    db.user.count(),
    db.user.count({ where: { role: "teacher" } }),
    db.user.count({ where: { role: "student" } }),
    db.post.count({ where: { moderationStatus: "approved" } }),
    db.review.count({ where: { status: "published" } }),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        action: true,
        targetRef: true,
        createdAt: true,
        actor: { select: { name: true, role: true } },
      },
    }),
    db.report.findMany({
      where: { status: "open" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        targetType: true,
        reason: true,
        createdAt: true,
        reporter: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Open reports" value={compactNumber(openReports)} icon="flag" tone={openReports > 0 ? "danger" : "default"} />
        <Stat
          label="Verification queue"
          value={compactNumber(pendingVerifications)}
          icon="shield"
          tone={pendingVerifications > 0 ? "warn" : "default"}
        />
        <Stat label="Users" value={compactNumber(totalUsers)} icon="users" />
        <Stat label="Approved posts" value={compactNumber(postCount)} icon="pencil" />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <SectionHeader
            title="Needs attention"
            subtitle={openReports > 0 ? `${openReports} open report${openReports === 1 ? "" : "s"}` : "All clear"}
            action={
              <Link
                href="/admin/reports"
                className="text-[12.5px] font-bold text-brand-600 hover:text-brand-700"
              >
                View all →
              </Link>
            }
          />
          {recentReports.length > 0 ? (
            <div className="space-y-2.5">
              {recentReports.map((r) => (
                <Link
                  key={r.id}
                  href="/admin/reports"
                  className="card flex items-center gap-3 p-3.5 transition-colors hover:border-brand-300"
                >
                  <span className="flex size-9 flex-none items-center justify-center rounded-2xl bg-danger-100 text-danger-600">
                    <Icon name="flag" size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-ink-800 capitalize">
                      {r.reason.replace("_", " ")} · {r.targetType}
                    </p>
                    <p className="text-[11.5px] font-semibold text-ink-400">
                      reported by {r.reporter.name} {timeAgo(r.createdAt.toISOString())}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-ink-400">
              No open reports. The community is behaving — nice work.
            </p>
          )}

          <div className="mt-6 grid grid-cols-3 gap-3">
            <Stat label="Teachers" value={compactNumber(teacherCount)} icon="user" />
            <Stat label="Students" value={compactNumber(studentCount)} icon="users" />
            <Stat label="Reviews" value={compactNumber(reviewCount)} icon="star" />
          </div>
        </section>

        <section>
          <SectionHeader title="Recent moderation activity" subtitle="Last 12 actions" />
          {recentAudit.length > 0 ? (
            <div className="card divide-y divide-ink-100">
              {recentAudit.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Icon name="clock" size={13} className="flex-none text-ink-300" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-bold text-ink-700">{a.action}</p>
                    <p className="text-[11px] font-semibold text-ink-400">
                      {a.actor.name} · {a.actor.role}
                      {a.targetRef ? ` · ${a.targetRef.slice(0, 12)}…` : ""}
                    </p>
                  </div>
                  <span className="flex-none text-[11px] font-semibold text-ink-400">
                    {timeAgo(a.createdAt.toISOString())}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-ink-400">No admin actions recorded yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
