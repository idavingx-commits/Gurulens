import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { InfoNote, SectionHeader, Stat } from "@/components/ui/primitives";
import { getAuth } from "@/lib/auth";
import { getCampusInsights } from "@/lib/campus";
import { compactNumber } from "@/lib/format";
import { getOrgAccess, getOrganizationBySlug } from "@/lib/organizations";
import { CampusNav } from "../campus-nav";

type Props = { params: Promise<{ slug: string }> };

export const metadata: Metadata = {
  title: "Campus insights",
  robots: { index: false, follow: false },
};

export default async function CampusInsightsPage({ params }: Props) {
  const auth = await getAuth();
  const { slug } = await params;
  if (!auth) redirect(`/login?redirect=/campus/${slug}/insights`);

  const org = await getOrganizationBySlug(slug);
  if (!org) notFound();

  const access = await getOrgAccess(auth.user.id, auth.user.role, org.id);
  if (!access.canView) notFound();
  if (!access.canManage) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 pt-6 pb-12 sm:px-6">
        <CampusNav slug={org.slug} active="insights" canManage={false} />
        <InfoNote icon="lock" className="mt-6">
          Campus insights are available to owners, admins and managers.{" "}
          <Link href={`/campus/${org.slug}`} className="font-bold text-brand-600 hover:underline">
            Back to the campus
          </Link>
          .
        </InfoNote>
      </div>
    );
  }

  const insights = await getCampusInsights(org.id);
  const maxTrend = Math.max(1, ...insights.enrollmentTrend.map((month) => month.count));
  const maxClass = Math.max(1, ...insights.topClasses.map((cls) => cls._count.enrollments));
  const maxBranch = Math.max(
    1,
    ...insights.branches.map((branch) => branch.classes + branch.members),
  );

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

      <CampusNav slug={org.slug} active="insights" canManage />

      <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Insights</h1>
          <p className="mt-1 text-[13px] text-ink-500">
            Enrolment, attendance and channel performance for {org.name}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LinkButton href={`/campus/${org.slug}/manage`} variant="outline" size="sm">
            <Icon name="settings" size={14} /> Manage campus
          </LinkButton>
          <LinkButton href={`/campus/${org.slug}`} variant="outline" size="sm">
            <Icon name="grid" size={14} /> Overview
          </LinkButton>
        </div>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Students"
          value={compactNumber(insights.students)}
          icon="users"
          hint={`${insights.pendingEnrollments} pending`}
        />
        <Stat label="Classes" value={insights.classes} icon="book-open" hint={`${insights.upcomingSessions} upcoming sessions`} />
        <Stat
          label="Attendance"
          value={insights.attendanceRate === null ? "—" : `${insights.attendanceRate}%`}
          icon="check-circle"
          hint={
            insights.attendanceSample === 0
              ? "No attendance marked yet"
              : `${insights.attendanceSample} records · 30 days`
          }
        />
        <Stat
          label="Avg class size"
          value={insights.avgClassSize}
          icon="target"
          hint={`${insights.sessions30} sessions · 30 days`}
        />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <SectionHeader
            title="Enrolment trend"
            subtitle="New class enrolments over the last six months"
          />
          <div className="card p-5">
            <div className="flex h-40 items-end gap-2">
              {insights.enrollmentTrend.map((month) => (
                <div key={month.key} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                  <span className="text-[11px] font-bold text-ink-500 tabular-nums">
                    {month.count}
                  </span>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-brand-600 to-accent-500 transition-all"
                      style={{
                        height: `${Math.max(4, Math.round((month.count / maxTrend) * 100))}%`,
                      }}
                      title={`${month.count} enrolments in ${month.label}`}
                    />
                  </div>
                  <span className="text-[10.5px] font-bold tracking-wide text-ink-400 uppercase">
                    {month.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ink-100 pt-4 text-[12px] font-semibold text-ink-500">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="user-plus" size={13} className="text-ink-400" />
                {insights.enrollmentTrend.reduce((sum, month) => sum + month.count, 0)} enrolments
                in 6 months
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="clock" size={13} className="text-ink-400" />
                {insights.pendingEnrollments} awaiting approval
              </span>
            </div>
          </div>

          <SectionHeader className="mt-8" title="Top classes" subtitle="By active enrolment" />
          {insights.topClasses.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink-200 p-4 text-center text-[12.5px] text-ink-400">
              No classes yet.
            </p>
          ) : (
            <div className="card divide-y divide-ink-100">
              {insights.topClasses.map((cls, index) => (
                <div key={cls.id} className="flex items-center gap-3 p-3.5">
                  <span className="flex size-7 flex-none items-center justify-center rounded-full bg-ink-100 text-[11px] font-black text-ink-500">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/classhub/class/${cls.id}`}
                      className="block truncate text-[13px] font-bold text-ink-900 hover:text-brand-700"
                    >
                      {cls.name}
                    </Link>
                    <p className="mt-0.5 flex items-center gap-2 text-[11px] font-semibold text-ink-400">
                      <span>{cls.teacher.name}</span>
                      {cls.branch ? <span>· {cls.branch.name}</span> : null}
                      <span>· {cls._count.sessions} sessions</span>
                    </p>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{
                          width: `${Math.max(4, Math.round((cls._count.enrollments / maxClass) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="flex-none text-[12px] font-extrabold text-ink-700 tabular-nums">
                    {cls._count.enrollments}
                  </span>
                </div>
              ))}
            </div>
          )}

          <SectionHeader className="mt-8" title="Branch performance" subtitle="Team and class load" />
          {insights.branches.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink-200 p-4 text-center text-[12.5px] text-ink-400">
              No branches yet.
            </p>
          ) : (
            <div className="card divide-y divide-ink-100">
              {insights.branches.map((branch) => (
                <div key={branch.id} className="flex flex-wrap items-center gap-3 p-3.5">
                  <span className="flex size-8 flex-none items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon name="location" size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-[13px] font-bold text-ink-900">
                      {branch.name}
                      {branch.isMain ? (
                        <span className="rounded-chip bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">
                          Main
                        </span>
                      ) : null}
                    </p>
                    <div className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                      <div
                        className="h-full bg-brand-500"
                        style={{
                          width: `${Math.round((branch.members / Math.max(1, maxBranch)) * 100)}%`,
                        }}
                      />
                      <div
                        className="h-full bg-accent-400"
                        style={{
                          width: `${Math.round((branch.classes / Math.max(1, maxBranch)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-none items-center gap-3 text-[11.5px] font-bold text-ink-500">
                    <span className="inline-flex items-center gap-1">
                      <Icon name="users" size={11} /> {branch.members}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Icon name="book-open" size={11} /> {branch.classes}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="space-y-8">
          <section>
            <SectionHeader title="Top teachers" subtitle="By enrolled students" />
            {insights.topTeachers.length === 0 ? (
              <InfoNote icon="user">No teachers with classes yet.</InfoNote>
            ) : (
              <div className="card divide-y divide-ink-100">
                {insights.topTeachers.map((teacher) => (
                  <div key={teacher.name} className="flex items-center gap-2.5 p-3">
                    <Avatar name={teacher.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-bold text-ink-900">{teacher.name}</p>
                      <p className="text-[11px] font-semibold text-ink-400">
                        {teacher.classes} classes · {teacher.students} students
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionHeader title="Channels" subtitle="Audience and activity" />
            <div className="mb-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-ink-50 p-3">
                <p className="text-[10.5px] font-bold tracking-wide text-ink-400 uppercase">
                  Followers
                </p>
                <p className="text-lg font-extrabold text-ink-900 tabular-nums">
                  {compactNumber(insights.channelSummary.followers)}
                </p>
              </div>
              <div className="rounded-xl bg-ink-50 p-3">
                <p className="text-[10.5px] font-bold tracking-wide text-ink-400 uppercase">Posts</p>
                <p className="text-lg font-extrabold text-ink-900 tabular-nums">
                  {compactNumber(insights.channelSummary.posts)}
                </p>
              </div>
            </div>
            {insights.channelRows.length === 0 ? (
              <InfoNote icon="radio">No campus channels yet.</InfoNote>
            ) : (
              <div className="card divide-y divide-ink-100">
                {insights.channelRows.slice(0, 5).map((channel) => (
                  <Link
                    key={channel.id}
                    href={`/channel/${channel.slug}`}
                    className="flex items-center gap-2.5 p-3 transition-colors hover:bg-ink-50/60"
                  >
                    <Avatar
                      name={channel.name}
                      src={channel.avatarKey ? `/api/media/${channel.avatarKey}` : null}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-bold text-ink-900">{channel.name}</p>
                      <p className="text-[11px] font-semibold text-ink-400">
                        {compactNumber(channel._count.followers || channel.followerCount)} followers ·{" "}
                        {channel._count.posts} posts
                      </p>
                    </div>
                    <Icon name="chevron-right" size={13} className="flex-none text-ink-300" />
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionHeader title="Quick links" />
            <div className="space-y-2">
              <LinkButton href={`/campus/${org.slug}/classes`} variant="outline" className="w-full justify-start">
                <Icon name="book-open" size={15} /> All classes
              </LinkButton>
              <LinkButton href={`/campus/${org.slug}/timetable`} variant="outline" className="w-full justify-start">
                <Icon name="calendar" size={15} /> Timetable
              </LinkButton>
              <LinkButton href={`/campus/${org.slug}/people`} variant="outline" className="w-full justify-start">
                <Icon name="users" size={15} /> People
              </LinkButton>
              <LinkButton href={`/campus/${org.slug}/manage`} variant="outline" className="w-full justify-start">
                <Icon name="settings" size={15} /> Manage campus
              </LinkButton>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
