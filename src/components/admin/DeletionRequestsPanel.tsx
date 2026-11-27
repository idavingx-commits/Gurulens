"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Field, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/primitives";
import { Spinner } from "@/components/ui/interactive";
import { apiFetch, ClientApiError } from "@/lib/client";
import { timeAgo } from "@/lib/format";

type Row = {
  id: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  status: string;
  reason: string | null;
  reviewNote: string | null;
  createdAt: string;
  decidedAt: string | null;
  requestedBy: { id: string; name: string; email: string };
  reviewedBy: { id: string; name: string } | null;
};

export function DeletionRequestsPanel({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function decide(id: string, action: "approve" | "reject") {
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/api/admin/deletion-requests/${id}`, {
        method: "POST",
        body: { action, note: note.trim() || undefined },
      });
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: action === "approve" ? "approved" : "rejected",
                reviewNote: note.trim() || r.reviewNote,
                decidedAt: new Date().toISOString(),
              }
            : r,
        ),
      );
      setRejectingId(null);
      setNote("");
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not review this request.");
    } finally {
      setBusyId(null);
    }
  }

  const pending = rows.filter((r) => r.status === "pending");
  const decided = rows.filter((r) => r.status !== "pending");

  if (rows.length === 0) {
    return (
      <div className="card p-8 text-center text-[13px] text-ink-500">
        No deletion requests yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-xl bg-danger-100 px-3 py-2 text-[12.5px] font-semibold text-danger-600">
          {error}
        </p>
      ) : null}

      {pending.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-[13px] font-extrabold tracking-wide text-ink-700 uppercase">
            Pending ({pending.length})
          </h3>
          {pending.map((r) => (
            <div key={r.id} className="card overflow-hidden">
              <div className="flex flex-wrap items-start gap-3 p-4">
                <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-danger-100 text-danger-600">
                  <Icon name={r.targetType === "channel" ? "radio" : "school"} size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14px] font-extrabold text-ink-900">{r.targetLabel}</p>
                    <Badge tone="danger" icon="clock">
                      Pending
                    </Badge>
                  </div>
                  <p className="text-[11.5px] text-ink-500">
                    {r.targetType === "channel" ? "Channel" : "Campus"} · requested by{" "}
                    <span className="font-semibold text-ink-700">{r.requestedBy.name}</span>{" "}
                    ({r.requestedBy.email})
                  </p>
                  {r.reason ? (
                    <p className="mt-1 text-[12px] text-ink-600">Reason: {r.reason}</p>
                  ) : null}
                  <p className="mt-1 text-[11px] text-ink-400">{timeAgo(new Date(r.createdAt))}</p>
                </div>
              </div>

              {rejectingId === r.id ? (
                <div className="space-y-3 border-t border-ink-100 bg-ink-50/60 p-4">
                  <Field
                    label="Reason for rejection (required)"
                    htmlFor={`reject-note-${r.id}`}
                  >
                    <Textarea
                      id={`reject-note-${r.id}`}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      maxLength={500}
                      className="min-h-20"
                      placeholder="Explain why this deletion was not approved…"
                    />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => void decide(r.id, "reject")}
                      disabled={busyId === r.id || note.trim().length === 0}
                    >
                      {busyId === r.id ? <Spinner size={14} /> : <Icon name="x" size={14} />} Confirm reject
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setRejectingId(null);
                        setNote("");
                      }}
                      disabled={busyId === r.id}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 border-t border-ink-100 p-4">
                  <Button
                    onClick={() => void decide(r.id, "approve")}
                    disabled={busyId === r.id}
                  >
                    {busyId === r.id ? <Spinner size={14} /> : <Icon name="check" size={14} />} Approve & delete
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setRejectingId(r.id);
                      setNote("");
                    }}
                    disabled={busyId === r.id}
                  >
                    <Icon name="x" size={14} /> Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </section>
      ) : null}

      {decided.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-[13px] font-extrabold tracking-wide text-ink-700 uppercase">
            Decided ({decided.length})
          </h3>
          {decided.map((r) => (
            <div
              key={r.id}
              className="card flex flex-wrap items-center gap-3 p-4"
            >
              <span
                className={
                  r.status === "approved"
                    ? "flex size-9 flex-none items-center justify-center rounded-xl bg-success-100 text-success-600"
                    : "flex size-9 flex-none items-center justify-center rounded-xl bg-danger-100 text-danger-600"
                }
              >
                <Icon name={r.status === "approved" ? "check" : "x"} size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-bold text-ink-900">{r.targetLabel}</p>
                  <Badge tone={r.status === "approved" ? "success" : "danger"}>
                    {r.status === "approved" ? "Approved" : "Rejected"}
                  </Badge>
                </div>
                <p className="text-[11.5px] text-ink-500">
                  {r.targetType === "channel" ? "Channel" : "Campus"} ·{" "}
                  {r.status === "approved" ? "Approved" : "Rejected"} by{" "}
                  {r.reviewedBy?.name ?? "—"} ·{" "}
                  {r.decidedAt ? timeAgo(new Date(r.decidedAt)) : ""}
                </p>
                {r.reviewNote ? (
                  <p className="mt-1 text-[12px] text-ink-600">{r.reviewNote}</p>
                ) : null}
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
