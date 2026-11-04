"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { ConfirmDialog, Modal } from "@/components/ui/interactive";
import { Field, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError } from "@/lib/client";
import { cn, timeAgo } from "@/lib/format";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatarKey: string | null;
  createdAt: string;
  handle: string | null;
};

const ROLE_CHIP: Record<string, string> = {
  student: "bg-ink-100 text-ink-600",
  teacher: "bg-brand-100 text-brand-700",
  moderator: "bg-accent-100 text-accent-700",
  admin: "bg-ink-900 text-white",
};

export function UsersTable({ rows, viewerRole }: { rows: UserRow[]; viewerRole: string }) {
  const router = useRouter();
  const toast = useToast();
  const isAdmin = viewerRole === "admin";

  const [suspendTarget, setSuspendTarget] = useState<UserRow | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [reactivateTarget, setReactivateTarget] = useState<UserRow | null>(null);
  const [roleTarget, setRoleTarget] = useState<UserRow | null>(null);
  const [newRole, setNewRole] = useState("student");
  const [busy, setBusy] = useState(false);

  async function act(row: UserRow, action: string, extra?: { reason?: string; role?: string }) {
    setBusy(true);
    try {
      await apiFetch(`/api/admin/users/${row.id}`, {
        method: "POST",
        body: { action, reason: extra?.reason?.trim() || undefined, role: extra?.role },
      });
      const labels: Record<string, string> = {
        suspend: "User suspended.",
        reactivate: "User reactivated.",
        set_role: "Role updated.",
      };
      toast.success(labels[action] ?? "Done.");
      setSuspendTarget(null);
      setSuspendReason("");
      setReactivateTarget(null);
      setRoleTarget(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Could not complete the action.");
    } finally {
      setBusy(false);
    }
  }

  if (rows.length === 0) {
    return <p className="text-[13px] text-ink-400">No users match your search.</p>;
  }

  return (
    <>
      <div className="card divide-y divide-ink-100">
        {rows.map((row) => {
          const suspended = row.status === "suspended";
          return (
            <div key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Avatar
                name={row.name}
                src={row.avatarKey ? `/api/media/${row.avatarKey}` : null}
                size="sm"
                className={suspended ? "opacity-40" : undefined}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={cn("text-[13.5px] font-bold", suspended ? "text-ink-400 line-through" : "text-ink-900")}>
                    {row.name}
                  </p>
                  <span
                    className={cn(
                      "rounded-chip px-2 py-0.5 text-[10px] font-bold capitalize",
                      ROLE_CHIP[row.role] ?? "bg-ink-100 text-ink-500",
                    )}
                  >
                    {row.role}
                  </span>
                  {suspended ? (
                    <span className="rounded-chip bg-danger-100 px-2 py-0.5 text-[10px] font-bold text-danger-600">
                      Suspended
                    </span>
                  ) : null}
                </div>
                <p className="truncate text-[11.5px] font-semibold text-ink-400">
                  {row.email}
                  {row.handle ? ` · @${row.handle}` : ""} · joined {timeAgo(row.createdAt)}
                </p>
              </div>

              <div className="flex flex-none gap-1.5">
                {isAdmin && !suspended ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    disabled={busy}
                    onClick={() => {
                      setNewRole(row.role === "admin" ? "moderator" : "student");
                      setRoleTarget(row);
                    }}
                  >
                    <Icon name="sliders" size={12} />
                    Role
                  </Button>
                ) : null}
                {suspended ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    disabled={busy}
                    className="!border-success-500/40 !text-success-600 hover:!bg-success-100"
                    onClick={() => setReactivateTarget(row)}
                  >
                    <Icon name="refresh" size={12} />
                    Reactivate
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    disabled={busy}
                    className="!border-danger-300 !text-danger-600 hover:!bg-danger-100"
                    onClick={() => {
                      setSuspendReason("");
                      setSuspendTarget(row);
                    }}
                  >
                    <Icon name="lock" size={12} />
                    Suspend
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        open={suspendTarget !== null}
        onClose={() => setSuspendTarget(null)}
        title={`Suspend ${suspendTarget?.name ?? "user"}?`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setSuspendTarget(null)}
              className="rounded-full px-4 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-100"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || suspendReason.trim().length < 5}
              onClick={() =>
                suspendTarget ? act(suspendTarget, "suspend", { reason: suspendReason }) : undefined
              }
              className="inline-flex items-center gap-2 rounded-full bg-danger-500 px-5 py-2 text-sm font-semibold text-white hover:bg-danger-600 disabled:opacity-50"
            >
              {busy ? "Suspending…" : "Suspend account"}
            </button>
          </>
        }
      >
        <p className="mb-3 text-[12.5px] leading-relaxed text-ink-500">
          All their sessions are signed out immediately and they cannot sign back in until
          reactivated. They will see your reason.
        </p>
        <Field label="Reason (shown to the user)">
          <Textarea
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder="e.g. Repeated harassment in comments after two warnings."
          />
        </Field>
      </Modal>

      <ConfirmDialog
        open={reactivateTarget !== null}
        title={`Reactivate ${reactivateTarget?.name ?? "user"}?`}
        description="They will be able to sign in again. Their old content stays as it is."
        confirmLabel="Reactivate"
        tone="primary"
        pending={busy}
        onConfirm={() => reactivateTarget && act(reactivateTarget, "reactivate")}
        onCancel={() => setReactivateTarget(null)}
      />

      <Modal
        open={roleTarget !== null}
        onClose={() => setRoleTarget(null)}
        title={`Change role for ${roleTarget?.name ?? "user"}`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setRoleTarget(null)}
              className="rounded-full px-4 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-100"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || !roleTarget || newRole === roleTarget.role}
              onClick={() =>
                roleTarget ? act(roleTarget, "set_role", { role: newRole }) : undefined
              }
              className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {busy ? "Updating…" : "Update role"}
            </button>
          </>
        }
      >
        <Field label="New role">
          <Select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
            <option value="student">Student</option>
            <option value="teacher" disabled={!roleTarget?.handle}>
              Teacher{!roleTarget?.handle ? " (no teacher profile)" : ""}
            </option>
            <option value="moderator">Moderator</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>
        <p className="mt-2 text-[11.5px] leading-relaxed text-ink-400">
          Moderators can review verification, reports and suspend users. Admins can also change
          roles and moderate other admins. Role changes take effect immediately.
        </p>
      </Modal>
    </>
  );
}
