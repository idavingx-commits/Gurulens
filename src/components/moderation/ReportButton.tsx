"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/interactive";
import { Field, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError } from "@/lib/client";
import { cn } from "@/lib/format";

const REASONS: Array<{ value: string; label: string }> = [
  { value: "spam", label: "Spam or advertising" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "impersonation", label: "Impersonation" },
  { value: "copyright", label: "Copyright violation" },
  { value: "misinformation", label: "Misleading information" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "other", label: "Something else" },
];

export function ReportButton({
  targetType,
  targetId,
  compact = false,
  className,
}: {
  targetType: "post" | "comment" | "review" | "user" | "quiz" | "media";
  targetId: string;
  compact?: boolean;
  className?: string;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await apiFetch("/api/reports", {
        method: "POST",
        body: { targetType, targetId, reason, details: details.trim() || undefined },
      });
      toast.success("Report sent. Thank you for keeping GuruLens safe.");
      setOpen(false);
      setDetails("");
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not send the report.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        title="Report"
        aria-label="Report"
        className={cn(
          compact
            ? "flex-none rounded-full p-1.5 text-ink-300 transition-colors hover:bg-danger-100/60 hover:text-danger-600"
            : "inline-flex items-center gap-1.5 rounded-chip px-2.5 py-1.5 text-[12px] font-bold text-ink-400 transition-colors hover:bg-ink-100/70 hover:text-ink-700",
          className,
        )}
      >
        <Icon name="flag" size={compact ? 14 : 15} />
        {compact ? null : "Report"}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Report to moderators"
        footer={
          <>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full px-4 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-100"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={submit}
              className="inline-flex items-center gap-2 rounded-full bg-danger-500 px-5 py-2 text-sm font-semibold text-white hover:bg-danger-600 disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send report"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="What's wrong?">
            <Select value={reason} onChange={(e) => setReason(e.target.value)}>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tell us more (optional)">
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Anything that helps our moderators understand the problem."
            />
          </Field>
          {error ? (
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-danger-600">
              <Icon name="alert" size={13} />
              {error}
            </p>
          ) : null}
          <p className="text-[11.5px] leading-relaxed text-ink-400">
            Reports are confidential — the author will not know who reported them. Abusing reports
            can lead to your account being restricted.
          </p>
        </div>
      </Modal>
    </>
  );
}
