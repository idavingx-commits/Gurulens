import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Icon } from "@/components/ui/icons";
import { Badge, EmptyState, Stat } from "@/components/ui/primitives";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLmsAccess, getLmsBasePath, getLmsWorkspaceBySubdomain } from "@/lib/lms";
import { CourseForm } from "@/components/lms/manage/CourseForm";
import { OutlineEditor } from "@/components/lms/manage/OutlineEditor";

type Props = { params: Promise<{ tenant: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const course = await db.lmsCourse.findUnique({ where: { id }, select: { title: true } });
  return { title: course ? `Edit · ${course.title}` : "Edit course" };
}

export default async function LmsCourseEditorPage({ params }: Props) {
  const { tenant, id } = await params;
  const workspace = await getLmsWorkspaceBySubdomain(tenant);
  if (!workspace) notFound();

  const auth = await getAuth();
  const access = await getLmsAccess(workspace, auth?.user ?? null);
  const base = await getLmsBasePath(workspace.subdomain);

  if (!auth || !access.canManage) {
    return (
      <div className="mx-auto max-w-lg py-6">
        <EmptyState
          icon="lock"
          title="You can't edit this course"
          description="Only the hub owner and organization managers can edit courses."
          action={
            <Link
              href={base || "/"}
              className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-5 py-2.5 text-[13px] font-bold text-ink-700 hover:border-brand-300 hover:text-brand-700"
            >
              Back to hub
            </Link>
          }
        />
      </div>
    );
  }

  const course = await db.lmsCourse.findFirst({
    where: { id, workspaceId: workspace.id },
    include: {
      modules: {
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            orderBy: { sortOrder: "asc" },
            include: {
              progress: { select: { id: true } },
            },
          },
        },
      },
      _count: { select: { enrollments: true } },
    },
  });
  if (!course) notFound();

  const totalLessons = course.modules.reduce((sum, module) => sum + module.lessons.length, 0);
  const completions = course.modules.reduce(
    (sum, module) => sum + module.lessons.reduce((n, lesson) => n + lesson.progress.length, 0),
    0,
  );

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-2 text-[12.5px] font-bold text-ink-500">
        <Link href={`${base}/manage`} className="hover:text-brand-700">
          Manage
        </Link>
        <span className="text-ink-300">/</span>
        <span className="truncate text-ink-800">{course.title}</span>
      </nav>

      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[24px] font-black tracking-tight text-ink-900">{course.title}</h1>
            <Badge tone={course.status === "published" ? "success" : "warn"}>{course.status}</Badge>
            <Badge tone={course.visibility === "public" ? "brand" : "neutral"}>
              {course.visibility === "public" ? "Open" : "Members"}
            </Badge>
          </div>
          <p className="mt-1 text-[13px] text-ink-500">
            Edit the details, then build modules and lessons below.
          </p>
        </div>
        <Link
          href={`${base}/courses/${course.id}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-4 py-2 text-[12px] font-bold text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-700"
        >
          <Icon name="eye" size={13} /> Preview
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Modules" value={course.modules.length} icon="list" />
        <Stat label="Lessons" value={totalLessons} icon="play" />
        <Stat label="Learners" value={course._count.enrollments} icon="users" />
        <Stat label="Lesson completions" value={completions} icon="award" />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-extrabold tracking-tight text-ink-900">Course details</h2>
        <CourseForm
          workspaceId={workspace.id}
          base={base}
          courseId={course.id}
          initial={{
            title: course.title,
            description: course.description,
            level: course.level,
            visibility: course.visibility,
            status: course.status,
            slug: course.slug,
          }}
        />
      </section>

      <section>
        <h2 className="mb-1 text-lg font-extrabold tracking-tight text-ink-900">Curriculum</h2>
        <p className="mb-3 text-[13px] text-ink-500">
          Add modules, then lessons inside each module. Save when you&apos;re done.
        </p>
        <OutlineEditor
          courseId={course.id}
          base={base}
          initialModules={course.modules.map((module) => ({
            id: module.id,
            title: module.title,
            description: module.description,
            lessons: module.lessons.map((lesson) => ({
              id: lesson.id,
              title: lesson.title,
              description: lesson.description,
              content: lesson.content,
              videoUrl: lesson.videoUrl,
              durationMin: lesson.durationMin,
              isPreview: lesson.isPreview,
            })),
          }))}
        />
      </section>
    </div>
  );
}
