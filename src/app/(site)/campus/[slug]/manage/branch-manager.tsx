"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Field, Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/interactive";
import { InfoNote } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError } from "@/lib/client";

export type BranchRow = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  isMain: boolean;
  memberCount: number;
  classCount: number;
};

type Draft = { name: string; address: string; phone: string; isMain: boolean };

const EMPTY_DRAFT: Draft = { name: "", address: "", phone: "", isMain: false };

export function BranchManager({
  organizationId,
  slug,
  branches,
  canEdit,
}: {
  organizationId: string;
  slug: string;
  branches: BranchRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const toast = useToast();

  const [adding, setAdding] = useState(false);
  const [newBranch, setNewBranch] = useState<Draft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<BranchRow | null>(null);

  const base = `/api/organizations/${organizationId}/branches`;

  async function addBranch(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    if (newBranch.name.trim().length < 2) {
      setError("Please enter a branch name.");
      return;
    }

    setPending("add");
    try {
      await apiFetch(base, {
        method: "POST",
        body: {
          name: newBranch.name.trim(),
          address: newBranch.address.trim() || undefined,
          phone: newBranch.phone.trim() || undefined,
          isMain: newBranch.isMain,
        },
      });
      setNewBranch(EMPTY_DRAFT);
      setAdding(false);
      toast.success("Branch added.");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not add the branch.");
    } finally {
      setPending(null);
    }
  }

  function startEdit(branch: BranchRow) {
    setEditingId(branch.id);
    setEditDraft({
      name: branch.name,
      address: branch.address ?? "",
      phone: branch.phone ?? "",
      isMain: branch.isMain,
    });
    setError(null);
  }

  async function saveBranch(id: string) {
    if (pending) return;
    setError(null);
    if (editDraft.name.trim().length < 2) {
      setError("Please enter a branch name.");
      return;
    }

    setPending(id);
    try {
      await apiFetch(`${base}/${id}`, {
        method: "PATCH",
        body: {
          name: editDraft.name.trim(),
          address: editDraft.address.trim(),
          phone: editDraft.phone.trim(),
          isMain: editDraft.isMain,
        },
      });
      setEditingId(null);
      toast.success("Branch updated.");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not update the branch.");
    } finally {
      setPending(null);
    }
  }

  async function makeMain(branch: BranchRow) {
    if (pending) return;
    setPending(branch.id);
    setError(null);
    try {
      await apiFetch(`${base}/${branch.id}`, {
        method: "PATCH",
        body: { isMain: true },
      });
      toast.success(`${branch.name} is now the main branch.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not update the branch.");
    } finally {
      setPending(null);
    }
  }

  async function removeBranch() {
    if (!removeTarget || pending) return;
    setPending(removeTarget.id);
    setError(null);
    try {
      await apiFetch(`${base}/${removeTarget.id}`, { method: "DELETE" });
      toast.success("Branch removed.");
      setRemoveTarget(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not remove the branch.");
      setRemoveTarget(null);
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-extrabold text-ink-900">Branches</h2>
          <p className="text-[12px] text-ink-400">
            {branches.length} location{branches.length === 1 ? "" : "s"} · members and classes can be
            assigned to a branch
          </p>
        </div>
        {canEdit && !adding ? (
          <Button type="button" size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Icon name="plus" size={14} /> Add branch
          </Button>
        ) : null}
      </div>

      {error ? (
        <InfoNote icon="alert" tone="danger" className="mt-4">
          {error}
        </InfoNote>
      ) : null}

      {canEdit && adding ? (
        <form onSubmit={addBranch} className="mt-4 rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Branch name" htmlFor="new-branch-name">
              <Input
                id="new-branch-name"
                value={newBranch.name}
                onChange={(event) =>
                  setNewBranch((current) => ({ ...current, name: event.target.value }))
                }
                maxLength={120}
                placeholder="e.g., Kandy branch"
                required
              />
            </Field>
            <Field label="Phone" htmlFor="new-branch-phone" hint="Optional">
              <Input
                id="new-branch-phone"
                value={newBranch.phone}
                onChange={(event) =>
                  setNewBranch((current) => ({ ...current, phone: event.target.value }))
                }
                maxLength={60}
              />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Address" htmlFor="new-branch-address" hint="Optional">
              <Input
                id="new-branch-address"
                value={newBranch.address}
                onChange={(event) =>
                  setNewBranch((current) => ({ ...current, address: event.target.value }))
                }
                maxLength={300}
              />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-[12.5px] font-semibold text-ink-600">
              <input
                type="checkbox"
                checked={newBranch.isMain}
                onChange={(event) =>
                  setNewBranch((current) => ({ ...current, isMain: event.target.checked }))
                }
                className="size-4 rounded border-ink-300 accent-brand-600"
              />
              Set as main branch
            </label>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={pending === "add"}>
                {pending === "add" ? (
                  <Icon name="loader" size={14} className="animate-spin" />
                ) : (
                  <Icon name="plus" size={14} />
                )}
                Add branch
              </Button>
            </div>
          </div>
        </form>
      ) : null}

      <div className="mt-4 space-y-2">
        {branches.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ink-200 p-4 text-center text-[12.5px] text-ink-400">
            No branches yet.
          </p>
        ) : (
          branches.map((branch) => (
            <div key={branch.id} className="rounded-2xl border border-ink-100 bg-white/70 p-3.5">
              {editingId === branch.id ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Branch name" htmlFor={`branch-name-${branch.id}`}>
                      <Input
                        id={`branch-name-${branch.id}`}
                        value={editDraft.name}
                        onChange={(event) =>
                          setEditDraft((current) => ({ ...current, name: event.target.value }))
                        }
                        maxLength={120}
                      />
                    </Field>
                    <Field label="Phone" htmlFor={`branch-phone-${branch.id}`}>
                      <Input
                        id={`branch-phone-${branch.id}`}
                        value={editDraft.phone}
                        onChange={(event) =>
                          setEditDraft((current) => ({ ...current, phone: event.target.value }))
                        }
                        maxLength={60}
                      />
                    </Field>
                  </div>
                  <Field label="Address" htmlFor={`branch-address-${branch.id}`}>
                    <Input
                      id={`branch-address-${branch.id}`}
                      value={editDraft.address}
                      onChange={(event) =>
                        setEditDraft((current) => ({ ...current, address: event.target.value }))
                      }
                      maxLength={300}
                    />
                  </Field>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex cursor-pointer items-center gap-2 text-[12.5px] font-semibold text-ink-600">
                      <input
                        type="checkbox"
                        checked={editDraft.isMain}
                        onChange={(event) =>
                          setEditDraft((current) => ({
                            ...current,
                            isMain: event.target.checked,
                          }))
                        }
                        className="size-4 rounded border-ink-300 accent-brand-600"
                      />
                      Main branch
                    </label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={pending === branch.id}
                        onClick={() => void saveBranch(branch.id)}
                      >
                        {pending === branch.id ? (
                          <Icon name="loader" size={14} className="animate-spin" />
                        ) : (
                          "Save"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-start gap-3">
                  <span className="flex size-9 flex-none items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon name="location" size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-[13.5px] font-bold text-ink-900">
                      <Link
                        href={`/campus/${slug}/branch/${branch.id}`}
                        className="truncate hover:text-brand-700"
                      >
                        {branch.name}
                      </Link>
                      {branch.isMain ? (
                        <span className="rounded-chip bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">
                          Main
                        </span>
                      ) : null}
                    </p>
                    {branch.address ? (
                      <p className="text-[11.5px] text-ink-500">{branch.address}</p>
                    ) : null}
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-ink-400">
                      <span>{branch.memberCount} members</span>
                      <span>{branch.classCount} classes</span>
                      {branch.phone ? (
                        <span className="inline-flex items-center gap-1">
                          <Icon name="phone" size={11} /> {branch.phone}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex flex-none items-center gap-1">
                    <Link
                      href={`/campus/${slug}/branch/${branch.id}`}
                      aria-label={`Open ${branch.name}`}
                      className="flex size-7 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                    >
                      <Icon name="external" size={13} />
                    </Link>
                  </div>
                  {canEdit ? (
                    <div className="flex flex-none items-center gap-1">
                      {!branch.isMain ? (
                        <button
                          type="button"
                          onClick={() => void makeMain(branch)}
                          disabled={pending === branch.id}
                          className="rounded-full px-2 py-1 text-[11px] font-bold text-brand-600 hover:bg-brand-50 disabled:opacity-50"
                        >
                          Make main
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => startEdit(branch)}
                        aria-label={`Edit ${branch.name}`}
                        className="flex size-7 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                      >
                        <Icon name="pencil" size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRemoveTarget(branch)}
                        aria-label={`Remove ${branch.name}`}
                        className="flex size-7 items-center justify-center rounded-full text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Remove this branch?"
        description={
          removeTarget
            ? `${removeTarget.name} will be deleted. Members and classes assigned to it will move to no branch. This cannot be undone.`
            : ""
        }
        confirmLabel="Remove branch"
        pending={Boolean(removeTarget && pending === removeTarget.id)}
        onConfirm={() => void removeBranch()}
        onCancel={() => setRemoveTarget(null)}
      />
    </section>
  );
}
