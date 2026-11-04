"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { ConfirmDialog, CopyButton } from "@/components/ui/interactive";
import { Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError } from "@/lib/client";
import { cn, isExpired, timeAgo } from "@/lib/format";

export type CodeRow = {
  id: string;
  code: string;
  label: string | null;
  maxUses: number;
  uses: number;
  expiresAt: string | null;
  claimed: number;
};

export function CodeManager({ codes }: { codes: CodeRow[] }) {
  const router = useRouter();
  const toast = useToast();

  const [label, setLabel] = useState("");
  const [maxUses, setMaxUses] = useState("30");
  const [expiresInDays, setExpiresInDays] = useState("90");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<CodeRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await apiFetch<{ code: { code: string } }>("/api/studio/codes", {
        method: "POST",
        body: {
          label: label.trim() || undefined,
          maxUses: Number(maxUses) || 1,
          expiresInDays: expiresInDays ? Number(expiresInDays) : undefined,
        },
      });
      toast.success(`Code ${res.code.code} created.`);
      setLabel("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not create the code.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await apiFetch(`/api/studio/codes/${deleting.id}`, { method: "DELETE" });
      toast.success("Code deleted. Students keep their verified status.");
      setDeleting(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Could not delete the code.");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <>
      <form onSubmit={onCreate} className="card p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 flex-none items-center justify-center rounded-2xl bg-success-100 text-success-600">
            <Icon name="key" size={17} />
          </span>
          <div>
            <h3 className="text-[14px] font-extrabold text-ink-900">Create an enrollment code</h3>
            <p className="text-[12px] text-ink-400">
              Students claim it once to verify their class and unlock reviews.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Field label="Label">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. 2026 Physics batch"
              maxLength={80}
            />
          </Field>
          <Field label="Max uses">
            <Input
              type="number"
              min={1}
              max={500}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
            />
          </Field>
          <Field label="Expires in (days)">
            <Input
              type="number"
              min={1}
              max={365}
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              placeholder="Never"
            />
          </Field>
        </div>

        {error ? (
          <p className="mt-2 text-[12.5px] font-semibold text-danger-600">{error}</p>
        ) : null}

        <div className="mt-3">
          <Button type="submit" size="sm" disabled={busy}>
            <Icon name="plus" size={14} strokeWidth={2.6} />
            {busy ? "Creating…" : "Create code"}
          </Button>
        </div>
      </form>

      {codes.length > 0 ? (
        <div className="mt-4 space-y-2.5">
          {codes.map((c) => {
            const exhausted = c.uses >= c.maxUses;
            const expired = isExpired(c.expiresAt);
            return (
              <div key={c.id} className="card flex items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded-lg bg-ink-100/80 px-2 py-0.5 font-mono text-[12.5px] font-bold tracking-wide text-ink-800">
                      {c.code}
                    </code>
                    <CopyButton text={c.code} label="Copy" />
                    {exhausted ? (
                      <span className="rounded-chip bg-warn-100 px-2 py-0.5 text-[10.5px] font-bold text-warn-600">
                        Used up
                      </span>
                    ) : null}
                    {expired ? (
                      <span className="rounded-chip bg-danger-100 px-2 py-0.5 text-[10.5px] font-bold text-danger-600">
                        Expired
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px] font-semibold text-ink-400">
                    {c.label ? <span>{c.label}</span> : null}
                    <span>
                      {c.uses}/{c.maxUses} claimed · {c.claimed} verified
                    </span>
                    <span>
                      {c.expiresAt ? `expires ${timeAgo(c.expiresAt)}` : "no expiry"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Delete code"
                  onClick={() => setDeleting(c)}
                  disabled={c.claimed > 0}
                  title={c.claimed > 0 ? "Codes with verified students are kept for the record" : "Delete code"}
                  className={cn(
                    "flex size-8 flex-none items-center justify-center rounded-full transition-colors",
                    c.claimed > 0
                      ? "cursor-not-allowed text-ink-200"
                      : "text-ink-400 hover:bg-danger-100 hover:text-danger-600",
                  )}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-[13px] text-ink-400">
          No codes yet. Create one and share it with your class (WhatsApp, printed handout, etc.).
        </p>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this enrollment code?"
        description="Students will no longer be able to claim it, but already-verified students keep their status."
        confirmLabel="Delete code"
        pending={deleteBusy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
