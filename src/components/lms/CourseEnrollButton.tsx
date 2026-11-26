"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { ClientApiError, apiFetch } from "@/lib/client";

/**
 * Enroll / continue button on a course page. Handles the whole learner
 * lifecycle: guest -> sign up, enrolled -> open course, pending -> waiting.
 */
export function CourseEnrollButton({
  courseId,
  base,
  signedIn,
  visibility,
  isMember,
  enrolled,
  status,
}: {
  courseId: string;
  base: string;
  signedIn: boolean;
  visibility: string;
  isMember: boolean;
  enrolled: boolean;
  status: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState<string | null>(status);
  const [localEnrolled, setLocalEnrolled] = useState(enrolled);

  async function enroll() {
    if (!signedIn) {
      router.push("/register");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<{ status: string }>(
        `/api/lms/courses/${courseId}/enroll`,
        { method: "POST" },
      );
      setLocalStatus(result.status);
      setLocalEnrolled(true);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ClientApiError ? err.message : "Could not enroll right now. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (localEnrolled && localStatus === "active") {
    return (
      <Link
        href={`${base}/courses/${courseId}`}
        className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[13px] font-black text-ink-900 shadow-lg transition-transform hover:-translate-y-0.5"
      >
        <Icon name="play" size={15} /> Continue course
      </Link>
    );
  }

  if (localEnrolled && localStatus === "pending") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-[13px] font-bold text-white backdrop-blur-sm">
        <Icon name="clock" size={15} /> Pending approval
      </span>
    );
  }

  if (localEnrolled && localStatus === "completed") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-success-500 px-5 py-2.5 text-[13px] font-black text-white shadow-lg">
        <Icon name="check" size={15} strokeWidth={3} /> Course completed
      </span>
    );
  }

  const label = !signedIn
    ? visibility === "public"
      ? "Start free"
      : "Sign in to enroll"
    : isMember || visibility === "public"
      ? "Enroll now"
      : "Request to join";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        onClick={enroll}
        disabled={busy}
        size="lg"
        className="bg-white text-ink-900 shadow-lg hover:brightness-95"
      >
        {busy ? "Working…" : label}
        {!busy ? <Icon name="arrow-right" size={15} /> : null}
      </Button>
      {error ? (
        <span className="text-[12px] font-semibold text-danger-300">{error}</span>
      ) : null}
    </div>
  );
}
