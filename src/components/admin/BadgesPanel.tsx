"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { ConfirmDialog } from "@/components/ui/interactive";
import { Field, Input, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError } from "@/lib/client";
import { timeAgo } from "@/lib/format";

export type BadgeInfo = {
  key: string;
  name: string;
  description: string;
  kind: string;
  activeCount: number;
};

export type GrantRow = {
  id: string;
  badgeKey: string;
  badgeName: string;
  userName: string;
  userEmail: string;
  userAvatarKey: string | null;
  reason: string | null;
  grantedAt: string;
};

export function BadgesPanel({ badges, grants }: { badges: BadgeInfo[]; grants: GrantRow[] }) {
  const router = useRouter();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [badgeKey, setBadgeKey] = useState(badges[0]?.key ?? "highly-rated");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [revoking, setRevoking] = useState<GrantRow | null>(null);

  async function onGrant() {
    setError(null);
    if (!email.includes("@")) {
      setError("Enter the user's email address.");
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/api/admin/badges", {
        method: "POST",
        body: {
          userEmail: email.trim().toLowerCase(),
          badgeKey,
          action: "grant",
          reason: reason.trim() || undefined,
        },
      });
      toast.success("Badge granted.");
      setEmail("");
      setReason("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not grant the badge.");
    } finally {
      setBusy(false);
    }
  }

  async function onRevoke() {
    if (!revoking) return;
    setBusy(true);
    try {
      await apiFetch("/api/admin/badges", {
        method: "POST",
        body: { badgeKey: revoking.badgeKey, action: "revoke", userEmail: revoking.userEmail },
      });
      toast.success("Badge revoked.");
      setRevoking(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Could not revoke the badge.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {badges.map((b) => (
          <div key={b.key} className="card flex items-center gap-3 p-4">
            <span className="flex size-10 flex-none items-center justify-center rounded-2xl bg-accent-100 text-accent-700">
              <Icon name={b.kind === "verification" ? "shield" : "award"} size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-extrabold text-ink-900">{b.name}</p>
              <p className="line-clamp-1 text-[11.5px] text-ink-400">{b.description}</p>
            </div>
            <span className="flex-none text-[12px] font-bold text-ink-500 tabular-nums">
              {b.activeCount}
            </span>
          </div>
        ))}
      </div>

      <div className="card mt-6 p-5">
        <h3 className="text-[14px] font-extrabold text-ink-900">Grant a badge</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field label="User email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@example.com"
            />
          </Field>
          <Field label="Badge">
            <Select value={badgeKey} onChange={(e) => setBadgeKey(e.target.value)}>
              {badges.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reason (optional)">
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={300}
              placeholder="e.g. 50 five-star reviews"
            />
          </Field>
        </div>
        {error ? (
          <p className="mt-2 text-[12.5px] font-semibold text-danger-600">{error}</p>
        ) : null}
        <div className="mt-3">
          <Button type="button" size="sm" variant="accent" disabled={busy} onClick={onGrant}>
            <Icon name="award" size={14} />
            {busy ? "Granting…" : "Grant badge"}
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="mb-3 text-[14px] font-extrabold text-ink-900">Recent grants</h3>
        {grants.length > 0 ? (
          <div className="card divide-y divide-ink-100">
            {grants.map((g) => (
              <div key={g.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar
                  name={g.userName}
                  src={g.userAvatarKey ? `/api/media/${g.userAvatarKey}` : null}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-ink-800">
                    {g.userName}
                    <span className="ml-2 rounded-chip bg-accent-100 px-2 py-0.5 text-[10px] font-bold text-accent-700">
                      {g.badgeName}
                    </span>
                  </p>
                  <p className="truncate text-[11.5px] font-semibold text-ink-400">
                    {g.reason ? `${g.reason} · ` : ""}
                    {timeAgo(g.grantedAt)}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Revoke ${g.badgeName} from ${g.userName}`}
                  disabled={busy}
                  onClick={() => setRevoking(g)}
                  className="flex size-8 flex-none items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-danger-100 hover:text-danger-600"
                >
                  <Icon name="x" size={13} strokeWidth={2.6} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-ink-400">No active badge grants yet.</p>
        )}
      </div>

      <ConfirmDialog
        open={revoking !== null}
        title={`Revoke ${revoking?.badgeName ?? "badge"}?`}
        description={`${revoking?.userName ?? "This user"} will lose the badge on their profile and get a notification.`}
        confirmLabel="Revoke badge"
        pending={busy}
        onConfirm={onRevoke}
        onCancel={() => setRevoking(null)}
      />
    </>
  );
}
