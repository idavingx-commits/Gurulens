"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Field, Input, Textarea } from "@/components/ui/input";
import { EmptyState, InfoNote } from "@/components/ui/primitives";
import { apiFetch, ClientApiError, uploadMedia } from "@/lib/client";
import { cn, formatDate, isExpired, timeAgo } from "@/lib/format";

export type SubmissionItem = {
  id: string;
  studentId: string;
  studentName: string;
  studentAvatarKey: string | null;
  status: string;
  content: string | null;
  attachments: string[];
  score: number | null;
  feedback: string | null;
  submittedAt: string;
};

export type AssignmentItem = {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  maxScore: number | null;
  createdAt: string;
  submissionCount: number;
  mySubmission: SubmissionItem | null;
  submissions: SubmissionItem[];
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  submitted: { label: "Submitted", className: "bg-brand-50 text-brand-700" },
  graded: { label: "Graded", className: "bg-success-50 text-success-700" },
  late: { label: "Late", className: "bg-warn-50 text-warn-700" },
  resubmit: { label: "Needs changes", className: "bg-danger-50 text-danger-700" },
};

function statusMeta(status: string) {
  return STATUS_META[status] ?? STATUS_META.submitted!;
}

export function ClassAssignments({
  classId,
  canManage,
  isEnrolled,
  assignments,
}: {
  classId: string;
  canManage: boolean;
  isEnrolled: boolean;
  assignments: AssignmentItem[];
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [openAssignmentId, setOpenAssignmentId] = useState<string | null>(null);
  const [submitForId, setSubmitForId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {canManage ? (
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            variant={createOpen ? "outline" : "primary"}
            onClick={() => setCreateOpen((open) => !open)}
          >
            <Icon name={createOpen ? "x" : "plus"} size={14} />
            {createOpen ? "Close" : "New assignment"}
          </Button>
        </div>
      ) : null}

      {canManage && createOpen ? (
        <CreateAssignmentForm
          classId={classId}
          onDone={() => {
            setCreateOpen(false);
            router.refresh();
          }}
        />
      ) : null}

      {assignments.length === 0 ? (
        <EmptyState
          icon="clipboard"
          title="No assignments yet"
          description={
            canManage
              ? "Create the first assignment so your students can start submitting work."
              : "When your teacher posts an assignment it will appear here."
          }
        />
      ) : (
        assignments.map((assignment) => {
          const meta = statusMeta(assignment.mySubmission?.status ?? "submitted");
          const overdue =
            assignment.dueAt !== null &&
            isExpired(assignment.dueAt) &&
            !assignment.mySubmission;
          const expanded = openAssignmentId === assignment.id;
          const submitting = submitForId === assignment.id;

          return (
            <article
              key={assignment.id}
              className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm"
            >
              <div className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[15px] font-extrabold text-ink-900">{assignment.title}</h3>
                      {assignment.mySubmission ? (
                        <span
                          className={cn(
                            "rounded-chip px-2 py-0.5 text-[9.5px] font-black tracking-[0.1em] uppercase",
                            meta.className,
                          )}
                        >
                          {meta.label}
                        </span>
                      ) : overdue ? (
                        <span className="rounded-chip bg-danger-50 px-2 py-0.5 text-[9.5px] font-black tracking-[0.1em] text-danger-700 uppercase">
                          Overdue
                        </span>
                      ) : null}
                      {assignment.mySubmission?.score !== null &&
                      assignment.mySubmission?.score !== undefined ? (
                        <span className="rounded-chip bg-ink-900 px-2 py-0.5 text-[9.5px] font-black tracking-[0.1em] text-white uppercase">
                          {assignment.mySubmission.score}
                          {assignment.maxScore ? ` / ${assignment.maxScore}` : ""}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] font-semibold text-ink-400">
                      <span className="inline-flex items-center gap-1">
                        <Icon name="calendar" size={12} />
                        {assignment.dueAt ? `Due ${formatDate(assignment.dueAt)}` : "No due date"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Icon name="clock" size={12} /> Posted {timeAgo(assignment.createdAt)}
                      </span>
                      {canManage ? (
                        <span className="inline-flex items-center gap-1">
                          <Icon name="inbox" size={12} /> {assignment.submissionCount} submission
                          {assignment.submissionCount === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </div>

                    {assignment.description ? (
                      <p className="mt-2.5 text-[13px] leading-relaxed whitespace-pre-line text-ink-600">
                        {assignment.description}
                      </p>
                    ) : null}
                  </div>
                </div>

                {assignment.mySubmission?.feedback ? (
                  <div className="mt-3 rounded-xl border border-success-100 bg-success-50/60 p-3">
                    <p className="text-[10.5px] font-black tracking-[0.12em] text-success-700 uppercase">
                      Teacher feedback
                    </p>
                    <p className="mt-1 text-[12.5px] leading-relaxed whitespace-pre-line text-ink-700">
                      {assignment.mySubmission.feedback}
                    </p>
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {!canManage ? (
                    <Button
                      type="button"
                      size="xs"
                      variant={assignment.mySubmission ? "outline" : "primary"}
                      disabled={!isEnrolled}
                      onClick={() => {
                        setSubmitForId(submitting ? null : assignment.id);
                        setOpenAssignmentId(null);
                      }}
                    >
                      <Icon name="pencil" size={12} />
                      {assignment.mySubmission ? "Edit submission" : "Submit work"}
                    </Button>
                  ) : null}

                  {canManage && assignment.submissionCount > 0 ? (
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={() => {
                        setOpenAssignmentId(expanded ? null : assignment.id);
                        setSubmitForId(null);
                      }}
                    >
                      <Icon name="users" size={12} />
                      {expanded ? "Hide submissions" : "Review submissions"}
                    </Button>
                  ) : null}

                  {!isEnrolled && !canManage ? (
                    <span className="text-[11px] font-semibold text-ink-400">
                      Join the class to submit work.
                    </span>
                  ) : null}
                </div>

                {submitting && !canManage ? (
                  <SubmitAssignmentForm
                    assignment={assignment}
                    onDone={() => {
                      setSubmitForId(null);
                      router.refresh();
                    }}
                  />
                ) : null}
              </div>

              {expanded && canManage ? (
                <div className="border-t border-ink-100 bg-ink-50/40 p-4 sm:p-5">
                  {assignment.submissions.length === 0 ? (
                    <p className="text-[12.5px] font-semibold text-ink-400">
                      No submissions to grade yet.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {assignment.submissions.map((submission) => (
                        <GradeSubmissionRow
                          key={submission.id}
                          assignmentId={assignment.id}
                          maxScore={assignment.maxScore}
                          submission={submission}
                          onGraded={() => router.refresh()}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </article>
          );
        })
      )}
    </div>
  );
}

function CreateAssignmentForm({ classId, onDone }: { classId: string; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const dueAtLocal = String(formData.get("dueAt") ?? "").trim();
    const maxScoreRaw = String(formData.get("maxScore") ?? "").trim();

    if (title.length < 3) {
      setError("Give the assignment a clear title.");
      return;
    }

    setPending(true);
    try {
      await apiFetch(`/api/classes/${classId}/assignments`, {
        method: "POST",
        body: {
          title,
          description: description || undefined,
          dueAt: dueAtLocal ? new Date(dueAtLocal).toISOString() : undefined,
          maxScore: maxScoreRaw ? Number(maxScoreRaw) : undefined,
        },
      });
      form.reset();
      onDone();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not create the assignment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-2xl border border-brand-100 bg-brand-50/40 p-4"
    >
      {error ? (
        <InfoNote icon="alert" tone="danger">
          {error}
        </InfoNote>
      ) : null}
      <Field label="Title" htmlFor="assignment-title">
        <Input
          id="assignment-title"
          name="title"
          placeholder="e.g., Algebra worksheet 3"
          maxLength={160}
          required
        />
      </Field>
      <Field label="Instructions" htmlFor="assignment-description">
        <Textarea
          id="assignment-description"
          name="description"
          rows={3}
          maxLength={4000}
          placeholder="What should students do?"
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Due date" htmlFor="assignment-due">
          <Input id="assignment-due" name="dueAt" type="datetime-local" />
        </Field>
        <Field label="Max score" htmlFor="assignment-score" hint="Optional">
          <Input
            id="assignment-score"
            name="maxScore"
            type="number"
            min={1}
            max={1000}
            placeholder="e.g., 100"
          />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? (
            <Icon name="loader" size={14} className="animate-spin" />
          ) : (
            <Icon name="plus" size={14} />
          )}
          {pending ? "Creating…" : "Create assignment"}
        </Button>
      </div>
    </form>
  );
}

function SubmitAssignmentForm({
  assignment,
  onDone,
}: {
  assignment: AssignmentItem;
  onDone: () => void;
}) {
  const existing = assignment.mySubmission;
  const [content, setContent] = useState(existing?.content ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [pending, setPending] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setError(null);
    const next = [...files];
    for (const file of Array.from(list)) {
      if (next.length >= 3) {
        setError("Attach up to 3 files per submission.");
        break;
      }
      const mime = file.type.split(";")[0]!.trim().toLowerCase();
      const allowed = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
      if (!allowed.includes(mime)) {
        setError("Attach a PDF or a PNG, JPG or WebP image.");
        continue;
      }
      const maxBytes = (mime === "application/pdf" ? 20 : 10) * 1024 * 1024;
      if (file.size > maxBytes) {
        setError(
          `${file.name} is larger than ${mime === "application/pdf" ? "20" : "10"} MB.`,
        );
        continue;
      }
      if (next.some((item) => item.name === file.name && item.size === file.size)) continue;
      next.push(file);
    }
    setFiles(next);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    const text = content.trim();
    if (!text && files.length === 0 && (!existing || existing.attachments.length === 0)) {
      setError("Add your answer or attach a file before submitting.");
      return;
    }

    setPending(true);
    try {
      const attachmentIds: string[] = [];
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]!;
        const mime = file.type.split(";")[0]!.trim().toLowerCase();
        setUploadPct(Math.round((index / Math.max(1, files.length)) * 100));
        const media = await uploadMedia(file, mime === "application/pdf" ? "post_file" : "post_image");
        attachmentIds.push(media.id);
      }
      setUploadPct(null);

      await apiFetch(`/api/assignments/${assignment.id}/submit`, {
        method: "POST",
        body: {
          content: text || undefined,
          attachments:
            attachmentIds.length > 0
              ? attachmentIds
              : existing && existing.attachments.length > 0
                ? existing.attachments
                : undefined,
        },
      });
      onDone();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not submit your work.");
    } finally {
      setPending(false);
      setUploadPct(null);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-3 space-y-3 rounded-xl border border-ink-100 bg-ink-50/50 p-3.5"
    >
      {error ? <p className="text-[12px] font-semibold text-danger-600">{error}</p> : null}

      {existing && existing.attachments.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {existing.attachments.map((id) => (
            <a
              key={id}
              href={`/api/media/${id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[10.5px] font-bold text-ink-600 hover:border-brand-300 hover:text-brand-700"
            >
              <Icon name="file-text" size={11} /> Previous attachment
            </a>
          ))}
        </div>
      ) : null}

      <Textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={3}
        maxLength={20000}
        placeholder="Type your answer, or paste a link to your work…"
      />

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        multiple
        className="sr-only"
        onChange={(event) => addFiles(event.target.files)}
      />

      {files.length > 0 ? (
        <ul className="space-y-1.5">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}`}
              className="flex items-center gap-2 rounded-lg border border-ink-100 bg-white px-2.5 py-1.5"
            >
              <Icon name="file-text" size={13} className="flex-none text-ink-400" />
              <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-ink-600">
                {file.name}
              </span>
              <button
                type="button"
                onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                aria-label={`Remove ${file.name}`}
                className="rounded-full p-1 text-ink-400 hover:bg-danger-50 hover:text-danger-600"
              >
                <Icon name="x" size={12} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending || files.length >= 3}
          className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[11.5px] font-bold text-ink-600 transition-colors hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"
        >
          <Icon name="image" size={13} /> Attach PDF / image
        </button>
        <div className="flex items-center gap-2">
          {uploadPct !== null ? (
            <span className="text-[11px] font-semibold text-ink-500">Uploading {uploadPct}%</span>
          ) : null}
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? (
              <Icon name="loader" size={14} className="animate-spin" />
            ) : (
              <Icon name="send" size={14} />
            )}
            {pending ? "Submitting…" : existing ? "Update submission" : "Submit"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function GradeSubmissionRow({
  assignmentId,
  maxScore,
  submission,
  onGraded,
}: {
  assignmentId: string;
  maxScore: number | null;
  submission: SubmissionItem;
  onGraded: () => void;
}) {
  const meta = statusMeta(submission.status);
  const [score, setScore] = useState(submission.score?.toString() ?? "");
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function grade() {
    if (pending) return;
    const parsed = Number(score);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError("Enter a valid score.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      await apiFetch(`/api/assignments/${assignmentId}/submissions/${submission.id}`, {
        method: "PATCH",
        body: { score: Math.round(parsed), feedback: feedback.trim() || undefined },
      });
      onGraded();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not save the grade.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-ink-100 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Avatar
          name={submission.studentName}
          src={submission.studentAvatarKey ? `/api/media/${submission.studentAvatarKey}` : null}
          size="xs"
        />
        <span className="text-[12.5px] font-bold text-ink-800">{submission.studentName}</span>
        <span
          className={cn(
            "rounded-chip px-2 py-0.5 text-[9.5px] font-black tracking-[0.1em] uppercase",
            meta.className,
          )}
        >
          {meta.label}
        </span>
        <span className="text-[10.5px] font-semibold text-ink-400">
          {timeAgo(submission.submittedAt)}
        </span>
      </div>

      {submission.content ? (
        <p className="mt-2 text-[12.5px] leading-relaxed whitespace-pre-line text-ink-600">
          {submission.content}
        </p>
      ) : null}

      {submission.attachments.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {submission.attachments.map((id) => (
            <a
              key={id}
              href={`/api/media/${id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-ink-200 px-2.5 py-1 text-[10.5px] font-bold text-ink-600 hover:border-brand-300 hover:text-brand-700"
            >
              <Icon name="file-text" size={11} /> Attachment
            </a>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="w-24">
          <span className="mb-1 block text-[10px] font-black tracking-[0.12em] text-ink-400 uppercase">
            Score{maxScore ? ` / ${maxScore}` : ""}
          </span>
          <Input
            type="number"
            min={0}
            max={maxScore ?? 1000}
            value={score}
            onChange={(event) => setScore(event.target.value)}
            className="h-9"
          />
        </label>
        <label className="min-w-40 flex-1">
          <span className="mb-1 block text-[10px] font-black tracking-[0.12em] text-ink-400 uppercase">
            Feedback
          </span>
          <Input
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder="Optional comment for the student"
            className="h-9"
            maxLength={4000}
          />
        </label>
        <Button type="button" size="sm" onClick={grade} disabled={pending}>
          {pending ? (
            <Icon name="loader" size={14} className="animate-spin" />
          ) : (
            <Icon name="check" size={14} />
          )}
          {pending ? "Saving…" : "Save grade"}
        </Button>
      </div>
      {error ? <p className="mt-1.5 text-[11.5px] font-semibold text-danger-600">{error}</p> : null}
    </div>
  );
}
