"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icons";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { Spinner } from "@/components/ui/interactive";
import { ClientApiError, apiFetch } from "@/lib/client";
import { cn } from "@/lib/format";

type LearnerRow = {
  id: string;
  status: string;
  enrolledAt: string;
  userId: string;
  userName: string;
  userEmail: string;
  avatarKey: string | null;
  courseId: string;
  courseTitle: string;
};

const STATUS_TONE: Record<string, "success" | "warn" | "neutral" | "brand"> = {
  active: "success",
  pending: "warn",
  completed: "brand",
  dropped: "neutral",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function LearnerPanel({ enrollments }: { enrollments: LearnerRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(enrollments);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "active">("all");

  async function act(row: LearnerRow, action: "approve" | "remove") {
    setBusyId(row.id);
    setError(null);
    try {
      await apiFetch(`/api/lms/courses/${row.courseId}/enroll`, {
        method: "PATCH",
        body: { action, enrollmentId: row.id },
      });
      setRows((current) =>
        current.map((item) =>
          item.id === row.id
            ? { ...item, status: action === "approve" ? "active" : "dropped" }
            : item,
        ),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not update this enrollment.");
    } finally {
      setBusyId(null);
    }
  }

  const visible = rows.filter((row) => {
    if (filter === "all") return row.status !== "dropped";
    if (filter === "pending") return row.status === "pending";
    return row.status === "active" || row.status === "completed";
  });

  const pendingCount = rows.filter((row) => row.status === "pending").length;

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-ink-100 bg-ink-50/60 px-4 py-3">
        <div className="flex gap-1.5">
          {(
            [
              { key: "all", label: "All" },
              { key: "pending", label: `Pending${pendingCount ? ` (${pendingCount})` : ""}` },
              { key: "active", label: "Active" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11.5px] font-bold transition-colors",
                filter === tab.key
                  ? "bg-ink-900 text-white"
                  : "text-ink-500 hover:bg-ink-100 hover:text-ink-800",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[11.5px] font-semibold text-ink-400">
          {visible.length} shown
        </span>
      </div>

      {error ? (
        <div className="border-b border-ink-100 bg-danger-100/60 px-4 py-2.5 text-[12.5px] font-semibold text-danger-600">
          {error}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon="users"
            title={filter === "pending" ? "No pending requests" : "No learners yet"}
            description={
              filter === "pending"
                ? "Enrollment requests that need your approval will appear here."
                : "Learners who enroll in your courses will show up here."
            }
          />
        </div>
      ) : (
        <ul className="divide-y divide-ink-50">
          {visible.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-ink-50/50"
            >
              <Avatar
                name={row.userName}
                src={row.avatarKey ? `/api/media/${row.avatarKey}` : null}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[13.5px] font-bold text-ink-900">
                    {row.userName}
                  </span>
                  <Badge tone={STATUS_TONE[row.status] ?? "neutral"}>{row.status}</Badge>
                </div>
                <p className="truncate text-[11.5px] text-ink-400">
                  {row.userEmail} · {row.courseTitle} · {timeAgo(row.enrolledAt)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {row.status === "pending" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => act(row, "approve")}
                      disabled={busyId === row.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-success-500 px-3.5 py-1.5 text-[11.5px] font-bold text-white transition-colors hover:bg-success-600 disabled:opacity-50"
                    >
                      {busyId === row.id ? (
                        <Spinner size={12} />
                      ) : (
                        <Icon name="check" size={12} strokeWidth={3} />
                      )}
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => act(row, "remove")}
                      disabled={busyId === row.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-danger-500/30 bg-white px-3.5 py-1.5 text-[11.5px] font-bold text-danger-600 transition-colors hover:bg-danger-50 disabled:opacity-50"
                    >
                      <Icon name="x" size={12} /> Decline
                    </button>
                  </>
                ) : row.status !== "dropped" ? (
                  <button
                    type="button"
                    onClick={() => act(row, "remove")}
                    disabled={busyId === row.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-[11.5px] font-bold text-ink-500 transition-colors hover:border-danger-300 hover:text-danger-600 disabled:opacity-50"
                  >
                    <Icon name="x" size={12} /> Remove
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
