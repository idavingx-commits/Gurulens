"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { ClientApiError, apiFetch } from "@/lib/client";

/** Toggle lesson completion and refresh server-rendered progress. */
export function LessonCompleteButton({
  lessonId,
  initialCompleted,
  disabled = false,
}: {
  lessonId: string;
  initialCompleted: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [completed, setCompleted] = useState(initialCompleted);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<{ completed: boolean; courseCompleted: boolean }>(
        `/api/lms/lessons/${lessonId}/complete`,
        { method: "POST" },
      );
      setCompleted(result.completed);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ClientApiError
          ? err.message
          : "Couldn't save your progress. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        onClick={toggle}
        disabled={busy || disabled}
        variant={completed ? "success" : "primary"}
        className="min-w-44"
      >
        {busy ? (
          "Saving…"
        ) : completed ? (
          <>
            <Icon name="check" size={15} strokeWidth={3} /> Completed
          </>
        ) : (
          <>
            <Icon name="check" size={15} /> Mark as complete
          </>
        )}
      </Button>
      {error ? <span className="text-[12px] font-semibold text-danger-600">{error}</span> : null}
    </div>
  );
}
