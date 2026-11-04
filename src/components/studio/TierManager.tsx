"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { ConfirmDialog, Switch } from "@/components/ui/interactive";
import { Field, Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError } from "@/lib/client";
import { cn } from "@/lib/format";

export type TierRow = {
  id: string;
  name: string;
  description: string | null;
  priceLkr: number;
  perks: string[];
  active: boolean;
  memberCount: number;
};

export function TierManager({ tiers }: { tiers: TierRow[] }) {
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [perksText, setPerksText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<TierRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError("Give the tier a name.");
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/api/studio/tiers", {
        method: "POST",
        body: {
          name: name.trim(),
          description: description.trim() || undefined,
          priceLkr: Number(price) || 0,
          perks: perksText
            .split("\n")
            .map((p) => p.trim())
            .filter(Boolean)
            .slice(0, 10),
        },
      });
      toast.success("Membership tier created.");
      setName("");
      setPrice("");
      setDescription("");
      setPerksText("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not create the tier.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(tier: TierRow) {
    try {
      await apiFetch(`/api/studio/tiers/${tier.id}`, {
        method: "PATCH",
        body: { active: !tier.active },
      });
      toast.success(tier.active ? "Tier deactivated." : "Tier activated.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Could not update the tier.");
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await apiFetch(`/api/studio/tiers/${deleting.id}`, { method: "DELETE" });
      toast.success("Tier deleted.");
      setDeleting(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Could not delete the tier.");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <>
      <form onSubmit={onCreate} className="card p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 flex-none items-center justify-center rounded-2xl bg-accent-100 text-accent-700">
            <Icon name="crown" size={17} />
          </span>
          <div>
            <h3 className="text-[14px] font-extrabold text-ink-900">Membership tiers</h3>
            <p className="text-[12px] text-ink-400">
              Supporters-only posts stay locked until a student joins a tier. No payment is taken at
              launch — this just gates content.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Tier name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Revision Circle"
              maxLength={60}
            />
          </Field>
          <Field label="Price (LKR / month)">
            <Input
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0 = free"
            />
          </Field>
        </div>
        <div className="mt-3">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={300}
            placeholder="What does this tier give students? (optional)"
          />
        </div>
        <div className="mt-3">
          <Textarea
            value={perksText}
            onChange={(e) => setPerksText(e.target.value)}
            rows={3}
            maxLength={600}
            placeholder={"One perk per line, e.g.\nWeekly live Q&A\nMarked past papers"}
          />
        </div>

        {error ? <p className="mt-2 text-[12.5px] font-semibold text-danger-600">{error}</p> : null}

        <div className="mt-3">
          <Button type="submit" size="sm" variant="accent" disabled={busy}>
            <Icon name="plus" size={14} strokeWidth={2.6} />
            {busy ? "Creating…" : "Create tier"}
          </Button>
        </div>
      </form>

      {tiers.length > 0 ? (
        <div className="mt-4 space-y-2.5">
          {tiers.map((t) => (
            <div key={t.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13.5px] font-extrabold text-ink-900">{t.name}</span>
                    <span className="rounded-chip bg-ink-100 px-2 py-0.5 text-[10.5px] font-bold text-ink-500">
                      {t.priceLkr === 0 ? "Free" : `Rs ${t.priceLkr.toLocaleString()}/mo`}
                    </span>
                    <span className="text-[11.5px] font-semibold text-ink-400">
                      {t.memberCount} member{t.memberCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  {t.description ? (
                    <p className="mt-1 text-[12.5px] text-ink-500">{t.description}</p>
                  ) : null}
                  {t.perks.length > 0 ? (
                    <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                      {t.perks.map((p, i) => (
                        <li
                          key={i}
                          className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-ink-500"
                        >
                          <Icon name="check" size={11} strokeWidth={3} className="text-success-600" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <div className="flex flex-none flex-col items-end gap-2">
                  <Switch
                    checked={t.active}
                    onChange={() => toggleActive(t)}
                    label={t.active ? "Active" : "Inactive"}
                  />
                  {t.memberCount === 0 ? (
                    <button
                      type="button"
                      aria-label="Delete tier"
                      onClick={() => setDeleting(t)}
                      className={cn(
                        "flex size-7 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-danger-100 hover:text-danger-600",
                      )}
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-[13px] text-ink-400">
          No tiers yet. Tiers let you publish supporters-only posts for your most committed students.
        </p>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this tier?"
        description="The tier disappears from your profile. This cannot be undone."
        confirmLabel="Delete tier"
        pending={deleteBusy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
