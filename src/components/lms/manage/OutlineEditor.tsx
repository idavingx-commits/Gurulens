"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/primitives";
import { Spinner } from "@/components/ui/interactive";
import { ClientApiError, apiFetch } from "@/lib/client";
import { cn } from "@/lib/format";

type LessonDraft = {
  id?: string;
  title: string;
  description: string;
  content: string;
  videoUrl: string;
  durationMin: string;
  isPreview: boolean;
};

type ModuleDraft = {
  id?: string;
  title: string;
  description: string;
  lessons: LessonDraft[];
};

function emptyLesson(): LessonDraft {
  return {
    title: "",
    description: "",
    content: "",
    videoUrl: "",
    durationMin: "",
    isPreview: false,
  };
}

function emptyModule(): ModuleDraft {
  return { title: "", description: "", lessons: [emptyLesson()] };
}

function toDrafts(
  modules: Array<{
    id: string;
    title: string;
    description: string | null;
    lessons: Array<{
      id: string;
      title: string;
      description: string | null;
      content: string | null;
      videoUrl: string | null;
      durationMin: number | null;
      isPreview: boolean;
    }>;
  }>,
): ModuleDraft[] {
  return modules.map((module) => ({
    id: module.id,
    title: module.title,
    description: module.description ?? "",
    lessons: module.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      description: lesson.description ?? "",
      content: lesson.content ?? "",
      videoUrl: lesson.videoUrl ?? "",
      durationMin: lesson.durationMin ? String(lesson.durationMin) : "",
      isPreview: lesson.isPreview,
    })),
  }));
}

export function OutlineEditor({
  courseId,
  base,
  initialModules,
}: {
  courseId: string;
  base: string;
  initialModules: Array<{
    id: string;
    title: string;
    description: string | null;
    lessons: Array<{
      id: string;
      title: string;
      description: string | null;
      content: string | null;
      videoUrl: string | null;
      durationMin: number | null;
      isPreview: boolean;
    }>;
  }>;
}) {
  const router = useRouter();
  const [modules, setModules] = useState<ModuleDraft[]>(
    initialModules.length > 0 ? toDrafts(initialModules) : [emptyModule()],
  );
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  function updateModule(index: number, patch: Partial<ModuleDraft>) {
    setModules((current) =>
      current.map((module, i) => (i === index ? { ...module, ...patch } : module)),
    );
  }

  function updateLesson(moduleIndex: number, lessonIndex: number, patch: Partial<LessonDraft>) {
    setModules((current) =>
      current.map((module, i) =>
        i === moduleIndex
          ? {
              ...module,
              lessons: module.lessons.map((lesson, j) =>
                j === lessonIndex ? { ...lesson, ...patch } : lesson,
              ),
            }
          : module,
      ),
    );
  }

  function addModule() {
    setModules((current) => [...current, emptyModule()]);
    setExpanded((current) => new Set([...current, modules.length]));
  }

  function removeModule(index: number) {
    if (!window.confirm("Remove this module and all of its lessons?")) return;
    setModules((current) => current.filter((_, i) => i !== index));
  }

  function addLesson(moduleIndex: number) {
    setModules((current) =>
      current.map((module, i) =>
        i === moduleIndex ? { ...module, lessons: [...module.lessons, emptyLesson()] } : module,
      ),
    );
  }

  function removeLesson(moduleIndex: number, lessonIndex: number) {
    setModules((current) =>
      current.map((module, i) =>
        i === moduleIndex
          ? { ...module, lessons: module.lessons.filter((_, j) => j !== lessonIndex) }
          : module,
      ),
    );
  }

  function moveModule(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= modules.length) return;
    setModules((current) => {
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved!);
      return next;
    });
  }

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const payload = {
        modules: modules
          .filter((module) => module.title.trim().length >= 2)
          .map((module) => ({
            ...(module.id ? { id: module.id } : {}),
            title: module.title.trim(),
            description: module.description.trim() || undefined,
            lessons: module.lessons
              .filter((lesson) => lesson.title.trim().length >= 2)
              .map((lesson) => ({
                ...(lesson.id ? { id: lesson.id } : {}),
                title: lesson.title.trim(),
                description: lesson.description.trim() || undefined,
                content: lesson.content.trim() || undefined,
                videoUrl: lesson.videoUrl.trim() || undefined,
                ...(lesson.durationMin
                  ? { durationMin: Number.parseInt(lesson.durationMin, 10) }
                  : {}),
                isPreview: lesson.isPreview,
              })),
          })),
      };

      await apiFetch(`/api/lms/courses/${courseId}/outline`, {
        method: "PUT",
        body: payload,
      });
      setMessage({ tone: "ok", text: "Curriculum saved." });
      router.refresh();
    } catch (err) {
      setMessage({
        tone: "err",
        text: err instanceof ClientApiError ? err.message : "Could not save the curriculum.",
      });
    } finally {
      setBusy(false);
    }
  }

  const totalLessons = modules.reduce((sum, module) => sum + module.lessons.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[12.5px] font-semibold text-ink-500">
          {modules.length} module{modules.length === 1 ? "" : "s"} Â· {totalLessons} lesson
          {totalLessons === 1 ? "" : "s"}
        </span>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={addModule}>
            <Icon name="plus" size={13} /> Add module
          </Button>
          <Button size="sm" onClick={save} disabled={busy}>
            {busy ? <Spinner size={14} /> : <Icon name="check" size={14} strokeWidth={3} />} Save
            curriculum
          </Button>
        </div>
      </div>

      {message ? (
        <div
          className={cn(
            "rounded-2xl border p-3.5 text-[13px] font-semibold",
            message.tone === "ok"
              ? "border-success-500/30 bg-success-100/60 text-success-600"
              : "border-danger-500/30 bg-danger-100/60 text-danger-600",
          )}
        >
          {message.text}
        </div>
      ) : null}

      <div className="space-y-3">
        {modules.map((module, moduleIndex) => {
          const isOpen = expanded.has(moduleIndex);
          return (
            <div key={moduleIndex} className="card overflow-hidden">
              <div className="flex items-center gap-2 border-b border-ink-100 bg-ink-50/60 px-4 py-3">
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((current) => {
                      const next = new Set(current);
                      if (next.has(moduleIndex)) next.delete(moduleIndex);
                      else next.add(moduleIndex);
                      return next;
                    })
                  }
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="flex size-7 flex-none items-center justify-center rounded-lg bg-white text-[11.5px] font-black text-ink-700 ring-1 ring-ink-200">
                    {moduleIndex + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-extrabold text-ink-900">
                    {module.title || "Untitled module"}
                  </span>
                  <span className="flex-none text-[11.5px] font-bold text-ink-400">
                    {module.lessons.length} lesson{module.lessons.length === 1 ? "" : "s"}
                  </span>
                  <Icon
                    name="chevron-down"
                    size={16}
                    className={cn(
                      "flex-none text-ink-400 transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>
                <div className="flex flex-none gap-1">
                  <button
                    type="button"
                    onClick={() => moveModule(moduleIndex, -1)}
                    disabled={moduleIndex === 0}
                    className="rounded-full p-1.5 text-ink-400 transition-colors hover:bg-white hover:text-ink-700 disabled:opacity-30"
                    title="Move up"
                  >
                    <Icon name="chevron-down" size={14} className="rotate-180" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveModule(moduleIndex, 1)}
                    disabled={moduleIndex === modules.length - 1}
                    className="rounded-full p-1.5 text-ink-400 transition-colors hover:bg-white hover:text-ink-700 disabled:opacity-30"
                    title="Move down"
                  >
                    <Icon name="chevron-down" size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeModule(moduleIndex)}
                    className="rounded-full p-1.5 text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-600"
                    title="Remove module"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </div>

              {isOpen ? (
                <div className="space-y-4 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Module title" htmlFor={`mod-${moduleIndex}-title`}>
                      <Input
                        id={`mod-${moduleIndex}-title`}
                        value={module.title}
                        onChange={(event) => updateModule(moduleIndex, { title: event.target.value })}
                        placeholder="Week 1 â€” Algebra fundamentals"
                        maxLength={160}
                      />
                    </Field>
                    <Field
                      label="Module description"
                      htmlFor={`mod-${moduleIndex}-desc`}
                      hint="Optional"
                    >
                      <Input
                        id={`mod-${moduleIndex}-desc`}
                        value={module.description}
                        onChange={(event) =>
                          updateModule(moduleIndex, { description: event.target.value })
                        }
                        placeholder="What this module covers"
                        maxLength={600}
                      />
                    </Field>
                  </div>

                  <div className="space-y-3">
                    {module.lessons.map((lesson, lessonIndex) => (
                      <div
                        key={lessonIndex}
                        className="rounded-2xl border border-ink-100 bg-white/70 p-3.5"
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex size-6 flex-none items-center justify-center rounded-lg bg-brand-50 text-[11px] font-black text-brand-700">
                            {lessonIndex + 1}
                          </span>
                          <Input
                            value={lesson.title}
                            onChange={(event) =>
                              updateLesson(moduleIndex, lessonIndex, { title: event.target.value })
                            }
                            placeholder="Lesson title"
                            maxLength={160}
                            className="border-0 bg-transparent px-1 py-1.5 font-bold shadow-none focus:ring-0"
                          />
                          <button
                            type="button"
                            onClick={() => removeLesson(moduleIndex, lessonIndex)}
                            className="flex-none rounded-full p-1.5 text-ink-300 transition-colors hover:bg-danger-50 hover:text-danger-600"
                            title="Remove lesson"
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <Field label="Short description" htmlFor={`les-${moduleIndex}-${lessonIndex}-desc`}>
                            <Input
                              id={`les-${moduleIndex}-${lessonIndex}-desc`}
                              value={lesson.description}
                              onChange={(event) =>
                                updateLesson(moduleIndex, lessonIndex, {
                                  description: event.target.value,
                                })
                              }
                              placeholder="One line summary"
                              maxLength={600}
                            />
                          </Field>
                          <div className="grid grid-cols-2 gap-3">
                            <Field label="Video URL" htmlFor={`les-${moduleIndex}-${lessonIndex}-video`}>
                              <Input
                                id={`les-${moduleIndex}-${lessonIndex}-video`}
                                value={lesson.videoUrl}
                                onChange={(event) =>
                                  updateLesson(moduleIndex, lessonIndex, {
                                    videoUrl: event.target.value,
                                  })
                                }
                                placeholder="https://â€¦"
                                maxLength={500}
                              />
                            </Field>
                            <Field
                              label="Minutes"
                              htmlFor={`les-${moduleIndex}-${lessonIndex}-min`}
                            >
                              <Input
                                id={`les-${moduleIndex}-${lessonIndex}-min`}
                                type="number"
                                min={1}
                                max={600}
                                value={lesson.durationMin}
                                onChange={(event) =>
                                  updateLesson(moduleIndex, lessonIndex, {
                                    durationMin: event.target.value,
                                  })
                                }
                                placeholder="15"
                              />
                            </Field>
                          </div>
                        </div>

                        <div className="mt-3">
                          <Field
                            label="Lesson content"
                            htmlFor={`les-${moduleIndex}-${lessonIndex}-content`}
                            hint="Markdown-ish: blank line = new paragraph, lines starting with - = list."
                          >
                            <Textarea
                              id={`les-${moduleIndex}-${lessonIndex}-content`}
                              value={lesson.content}
                              onChange={(event) =>
                                updateLesson(moduleIndex, lessonIndex, {
                                  content: event.target.value,
                                })
                              }
                              placeholder={"Explain the conceptâ€¦\n\n- Key point one\n- Key point two"}
                              maxLength={30000}
                              className="min-h-24 font-mono text-[12.5px]"
                            />
                          </Field>
                        </div>

                        <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-[12.5px] font-semibold text-ink-700">
                          <input
                            type="checkbox"
                            checked={lesson.isPreview}
                            onChange={(event) =>
                              updateLesson(moduleIndex, lessonIndex, {
                                isPreview: event.target.checked,
                              })
                            }
                            className="size-4 rounded border-ink-300 accent-brand-600"
                          />
                          Preview lesson â€” visible to everyone before enrolling
                          {lesson.isPreview ? (
                            <Badge tone="brand" className="ml-1">
                              Preview
                            </Badge>
                          ) : null}
                        </label>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => addLesson(moduleIndex)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-ink-200 bg-white/50 py-3 text-[12.5px] font-bold text-ink-500 transition-colors hover:border-brand-300 hover:text-brand-700"
                    >
                      <Icon name="plus" size={14} /> Add lesson
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink-100 bg-white/70 p-4">
        <p className="min-w-0 flex-1 text-[12.5px] text-ink-500">
          Changes are saved only when you press <span className="font-bold">Save curriculum</span>.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addModule}>
            <Icon name="plus" size={13} /> Add module
          </Button>
          <Button size="sm" onClick={save} disabled={busy}>
            {busy ? <Spinner size={14} /> : <Icon name="check" size={14} strokeWidth={3} />} Save
          </Button>
          <Link
            href={`${base}/manage`}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-bold text-ink-500 transition-colors hover:text-ink-800"
          >
            Done
          </Link>
        </div>
      </div>
    </div>
  );
}
