"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { StarRating, Spinner } from "@/components/ui/interactive";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError } from "@/lib/client";

export function ReviewForm({
  teacherId,
  teacherName,
  initial,
}: {
  teacherId: string;
  teacherName: string;
  initial?: {
    reviewId: string;
    stars: number;
    clarity: number | null;
    support: number | null;
    organization: number | null;
    feedback: string;
  } | null;
}) {
  const router = useRouter();
  const toast = useToast();

  const [stars, setStars] = useState(initial?.stars ?? 0);
  const [clarity, setClarity] = useState(initial?.clarity ?? 0);
  const [support, setSupport] = useState(initial?.support ?? 0);
  const [organization, setOrganization] = useState(initial?.organization ?? 0);
  const [feedback, setFeedback] = useState(initial?.feedback ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (stars < 1) {
      setError("Pick a star rating first.");
      return;
    }
    if (feedback.trim().length < 10) {
      setError("Please write at least 10 characters.");
      return;
    }

    setBusy(true);
    try {
      if (initial) {
        await apiFetch(`/api/reviews/${initial.reviewId}`, {
          method: "PATCH",
          body: {
            stars,
            clarity: clarity || undefined,
            support: support || undefined,
            organization: organization || undefined,
            feedback: feedback.trim(),
          },
        });
        toast.success("Your review was updated.");
      } else {
        await apiFetch("/api/reviews", {
          method: "POST",
          body: {
            teacherId,
            stars,
            clarity: clarity || undefined,
            support: support || undefined,
            organization: organization || undefined,
            feedback: feedback.trim(),
          },
        });
        toast.success("Thanks! Your review is live.");
      }
      router.refresh();
    } catch (err) {
      if (err instanceof ClientApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-5 sm:p-6">
      <h3 className="text-[15px] font-extrabold text-ink-900">
        {initial ? "Edit your review" : `Rate your experience with ${teacherName}`}
      </h3>
      <p className="mt-0.5 text-[12.5px] text-ink-400">
        Your review is public and linked to your verified student status.
      </p>

      <div className="mt-4 flex items-center gap-3">
        <StarRating value={stars} onChange={setStars} size={26} />
        <span className="text-[13px] font-bold text-ink-600 tabular-nums">
          {stars > 0 ? `${stars}/5` : "Select rating"}
        </span>
      </div>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
        <SubRating label="Clarity" value={clarity} onChange={setClarity} />
        <SubRating label="Support" value={support} onChange={setSupport} />
        <SubRating label="Organization" value={organization} onChange={setOrganization} />
      </div>

      <div className="mt-4">
        <Textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="How were the classes? What worked well for you?"
        />
        <div className="mt-1 text-right text-[11px] font-medium text-ink-300 tabular-nums">
          {feedback.length}/2000
        </div>
      </div>

      {error ? (
        <p className="mt-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-danger-600">
          <Icon name="alert" size={13} />
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[11.5px] text-ink-400">
          By submitting you agree to our community guidelines.
        </p>
        <Button type="submit" disabled={busy}>
          {busy ? <Spinner size={16} /> : <Icon name="send" size={15} />}
          {initial ? "Save changes" : "Publish review"}
        </Button>
      </div>
    </form>
  );
}

function SubRating({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-ink-100 bg-white/70 px-3 py-2">
      <span className="text-[12px] font-semibold text-ink-500">{label}</span>
      <div className="flex items-center gap-1.5">
        <StarRating value={value} onChange={onChange} size={15} />
        {value > 0 ? (
          <button
            type="button"
            onClick={() => onChange(0)}
            aria-label={`Clear ${label} rating`}
            className="text-ink-300 transition-colors hover:text-ink-600"
          >
            <Icon name="x" size={12} strokeWidth={2.5} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
