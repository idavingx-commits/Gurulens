import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Icon } from "@/components/ui/icons";
import { EmptyState, SectionHeader, Stat } from "@/components/ui/primitives";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getLmsAccess,
  getLmsBasePath,
  getLmsLimits,
  getLmsStats,
  getLmsWorkspaceBySubdomain,
  lmsBrandColor,
  lmsLimitLabel,
} from "@/lib/lms";
import { AnnouncementPanel } from "@/components/lms/manage/AnnouncementPanel";
import { CopyLinkButton } from "@/components/lms/manage/CopyLinkButton";
import { CourseListPanel } from "@/components/lms/manage/CourseListPanel";
import { LearnerPanel } from "@/components/lms/manage/LearnerPanel";
import { WorkspaceSettings } from "@/components/lms/manage/WorkspaceSettings";

type Props = { params: Promise<{ tenant: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenant } = await params;
  const workspace = await getLmsWorkspaceBySubdomain(tenant);
  return { title: workspace ? `Manage · ${workspace.name}` : "Manage hub" };
}

export default async function LmsManagePage({ params }: Props) {
  const { tenant } = await params;
  const workspace = await getLmsWorkspaceBySubdomain(tenant);
  if (!workspace) notFound();

  const auth = await getAuth();
  if (!auth) {
    return (
      <div className="mx-auto max-w-lg py-6">
        <EmptyState
          icon="lock"
          title="Sign in to manage this hub"
          description="Only the hub owner and organization managers can open the builder."
          action={
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-[13px] font-bold text-white hover:bg-brand-700"
            >
              Sign in
            </Link>
          }
        />
      </div>
    );
  }

  const access = await getLmsAccess(workspace, auth.user);
  if (!access.canManage) {
    return (
      <div className="mx-auto max-w-lg py-6">
        <EmptyState
          icon="shield"
          title="You don't manage this hub"
          description="Ask the hub owner or an organization manager for access."
          action={
            <Link
              href={await getLmsBasePath(workspace.subdomain)}
              className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-5 py-2.5 text-[13px] font-bold text-ink-700 hover:border-brand-300 hover:text-brand-700"
            >
              Back to hub
            </Link>
          }
        />
      </div>
    );
  }

  const base = await getLmsBasePath(workspace.subdomain);
  const brand = lmsBrandColor(workspace.brandColor);

  const [stats, limits, courses, announcements, enrollments] = await Promise.all([
    getLmsStats(workspace.id),
    getLmsLimits(workspace.ownerId),
    db.lmsCourse.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        _count: { select: { enrollments: true, modules: true } },
        modules: { select: { lessons: { select: { id: true } } } },
      },
    }),
    db.lmsAnnouncement.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 20,
      include: { author: { select: { id: true, name: true } } },
    }),
    db.lmsEnrollment.findMany({
      where: { course: { workspaceId: workspace.id } },
      orderBy: { enrolledAt: "desc" },
      take: 100,
      include: {
        user: { select: { id: true, name: true, email: true, avatarKey: true } },
        course: { select: { id: true, title: true } },
      },
    }),
  ]);

  const pending = enrollments.filter((item) => item.status === "pending");
  const active = enrollments.filter((item) => item.status === "active");
  const courseCards = courses.map((course) => ({
    id: course.id,
    title: course.title,
    slug: course.slug,
    status: course.status,
    visibility: course.visibility,
    level: course.level,
    lessonCount: course.modules.reduce((sum, module) => sum + module.lessons.length, 0),
    moduleCount: course._count.modules,
    learnerCount: course._count.enrollments,
  }));

  const shareUrl =
    process.env.NODE_ENV === "production"
      ? `https://${workspace.subdomain}.gurulens.us`
      : `/lms/${workspace.subdomain}`;

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={base || "/"}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-ink-500 hover:text-brand-700"
        >
          <Icon name="arrow-left" size={14} /> {workspace.name}
        </Link>
        <span className="text-ink-300">/</span>
        <span className="text-[12.5px] font-bold text-ink-800">Manage</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link
            href={`${base}/courses`}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-4 py-2 text-[12px] font-bold text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-700"
          >
            <Icon name="eye" size={13} /> View hub
          </Link>
          <Link
            href={`${base}/manage/new`}
            className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-ink-800"
          >
            <Icon name="plus" size={13} /> New course
          </Link>
        </div>
      </div>

      {/* Share bar */}
      <div className="glass flex flex-wrap items-center gap-3 rounded-card p-4">
        <span
          className="flex size-10 flex-none items-center justify-center rounded-xl text-white"
          style={{ backgroundColor: brand }}
        >
          <Icon name="globe" size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[13.5px] font-extrabold text-ink-900">Your hub is live</h2>
          <p className="truncate text-[12px] text-ink-500">
            Share this address with your learners:{" "}
            <span className="font-bold text-ink-800">{shareUrl}</span>
          </p>
        </div>
        <CopyLinkButton value={shareUrl} />
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Courses" value={stats.courses} icon="book-open" hint={`${stats.publishedCourses} published`} />
        <Stat label="Lessons" value={stats.lessons} icon="play" />
        <Stat label="Learners" value={stats.learners} icon="users" hint={`${pending.length} pending`} />
        <Stat label="Completions" value={stats.completions} icon="award" />
      </div>

      {/* Plan limits */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-[13px] font-extrabold text-ink-900">Plan usage</h3>
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[10.5px] font-black text-brand-700 uppercase">
            Free during launch
          </span>
          <Link
            href="/pricing"
            className="ml-auto inline-flex items-center gap-1 text-[12px] font-bold text-brand-600 hover:text-brand-700"
          >
            Upgrade <Icon name="arrow-right" size={12} />
          </Link>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Courses", used: stats.courses, limit: limits.courses },
            { label: "Lessons", used: stats.lessons, limit: limits.lessons },
            { label: "Learners", used: stats.learners, limit: limits.students },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-ink-50/70 p-3">
              <div className="flex items-center justify-between text-[11.5px] font-bold">
                <span className="text-ink-500">{item.label}</span>
                <span className="text-ink-800">
                  {item.used} / {lmsLimitLabel(item.limit)}
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                  style={{
                    width:
                      item.limit === -1
                        ? "100%"
                        : `${Math.min(100, (item.used / Math.max(1, item.limit)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Learners */}
      <section>
        <SectionHeader
          title="Learners"
          subtitle={`${active.length} active · ${pending.length} awaiting approval`}
        />
        <LearnerPanel
          enrollments={enrollments.map((item) => ({
            id: item.id,
            status: item.status,
            enrolledAt: item.enrolledAt.toISOString(),
            userId: item.user.id,
            userName: item.user.name,
            userEmail: item.user.email,
            avatarKey: item.user.avatarKey,
            courseId: item.course.id,
            courseTitle: item.course.title,
          }))}
        />
      </section>

      {/* Courses */}
      <section>
        <SectionHeader
          title="Courses"
          subtitle={`${courses.length} course${courses.length === 1 ? "" : "s"} in this hub`}
          action={
            <Link
              href={`${base}/manage/new`}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-[12px] font-bold text-white hover:bg-brand-700"
            >
              <Icon name="plus" size={13} /> New course
            </Link>
          }
        />
        <CourseListPanel base={base} courses={courseCards} />
      </section>

      {/* Announcements */}
      <section>
        <SectionHeader title="Announcements" subtitle="Pin updates to the top of your hub." />
        <AnnouncementPanel
          workspaceId={workspace.id}
          announcements={announcements.map((item) => ({
            id: item.id,
            title: item.title,
            body: item.body,
            pinned: item.pinned,
            createdAt: item.createdAt.toISOString(),
            authorName: item.author?.name ?? null,
          }))}
        />
      </section>

      {/* Settings */}
      <section>
        <SectionHeader title="Hub settings" subtitle="Branding, subdomain and description." />
        <WorkspaceSettings
          workspace={{
            id: workspace.id,
            subdomain: workspace.subdomain,
            name: workspace.name,
            tagline: workspace.tagline,
            description: workspace.description,
            brandColor: workspace.brandColor,
            logoKey: workspace.logoKey,
            coverKey: workspace.coverKey,
          }}
          limits={limits}
          usage={{ courses: stats.courses, lessons: stats.lessons, learners: stats.learners }}
        />
      </section>
    </div>
  );
}
