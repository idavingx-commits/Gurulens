"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { ClientApiError, apiFetch } from "@/lib/client";
import { cn } from "@/lib/format";

type CourseRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  visibility: string;
  level: string;
  lessonCount: number;
  moduleCount: number;
  learnerCount: number;
};

const LEVEL_LABEL: Record<string, string> = {
  all: "All levels",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export function CourseListPanel({ base, courses }: { base: string; courses: CourseRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(courses);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleStatus(course: CourseRow) {
    const next = course.status === "published" ? "draft" : "published";
    setBusyId(course.id);
    setError(null);
    try {
      await apiFetch(`/api/lms/courses/${course.id}`, {
        method: "PATCH",
        body: { status: next },
      });
      setRows((current) =>
        current.map((row) => (row.id === course.id ? { ...row, status: next } : row)),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not update the course.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(course: CourseRow) {
    if (!window.confirm(`Delete "${course.title}"? This cannot be undone.`)) return;
    setBusyId(course.id);
    setError(null);
    try {
      await apiFetch(`/api/lms/courses/${course.id}`, { method: "DELETE" });
      setRows((current) => current.filter((row) => row.id !== course.id));
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not delete the course.");
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon="book-open"
        title="No courses yet"
        description="Create your first course, then add modules and lessons."
        action={
          <Link
            href={`${base}/manage/new`}
            className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-[13px] font-bold text-white hover:bg-brand-700"
          >
            <Icon name="plus" size={15} /> Create a course
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-2xl border border-danger-500/30 bg-danger-100/60 p-3.5 text-[13px] font-semibold text-danger-600">
          {error}
        </div>
      ) : null}

      {rows.map((course) => (
        <div
          key={course.id}
          className="card flex flex-wrap items-center gap-3 p-4 transition-all hover:shadow-md"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`${base}/manage/${course.id}`}
                className="truncate text-[14px] font-extrabold text-ink-900 hover:text-brand-700"
              >
                {course.title}
              </Link>
              <Badge tone={course.status === "published" ? "success" : "warn"}>
                {course.status}
              </Badge>
              <Badge tone={course.visibility === "public" ? "brand" : "neutral"}>
                {course.visibility === "public" ? "Open" : "Members"}
              </Badge>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] font-semibold text-ink-400">
              <span className="inline-flex items-center gap-1">
                <Icon name="book-open" size={11} /> {course.moduleCount} modules
              </span>
              <span className="inline-flex items-center gap-1">
                <Icon name="play" size={11} /> {course.lessonCount} lessons
              </span>
              <span className="inline-flex items-center gap-1">
                <Icon name="users" size={11} /> {course.learnerCount} learners
              </span>
              <span className="capitalize">{LEVEL_LABEL[course.level] ?? course.level}</span>
              <span className="font-mono text-[10.5px] text-ink-300">/{course.slug}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`${base}/manage/${course.id}`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-[11.5px] font-bold text-ink-700 transition-colors",
                "hover:border-brand-300 hover:text-brand-700",
              )}
            >
              <Icon name="pencil" size={12} /> Edit
            </Link>
            <button
              type="button"
              onClick={() => toggleStatus(course)}
              disabled={busyId === course.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-[11.5px] font-bold text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"
            >
              <Icon name={course.status === "published" ? "eye" : "upload"} size={12} />
              {course.status === "published" ? "Unpublish" : "Publish"}
            </button>
            <button
              type="button"
              onClick={() => remove(course)}
              disabled={busyId === course.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-danger-500/30 bg-white px-3.5 py-1.5 text-[11.5px] font-bold text-danger-600 transition-colors hover:bg-danger-50 disabled:opacity-50"
            >
              <Icon name="trash" size={12} /> Delete
            </button>
          </div>
        </div>
      ))}

      <div className="pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.refresh()}
          className="text-ink-500"
        >
          <Icon name="refresh" size={13} /> Refresh list
        </Button>
      </div>
    </div>
  );
}
