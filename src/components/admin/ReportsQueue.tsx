"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { ConfirmDialog, Modal } from "@/components/ui/interactive";
import { Field, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError } from "@/lib/client";
import { cn, timeAgo } from "@/lib/format";

export type ReportRow = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string | null;
  createdAt: string;
  reporterName: string;
  targetSnippet: string | null;
  targetMeta: string | null;
};

const REMOVABLE = ["post", "comment", "review", "quiz", "media"];

export function ReportsQueue({ rows }: { rows: ReportRow[] }) {
  const router = useRouter();
  const toast = useToast();

  const [noteModal, setNoteModal] = useState<{
    row: ReportRow;
    action: "resolve" | "dismiss";
  } | null>(null);
  const [note, setNote] = useState("");
  const [removing, setRemoving] = useState<ReportRow | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleReport(row: ReportRow, action: "resolve" | "dismiss", noteText: string) {
    setBusy(true);
    try {
      await apiFetch(`/api/admin/reports/${row.id}`, {
        method: "POST",
        body: { action, note: noteText.trim() || undefined },
      });
      toast.success(action === "resolve" ? "Report resolved." : "Report dismissed.");
      setNoteModal(null);
      setNote("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Could not handle the report.");
    } finally {
      setBusy(false);
    }
  }

  async function removeContent(row: ReportRow) {
    setBusy(true);
    try {
      await apiFetch("/api/admin/moderation", {
        method: "POST",
        body: {
          targetType: row.targetType,
          targetId: row.targetId,
          action: "remove",
          reason: `Removed following report: ${row.reason}`,
        },
      });
      await apiFetch(`/api/admin/reports/${row.id}`, {
        method: "POST",
        body: { action: "resolve", note: "Content removed by moderator." },
      });
      toast.success("Content removed and report resolved.");
      setRemoving(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Could not remove the content.");
    } finally {
      setBusy(false);
    }
  }

  async function warn(row: ReportRow) {
    setBusy(true);
    try {
      await apiFetch("/api/admin/moderation", {
        method: "POST",
        body: {
          targetType: row.targetType,
          targetId: row.targetId,
          action: "warn",
          reason: `Following report: ${row.reason}`,
        },
      });
      toast.success("Warning sent to the author.");
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Could not send the warning.");
    } finally {
      setBusy(false);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="text-[13px] text-ink-400">
        No open reports. The community is behaving — nice work.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.id} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-2xl bg-danger-100 text-danger-600">
                  <Icon name="flag" size={15} />
                </span>
                <div>
                  <p className="text-[13.5px] font-extrabold text-ink-900 capitalize">
                    {row.reason.replace("_", " ")} · {row.targetType}
                  </p>
                  <p className="text-[11.5px] font-semibold text-ink-400">
                    reported by {row.reporterName} {timeAgo(row.createdAt)}
                  </p>
                </div>
              </div>
              <span className="rounded-chip bg-ink-100 px-2.5 py-0.5 font-mono text-[10.5px] font-bold text-ink-500">
                {row.targetType}:{row.targetId.slice(0, 10)}…
              </span>
            </div>

            {row.details ? (
              <p className="mt-3 rounded-2xl bg-ink-50/70 p-3.5 text-[12.5px] leading-relaxed text-ink-600">
                <span className="font-bold text-ink-700">Reporter says: </span>
                {row.details}
              </p>
            ) : null}

            {row.targetSnippet ? (
              <div className="mt-2.5 rounded-2xl border border-ink-100 bg-white/60 p-3.5">
                {row.targetMeta ? (
                  <p className="mb-1 text-[11px] font-bold tracking-wide text-ink-400 uppercase">
                    {row.targetMeta}
                  </p>
                ) : null}
                <p className="line-clamp-3 text-[12.5px] leading-relaxed text-ink-600">
                  {row.targetSnippet}
                </p>
              </div>
            ) : (
              <p className="mt-2.5 text-[12px] font-semibold text-ink-400">
                The reported content could not be loaded (it may already be removed).
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2 border-t border-ink-100 pt-3.5">
              {REMOVABLE.includes(row.targetType) ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  className="!border-danger-300 !text-danger-600 hover:!bg-danger-100"
                  onClick={() => setRemoving(row)}
                >
                  <Icon name="trash" size={13} />
                  Remove content
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => warn(row)}
              >
                <Icon name="alert" size={13} />
                Warn author
              </Button>
              <div className="ml-auto flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    setNote("");
                    setNoteModal({ row, action: "dismiss" });
                  }}
                >
                  Dismiss
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    setNote("");
                    setNoteModal({ row, action: "resolve" });
                  }}
                >
                  <Icon name="check" size={13} strokeWidth={2.6} />
                  Resolve
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={noteModal !== null}
        onClose={() => setNoteModal(null)}
        title={noteModal?.action === "resolve" ? "Resolve this report" : "Dismiss this report"}
        footer={
          <>
            <button
              type="button"
              onClick={() => setNoteModal(null)}
              className="rounded-full px-4 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-100"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                noteModal ? handleReport(noteModal.row, noteModal.action, note) : undefined
              }
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white disabled:opacity-50",
                noteModal?.action === "resolve"
                  ? "bg-brand-600 hover:bg-brand-700"
                  : "bg-ink-700 hover:bg-ink-800",
              )}
            >
              {busy ? "Saving…" : noteModal?.action === "resolve" ? "Resolve" : "Dismiss"}
            </button>
          </>
        }
      >
        <Field label="Note to the reporter (optional)">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={
              noteModal?.action === "resolve"
                ? "e.g. Thanks — the post has been removed."
                : "e.g. Thanks for flagging; the content follows our guidelines."
            }
          />
        </Field>
      </Modal>

      <ConfirmDialog
        open={removing !== null}
        title="Remove the reported content?"
        description="The content will be hidden from everyone and its author notified. This also resolves the report."
        confirmLabel="Remove & resolve"
        pending={busy}
        onConfirm={() => removing && removeContent(removing)}
        onCancel={() => setRemoving(null)}
      />
    </>
  );
}
