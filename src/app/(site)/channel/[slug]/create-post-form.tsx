"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Checkbox, Input, Textarea } from "@/components/ui/input";
import { apiFetch, ClientApiError } from "@/lib/client";
import { cn } from "@/lib/format";

type Mode = "update" | "poll";

export function CreatePostForm({ channelSlug }: { channelSlug: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("update");
  const [content, setContent] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((opt, i) => (i === index ? value : opt)));
  }

  function addOption() {
    setOptions((prev) => (prev.length >= 6 ? prev : [...prev, ""]));
  }

  function removeOption(index: number) {
    setOptions((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);

    if (mode === "update") {
      if (!content.trim()) return setError("Write something before posting.");
    } else {
      if (question.trim().length < 3) return setError("Poll question must be at least 3 characters.");
      const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
      if (cleanOptions.length < 2) return setError("Add at least two poll options.");
      if (new Set(cleanOptions).size !== cleanOptions.length) {
        return setError("Poll options must be unique.");
      }
    }

    setPending(true);
    try {
      const body =
        mode === "poll"
          ? {
              type: "poll",
              content: content.trim() || undefined,
              pollQuestion: question.trim(),
              pollOptions: options.map((o) => o.trim()).filter(Boolean),
              pollAllowMultiple: allowMultiple,
              isPinned,
              isUrgent,
            }
          : {
              type: "text",
              content: content.trim(),
              isPinned,
              isUrgent,
            };

      await apiFetch(`/api/channels/${channelSlug}/posts`, { method: "POST", body });

      setContent("");
      setQuestion("");
      setOptions(["", ""]);
      setAllowMultiple(false);
      setIsPinned(false);
      setIsUrgent(false);
      setMode("update");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Failed to create post");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? <p className="text-[12.5px] font-semibold text-danger-600">{error}</p> : null}

      {/* Mode switch */}
      <div className="flex gap-1.5">
        {(
          [
            { key: "update", label: "Update", icon: "pencil" },
            { key: "poll", label: "Poll", icon: "chart" },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setMode(item.key)}
            aria-pressed={mode === item.key}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold transition-colors",
              mode === item.key
                ? "border-brand-300 bg-brand-50 text-brand-700"
                : "border-ink-200 bg-white/70 text-ink-500 hover:border-brand-200",
            )}
          >
            <Icon name={item.icon} size={14} />
            {item.label}
          </button>
        ))}
      </div>

      <Textarea
        placeholder={
          mode === "poll" ? "Add context for your poll (optional)…" : "Share an update with your followers…"
        }
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={mode === "poll" ? 2 : 3}
      />

      {mode === "poll" ? (
        <div className="space-y-3 rounded-2xl border border-ink-100 bg-ink-50/50 p-3.5">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Poll question — e.g., Which topic should we revise next?"
            maxLength={200}
            required
          />
          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="flex size-7 flex-none items-center justify-center rounded-full bg-white text-[11px] font-bold text-ink-400">
                  {index + 1}
                </span>
                <Input
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  maxLength={120}
                />
                {options.length > 2 ? (
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    aria-label={`Remove option ${index + 1}`}
                    className="flex-none rounded-full p-1.5 text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                  >
                    <Icon name="x" size={14} />
                  </button>
                ) : (
                  <span className="size-7 flex-none" />
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {options.length < 6 ? (
              <button
                type="button"
                onClick={addOption}
                className="inline-flex items-center gap-1 text-[12px] font-bold text-brand-600 hover:text-brand-700"
              >
                <Icon name="plus" size={13} /> Add option
              </button>
            ) : (
              <span className="text-[11.5px] text-ink-400">Maximum 6 options</span>
            )}
            <Checkbox
              checked={allowMultiple}
              onChange={(e) => setAllowMultiple(e.target.checked)}
              label="Allow multiple answers"
            />
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <Checkbox
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
            label={
              <span className="flex items-center gap-1">
                <Icon name="pin" size={14} /> Pin post
              </span>
            }
          />
          <Checkbox
            checked={isUrgent}
            onChange={(e) => setIsUrgent(e.target.checked)}
            label={
              <span className="flex items-center gap-1">
                <Icon name="alert" size={14} /> Mark urgent
              </span>
            }
          />
        </div>
        <Button type="submit" disabled={pending || (mode === "update" && !content.trim())}>
          {pending ? (
            <Icon name="loader" size={16} className="animate-spin" />
          ) : (
            <Icon name="send" size={16} />
          )}
          {mode === "poll" ? "Post poll" : "Post"}
        </Button>
      </div>
    </form>
  );
}
