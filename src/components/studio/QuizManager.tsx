"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { ConfirmDialog, Switch } from "@/components/ui/interactive";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError } from "@/lib/client";
import { cn, timeAgo } from "@/lib/format";

type Option = { id: string; name: string };

export type ManagedQuiz = {
  id: string;
  title: string;
  published: boolean;
  timeLimitMin: number | null;
  createdAt: string;
  subjectId: string | null;
  gradeId: string | null;
  questionCount: number;
  attemptCount: number;
};

type QuestionDraft = {
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

const BLANK_QUESTION: QuestionDraft = {
  text: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  explanation: "",
};

export function QuizManager({
  quizzes,
  subjects,
  grades,
}: {
  quizzes: ManagedQuiz[];
  subjects: Option[];
  grades: Option[];
}) {
  const router = useRouter();
  const toast = useToast();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [timeLimit, setTimeLimit] = useState("");
  const [published, setPublished] = useState(false);
  const [questions, setQuestions] = useState<QuestionDraft[]>([{ ...BLANK_QUESTION }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<ManagedQuiz | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setSubjectId("");
    setGradeId("");
    setTimeLimit("");
    setPublished(false);
    setQuestions([{ ...BLANK_QUESTION, options: ["", "", "", ""] }]);
    setError(null);
  }

  async function startEdit(id: string) {
    setLoadingEdit(true);
    setError(null);
    try {
      const res = await apiFetch<{
        quiz: {
          title: string;
          description: string | null;
          subjectId: string | null;
          gradeId: string | null;
          timeLimitMin: number | null;
          published: boolean;
          questions: Array<{
            text: string;
            options: string[];
            correctIndex: number;
            explanation: string | null;
          }>;
        };
      }>(`/api/quizzes/${id}`);
      const q = res.quiz;
      setEditingId(id);
      setTitle(q.title);
      setDescription(q.description ?? "");
      setSubjectId(q.subjectId ?? "");
      setGradeId(q.gradeId ?? "");
      setTimeLimit(q.timeLimitMin ? String(q.timeLimitMin) : "");
      setPublished(q.published);
      setQuestions(
        q.questions.map((item) => ({
          text: item.text,
          options: item.options,
          correctIndex: item.correctIndex,
          explanation: item.explanation ?? "",
        })),
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Could not load the quiz.");
    } finally {
      setLoadingEdit(false);
    }
  }

  function updateQuestion(qi: number, patch: Partial<QuestionDraft>) {
    setQuestions((prev) => prev.map((q, i) => (i === qi ? { ...q, ...patch } : q)));
  }

  async function onSubmit() {
    setError(null);

    if (title.trim().length < 3) {
      setError("Give your quiz a title (at least 3 characters).");
      return;
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]!;
      const opts = q.options.map((o) => o.trim()).filter(Boolean);
      if (!q.text.trim()) {
        setError(`Question ${i + 1} needs text.`);
        return;
      }
      if (opts.length < 2) {
        setError(`Question ${i + 1} needs at least 2 options.`);
        return;
      }
      if (!q.options[q.correctIndex]?.trim()) {
        setError(`Question ${i + 1}: the correct option cannot be empty.`);
        return;
      }
    }

    setBusy(true);
    try {
      const body = {
        title: title.trim(),
        description: description.trim() || undefined,
        subjectId: subjectId || undefined,
        gradeId: gradeId || undefined,
        timeLimitMin: timeLimit ? Number(timeLimit) : undefined,
        published,
        questions: questions.map((q) => {
          const options = q.options.map((o) => o.trim()).filter((o) => o.length > 0);
          const correctIndex = q.options
            .slice(0, q.correctIndex)
            .map((o) => o.trim())
            .filter((o) => o.length > 0).length;
          return {
            text: q.text.trim(),
            options,
            correctIndex,
            explanation: q.explanation.trim() || undefined,
          };
        }),
      };

      if (editingId) {
        await apiFetch(`/api/quizzes/${editingId}`, { method: "PATCH", body });
        toast.success("Quiz updated.");
      } else {
        await apiFetch("/api/quizzes", { method: "POST", body });
        toast.success(published ? "Quiz published!" : "Draft saved.");
      }
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not save the quiz.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await apiFetch(`/api/quizzes/${deleting.id}`, { method: "DELETE" });
      toast.success("Quiz deleted.");
      if (editingId === deleting.id) resetForm();
      setDeleting(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Could not delete the quiz.");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <>
      <div className="card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-extrabold text-ink-900">
            {editingId ? "Edit quiz" : "Create a quiz"}
          </h2>
          {editingId ? (
            <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
              <Icon name="x" size={14} />
              Cancel edit
            </Button>
          ) : null}
        </div>

        <div className="mt-4 space-y-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Quiz title, e.g. O/L Maths — Algebra Basics"
            maxLength={140}
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Short description (optional)"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Subject">
              <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                <option value="">None</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Grade">
              <Select value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
                <option value="">None</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Time limit (min)">
              <Input
                type="number"
                min={1}
                max={180}
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
                placeholder="No limit"
              />
            </Field>
          </div>

          <div className="space-y-4">
            {questions.map((q, qi) => (
              <div key={qi} className="rounded-2xl border border-ink-100 bg-white/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12px] font-extrabold tracking-wide text-ink-400 uppercase">
                    Question {qi + 1}
                  </span>
                  {questions.length > 1 ? (
                    <button
                      type="button"
                      aria-label={`Remove question ${qi + 1}`}
                      onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== qi))}
                      className="flex size-7 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-danger-100 hover:text-danger-600"
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  ) : null}
                </div>

                <Input
                  value={q.text}
                  onChange={(e) => updateQuestion(qi, { text: e.target.value })}
                  placeholder="Question text"
                  maxLength={500}
                  className="mt-2.5"
                />

                <div className="mt-2.5 space-y-2">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`Mark option ${oi + 1} as correct`}
                        onClick={() => updateQuestion(qi, { correctIndex: oi })}
                        className={cn(
                          "flex size-6 flex-none items-center justify-center rounded-full border text-[11px] font-extrabold transition-all",
                          q.correctIndex === oi
                            ? "border-success-600 bg-success-500 text-white"
                            : "border-ink-200 text-ink-400 hover:border-success-500 hover:text-success-600",
                        )}
                      >
                        {q.correctIndex === oi ? (
                          <Icon name="check" size={12} strokeWidth={3} />
                        ) : (
                          String.fromCharCode(65 + oi)
                        )}
                      </button>
                      <Input
                        value={opt}
                        onChange={(e) =>
                          updateQuestion(qi, {
                            options: q.options.map((o, i) => (i === oi ? e.target.value : o)),
                          })
                        }
                        placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                        maxLength={200}
                        className="!py-1.5"
                      />
                      {q.options.length > 2 ? (
                        <button
                          type="button"
                          aria-label={`Remove option ${oi + 1}`}
                          onClick={() =>
                            updateQuestion(qi, {
                              options: q.options.filter((_, i) => i !== oi),
                              correctIndex:
                                q.correctIndex === oi
                                  ? 0
                                  : q.correctIndex > oi
                                    ? q.correctIndex - 1
                                    : q.correctIndex,
                            })
                          }
                          className="flex size-7 flex-none items-center justify-center rounded-full text-ink-300 transition-colors hover:bg-ink-100 hover:text-ink-600"
                        >
                          <Icon name="x" size={12} strokeWidth={2.6} />
                        </button>
                      ) : (
                        <span className="w-7 flex-none" />
                      )}
                    </div>
                  ))}
                </div>

                {q.options.length < 6 ? (
                  <button
                    type="button"
                    onClick={() => updateQuestion(qi, { options: [...q.options, ""] })}
                    className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-bold text-brand-600 hover:text-brand-700"
                  >
                    <Icon name="plus" size={12} strokeWidth={2.6} />
                    Add option
                  </button>
                ) : null}

                <Input
                  value={q.explanation}
                  onChange={(e) => updateQuestion(qi, { explanation: e.target.value })}
                  placeholder="Explanation shown after submitting (optional)"
                  maxLength={500}
                  className="mt-2.5 !py-1.5"
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setQuestions((prev) => [
                  ...prev,
                  { ...BLANK_QUESTION, options: ["", "", "", ""] },
                ])
              }
              disabled={questions.length >= 50}
            >
              <Icon name="plus" size={14} strokeWidth={2.6} />
              Add question
            </Button>

            <Switch checked={published} onChange={setPublished} label="Publish immediately" />
          </div>

          {error ? (
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-danger-600">
              <Icon name="alert" size={13} />
              {error}
            </p>
          ) : null}

          <div className="flex items-center gap-2 border-t border-ink-100 pt-4">
            <Button type="button" onClick={onSubmit} disabled={busy}>
              <Icon name="check" size={15} strokeWidth={2.4} />
              {busy ? "Saving…" : editingId ? "Save changes" : published ? "Create & publish" : "Save draft"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-[15px] font-extrabold text-ink-900">Your quizzes</h2>
        {quizzes.length > 0 ? (
          <div className="space-y-2.5">
            {quizzes.map((q) => (
              <div key={q.id} className="card flex items-center gap-3 p-3.5">
                <span
                  className={cn(
                    "flex size-10 flex-none items-center justify-center rounded-2xl",
                    q.published ? "bg-accent-100 text-accent-700" : "bg-ink-100 text-ink-500",
                  )}
                >
                  <Icon name="target" size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/quiz/${q.id}`}
                      className="line-clamp-1 text-[13.5px] font-bold text-ink-900 hover:text-brand-700"
                    >
                      {q.title}
                    </Link>
                    {!q.published ? (
                      <span className="flex-none rounded-chip bg-ink-100 px-2 py-0.5 text-[10.5px] font-bold text-ink-500">
                        Draft
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px] font-semibold text-ink-400">
                    <span>{q.questionCount} questions</span>
                    <span>{q.attemptCount} attempts</span>
                    <span>created {timeAgo(q.createdAt)}</span>
                  </div>
                </div>
                <div className="flex flex-none items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => startEdit(q.id)}
                    disabled={loadingEdit}
                    aria-label="Edit quiz"
                    className="flex size-8 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
                  >
                    <Icon name="pencil" size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(q)}
                    aria-label="Delete quiz"
                    className="flex size-8 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-danger-100 hover:text-danger-600"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-ink-400">
            No quizzes yet — build your first one above and hit publish.
          </p>
        )}
      </div>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this quiz?"
        description="Questions and all student attempts will be removed. This cannot be undone."
        confirmLabel="Delete quiz"
        pending={deleteBusy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
