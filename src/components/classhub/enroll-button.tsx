"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { apiFetch, ClientApiError } from "@/lib/client";
import { cn } from "@/lib/format";

export function EnrollButton({
  classId,
  studentId,
  initialEnrolled,
  isAuthenticated,
  isTeacher,
  isFull = false,
  className,
}: {
  classId: string;
  studentId: string | null;
  initialEnrolled: boolean;
  isAuthenticated: boolean;
  isTeacher: boolean;
  isFull?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [enrolled, setEnrolled] = useState(initialEnrolled);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isTeacher) {
    return (
      <Link
        href={`/classhub/class/${classId}`}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full bg-ink-900 px-4 py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-ink-800",
          className,
        )}
      >
        <Icon name="settings" size={14} /> Manage class
      </Link>
    );
  }

  if (!isAuthenticated || !studentId) {
    return (
      <Link
        href={`/login?redirect=/classes`}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-brand-700",
          className,
        )}
      >
        <Icon name="user-plus" size={14} /> Log in to join
      </Link>
    );
  }

  async function toggle() {
    if (pending) return;
    setError(null);
    setPending(true);
    const next = !enrolled;
    setEnrolled(next);
    try {
      if (next) {
        await apiFetch(`/api/classes/${classId}/enrollments`, {
          method: "POST",
          body: { studentId },
        });
      } else {
        await apiFetch(
          `/api/classes/${classId}/enrollments?studentId=${encodeURIComponent(studentId!)}`,
          { method: "DELETE" },
        );
      }
      router.refresh();
    } catch (err) {
      setEnrolled(!next);
      setError(err instanceof ClientApiError ? err.message : "Could not update enrollment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={cn("space-y-1", className)}>
      <Button
        type="button"
        onClick={toggle}
        disabled={pending || (!enrolled && isFull)}
        variant={enrolled ? "outline" : "primary"}
        size="sm"
        className="w-full"
      >
        {pending ? (
          <Icon name="loader" size={14} className="animate-spin" />
        ) : (
          <Icon name={enrolled ? "check" : "plus"} size={14} />
        )}
        {pending
          ? "Saving…"
          : enrolled
            ? "Joined · Leave class"
            : isFull
              ? "Class full"
              : "Join class"}
      </Button>
      {error ? <p className="text-[11px] font-semibold text-danger-600">{error}</p> : null}
    </div>
  );
}
