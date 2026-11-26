import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LmsCourseCard } from "@/components/lms/LmsCourseCard";
import { Icon } from "@/components/ui/icons";
import { EmptyState, InfoNote, SectionHeader } from "@/components/ui/primitives";
import { getAuth } from "@/lib/auth";
import {
  getLmsAccess,
  getLmsBasePath,
  getLmsCourseCards,
  getLmsWorkspaceBySubdomain,
} from "@/lib/lms";

type Props = { params: Promise<{ tenant: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenant } = await params;
  const workspace = await getLmsWorkspaceBySubdomain(tenant);
  if (!workspace) return { title: "Courses" };
  return { title: `Courses · ${workspace.name}` };
}

export default async function LmsCoursesPage({ params }: Props) {
  const { tenant } = await params;
  const workspace = await getLmsWorkspaceBySubdomain(tenant);
  if (!workspace) notFound();

  const auth = await getAuth();
  const access = await getLmsAccess(workspace, auth?.user ?? null);
  const base = await getLmsBasePath(workspace.subdomain);

  const cards = await getLmsCourseCards(workspace.id, auth?.user.id ?? null, {
    includeDrafts: access.canManage,
  });
  const published = cards.filter((course) => course.status === "published");
  const drafts = cards.filter((course) => course.status !== "published");
  const enrolled = cards.filter((course) => course.enrolled);

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
        <span className="text-[12.5px] font-bold text-ink-800">Courses</span>
        {access.canManage ? (
          <Link
            href={`${base}/manage/new`}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-ink-800"
          >
            <Icon name="plus" size={13} /> New course
          </Link>
        ) : null}
      </div>

      <div>
        <SectionHeader
          title={`All courses${published.length ? ` · ${published.length}` : ""}`}
          subtitle={`Courses published by ${workspace.name}.`}
        />

        {!auth ? (
          <InfoNote icon="info" className="mb-4">
            Sign in to enroll, track progress and open members-only courses.
          </InfoNote>
        ) : null}

        {enrolled.length > 0 ? (
          <div className="mb-6">
            <h3 className="mb-3 text-[12px] font-black tracking-[0.1em] text-ink-400 uppercase">
              Enrolled
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {enrolled.map((course) => (
                <LmsCourseCard key={course.id} course={course} base={base} />
              ))}
            </div>
          </div>
        ) : null}

        {published.length === 0 ? (
          <EmptyState
            icon="book-open"
            title="No published courses yet"
            description={
              access.canManage
                ? "Publish your first course so learners can enroll."
                : "New courses will appear here as soon as they're published."
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {published
              .filter((course) => !course.enrolled)
              .map((course) => (
                <LmsCourseCard key={course.id} course={course} base={base} />
              ))}
          </div>
        )}
      </div>

      {access.canManage && drafts.length > 0 ? (
        <section className="rounded-2xl border border-warn-500/25 bg-warn-100/40 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Icon name="pencil" size={14} className="text-warn-600" />
            <h3 className="text-[12.5px] font-extrabold text-warn-600">
              Drafts &amp; archived · {drafts.length}
            </h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {drafts.map((course) => (
              <LmsCourseCard key={course.id} course={course} base={base} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
