import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/ui/primitives";
import { getAuth } from "@/lib/auth";
import { getLmsAccess, getLmsBasePath, getLmsWorkspaceBySubdomain } from "@/lib/lms";
import { CourseForm } from "@/components/lms/manage/CourseForm";

type Props = { params: Promise<{ tenant: string }> };

export const metadata: Metadata = { title: "New course" };

export default async function LmsNewCoursePage({ params }: Props) {
  const { tenant } = await params;
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
          title="You can't create courses here"
          description="Only the hub owner and organization managers can add courses."
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

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <nav className="flex flex-wrap items-center gap-2 text-[12.5px] font-bold text-ink-500">
        <Link href={`${base}/manage`} className="hover:text-brand-700">
          Manage
        </Link>
        <span className="text-ink-300">/</span>
        <span className="text-ink-800">New course</span>
      </nav>

      <div>
        <h1 className="text-[24px] font-black tracking-tight text-ink-900">Create a course</h1>
        <p className="mt-1 text-[13.5px] text-ink-500">
          Start with the basics — you can add modules and lessons right after.
        </p>
      </div>

      <CourseForm workspaceId={workspace.id} base={base} />
    </div>
  );
}
