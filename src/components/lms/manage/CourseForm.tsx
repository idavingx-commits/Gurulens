"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Field, Input, Select, Textarea } from "@/components/ui/input";

import { Spinner } from "@/components/ui/interactive";
import { ClientApiError, apiFetch } from "@/lib/client";

const LEVELS = [
  { value: "all", label: "All levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const VISIBILITIES = [
  { value: "public", label: "Open â€” anyone can enroll" },
  { value: "members", label: "Members only â€” needs approval" },
];

const STATUSES = [
  { value: "published", label: "Published â€” visible now" },
  { value: "draft", label: "Draft â€” only managers see it" },
];

export function CourseForm({
  workspaceId,
  base,
  courseId,
  initial,
}: {
  workspaceId: string;
  base: string;
  courseId?: string;
  initial?: {
    title: string;
    description: string | null;
    level: string;
    visibility: string;
    status: string;
    slug: string;
  };
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [level, setLevel] = useState(initial?.level ?? "all");
  const [visibility, setVisibility] = useState(initial?.visibility ?? "members");
  const [status, setStatus] = useState(initial?.status ?? "published");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        level,
        visibility,
        status,
      };
      const result = courseId
        ? await apiFetch<{ course: { id: string } }>(`/api/lms/courses/${courseId}`, {
            method: "PATCH",
            body: payload,
          })
        : await apiFetch<{ course: { id: string } }>("/api/lms/courses", {
            method: "POST",
            body: { ...payload, workspaceId },
          });

      if (courseId) {
        router.refresh();
        setError(null);
      } else {
        router.push(`${base}/manage/${result.course.id}`);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not save that course.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      <Field label="Course title" htmlFor="course-title" error={error}>
        <Input
          id="course-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="O/L Mathematics â€” Full Revision"
          maxLength={140}
          required
        />
      </Field>

      <Field
        label="Description"
        htmlFor="course-desc"
        hint="What will learners cover? Shown on the course card."
      >
        <Textarea
          id="course-desc"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="A complete revision course covering the full syllabus with worked examples."
          maxLength={2000}
          className="min-h-24"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Level" htmlFor="course-level">
          <Select
            id="course-level"
            value={level}
            onChange={(event) => setLevel(event.target.value)}
          >
            {LEVELS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Access" htmlFor="course-visibility">
          <Select
            id="course-visibility"
            value={visibility}
            onChange={(event) => setVisibility(event.target.value)}
          >
            {VISIBILITIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Status" htmlFor="course-status">
          <Select id="course-status" value={status} onChange={(event) => setStatus(event.target.value)}>
            {STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-ink-100 pt-4">
        <Button type="submit" disabled={busy || title.trim().length < 3}>
          {busy ? <Spinner size={14} /> : <Icon name={courseId ? "check" : "plus"} size={14} />}
          {courseId ? "Save course" : "Create course"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(`${base}/manage`)}
          disabled={busy}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
