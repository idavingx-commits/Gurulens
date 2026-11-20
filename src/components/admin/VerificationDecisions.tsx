"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { ConfirmDialog, Modal } from "@/components/ui/interactive";
import { Field, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError } from "@/lib/client";
import { cn, timeAgo } from "@/lib/format";

export type DecisionRow = {
  id: string;
  status: string;
  createdAt: string;
  title: string;
  subtitle: string;
  href: string | null;
  avatarName: string;
  avatarSrc: string | null;
  meta: Array<{ label: string; value: string }>;
  evidenceNote: string | null;
  evidenceKeys: string[];
};

const STATUS_CHIP: Record<string, string> = {
  pending: "bg-warn-100 text-warn-600",
  in_review: "bg-brand-100 text-brand-700",
  approved: "bg-success-100 text-success-600",
  rejected: "bg-danger-100 text-danger-600",
};

export function VerificationDecisions({
  rows,
  endpoint,
  entityLabel,
}: {
  rows: DecisionRow[];
  /** Base admin API path; row id is appended. e.g. "/api/admin/organizations" */
  endpoint: string;
  /** Human label used in dialogs, e.g. "organization" */
  entityLabel: string;
}) {
  const router = useRouter();
  const toast = useToast();

  const [reasonModal, setReasonModal] = useState<{
    row: DecisionRow;
    action: "request_info" | "reject";
  } | null>(null);
  const [reason, setReason] = useState("");
  const [confirmApprove, setConfirmApprove] = useState<DecisionRow | null>(null);
  const [busy, setBusy] = useState(false);

  async function act(row: DecisionRow, action: string, reasonText?: string) {
    setBusy(true);
    try {
      await apiFetch(`${endpoint}/${row.id}`, {
        method: "POST",
        body: { action, reason: reasonText?.trim() || undefined },
      });
      const labels: Record<string, string> = {
        in_review: "Marked as in review.",
        request_info: "More information requested.",
        approve: `${entityLabel[0]!.toUpperCase()}${entityLabel.slice(1)} verified!`,
        reject: "Request rejected.",
      };
      toast.success(labels[action] ?? "Done.");
      setReasonModal(null);
      setReason("");
      setConfirmApprove(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Could not complete the action.");
    } finally {
      setBusy(false);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="text-[13px] text-ink-400">
        Nothing waiting for review. New {entityLabel} verification requests will appear here.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar name={row.avatarName} src={row.avatarSrc} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-extrabold text-ink-900">{row.title}</p>
                  <p className="truncate text-[12px] font-semibold text-ink-400">{row.subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-chip px-2.5 py-0.5 text-[11px] font-bold capitalize",
                    STATUS_CHIP[row.status] ?? "bg-ink-100 text-ink-500",
                  )}
                >
                  {row.status.replace("_", " ")}
                </span>
                <span className="text-[11px] font-semibold text-ink-400">
                  {timeAgo(row.createdAt)}
                </span>
              </div>
            </div>

            {row.meta.length > 0 ? (
              <div className="mt-3 grid gap-2 rounded-2xl bg-ink-50/70 p-3.5 text-[12.5px] sm:grid-cols-2">
                {row.meta.map((item) => (
                  <p key={item.label} className="text-ink-600">
                    <span className="font-bold text-ink-700">{item.label}: </span>
                    {item.value}
                  </p>
                ))}
              </div>
            ) : null}

            {row.evidenceNote ? (
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink-600">{row.evidenceNote}</p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3.5">
              {row.href ? (
                <a
                  href={row.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-3.5 py-1.5 text-[12.5px] font-bold text-ink-600 transition-colors hover:border-brand-300 hover:text-brand-700"
                >
                  <Icon name="external" size={13} />
                  Open page
                </a>
              ) : null}
              {row.evidenceKeys.length > 0 ? (
                <a
                  href={`/api/media/${row.evidenceKeys[0]}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-3.5 py-1.5 text-[12.5px] font-bold text-ink-600 transition-colors hover:border-brand-300 hover:text-brand-700"
                >
                  <Icon name="image" size={13} />
                  View evidence ({row.evidenceKeys.length})
                </a>
              ) : (
                <span className="text-[12px] font-semibold text-ink-400">No evidence file attached</span>
              )}

              <div className="ml-auto flex flex-wrap gap-2">
                {row.status !== "in_review" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => act(row, "in_review")}
                  >
                    <Icon name="eye" size={13} />
                    Start review
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    setReason("");
                    setReasonModal({ row, action: "request_info" });
                  }}
                >
                  <Icon name="message" size={13} />
                  More info
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  className="!border-danger-300 !text-danger-600 hover:!bg-danger-100"
                  onClick={() => {
                    setReason("");
                    setReasonModal({ row, action: "reject" });
                  }}
                >
                  <Icon name="x" size={13} strokeWidth={2.6} />
                  Reject
                </Button>
                <Button
                  type="button"
                  variant="success"
                  size="sm"
                  disabled={busy}
                  onClick={() => setConfirmApprove(row)}
                >
                  <Icon name="check" size={13} strokeWidth={2.8} />
                  Approve
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={reasonModal !== null}
        onClose={() => setReasonModal(null)}
        title={reasonModal?.action === "request_info" ? "Request more information" : "Reject this request"}
        footer={
          <>
            <button
              type="button"
              onClick={() => setReasonModal(null)}
              className="rounded-full px-4 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-100"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || reason.trim().length < 5}
              onClick={() =>
                reasonModal ? act(reasonModal.row, reasonModal.action, reason) : undefined
              }
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white disabled:opacity-50",
                reasonModal?.action === "reject"
                  ? "bg-danger-500 hover:bg-danger-600"
                  : "bg-brand-600 hover:bg-brand-700",
              )}
            >
              {busy ? "Sending…" : reasonModal?.action === "request_info" ? "Send request" : "Reject request"}
            </button>
          </>
        }
      >
        <Field
          label={
            reasonModal?.action === "request_info"
              ? `What do you need from this ${entityLabel}?`
              : `Why is the request being rejected?`
          }
        >
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            maxLength={300}
            placeholder={
              reasonModal?.action === "request_info"
                ? "e.g. Please upload a clearer copy of the registration certificate."
                : "e.g. The submitted documents do not match the organization details."
            }
          />
        </Field>
        <p className="mt-1.5 text-[11.5px] text-ink-400">
          The owners see this message in their notification and verification history.
        </p>
      </Modal>

      <ConfirmDialog
        open={confirmApprove !== null}
        title={`Approve this ${entityLabel}?`}
        description={`The ${entityLabel} gets the verified badge across GuruLens and its owners will be notified. This is visible publicly.`}
        confirmLabel="Approve & verify"
        tone="primary"
        pending={busy}
        onConfirm={() => confirmApprove && act(confirmApprove, "approve")}
        onCancel={() => setConfirmApprove(null)}
      />
    </>
  );
}
