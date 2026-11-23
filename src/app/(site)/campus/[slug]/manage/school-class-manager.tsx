"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Field, Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/interactive";
import { InfoNote } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError } from "@/lib/client";

export type SchoolClassRow = {
  id: string;
  name: string;
  section: string | null;
  room: string | null;
  students: number;
};

export function SchoolClassManager({
  organizationId,
  classes,
  canEdit,
}: {
  organizationId: string;
  classes: SchoolClassRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const base = `/api/organizations/${organizationId}/school-classes`;

  const [name, setName] = useState("");
  const [section, setSection] = useState("");
  const [room, setRoom] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<SchoolClassRow | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRoom, setEditRoom] = useState("");

  async function addClass(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    if (!name.trim()) {
      setError("Give the class a name, e.g. “Grade 10 — A”.");
      return;
    }
    setPending("add");
    try {
      await apiFetch(base, {
        method: "POST",
        body: {
          name: name.trim(),
          section: section.trim() || undefined,
          room: room.trim() || undefined,
        },
      });
      setName("");
      setSection("");
      setRoom("");
      toast.success("Class created.");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not create the class.");
    } finally {
      setPending(null);
    }
  }

  async function saveClass(id: string) {
    if (pending) return;
    setPending(id);
    setError(null);
    try {
      await apiFetch(`${base}/${id}`, {
        method: "PATCH",
        body: { name: editName.trim(), room: editRoom.trim() || null },
      });
      setEditingId(null);
      toast.success("Class updated.");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not update the class.");
    } finally {
      setPending(null);
    }
  }

  async function removeClass() {
    if (!removeTarget || pending) return;
    setPending(removeTarget.id);
    try {
      await apiFetch(`${base}/${removeTarget.id}`, { method: "DELETE" });
      toast.success("Class deleted.");
      setRemoveTarget(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Could not delete the class.");
      setRemoveTarget(null);
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-extrabold text-ink-900">Classes &amp; sections</h2>
          <p className="text-[12px] text-ink-400">
            Grade groups like “Grade 10 — A”. Students pick their class when registering, and each
            class gets its own weekly timetable.
          </p>
        </div>
        <span className="rounded-chip bg-ink-100 px-2.5 py-1 text-[11px] font-bold text-ink-500">
          {classes.length} class{classes.length === 1 ? "" : "es"}
        </span>
      </div>

      {error ? (
        <InfoNote icon="alert" tone="danger" className="mt-4">
          {error}
        </InfoNote>
      ) : null}

      {canEdit ? (
        <form onSubmit={addClass} className="mt-4 rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_120px_140px_auto]">
            <Field label="Class name" htmlFor="sc-name">
              <Input
                id="sc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Grade 10 — A"
                maxLength={60}
                required
              />
            </Field>
            <Field label="Section" htmlFor="sc-section">
              <Input
                id="sc-section"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="A"
                maxLength={20}
              />
            </Field>
            <Field label="Room" htmlFor="sc-room">
              <Input
                id="sc-room"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="Room 12"
                maxLength={60}
              />
            </Field>
            <div className="flex items-end">
              <Button type="submit" size="md" className="w-full" disabled={pending === "add"}>
                {pending === "add" ? (
                  <Icon name="loader" size={15} className="animate-spin" />
                ) : (
                  <Icon name="plus" size={15} />
                )}
                Add
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <InfoNote icon="info" className="mt-4">
          Only owners and admins can create classes.
        </InfoNote>
      )}

      <div className="mt-4 divide-y divide-ink-100">
        {classes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ink-200 p-4 text-center text-[12.5px] text-ink-400">
            No classes yet. Add the first grade/section group above.
          </p>
        ) : (
          classes.map((c) => (
            <div key={c.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex size-9 flex-none items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon name="school" size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-ink-900">{c.name}</p>
                  <p className="text-[11px] font-semibold text-ink-400">
                    {c.students} student{c.students === 1 ? "" : "s"}
                    {c.room ? ` · ${c.room}` : ""}
                    {c.section ? ` · section ${c.section}` : ""}
                  </p>
                </div>
                {canEdit ? (
                  <div className="flex flex-none items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(c.id);
                        setEditName(c.name);
                        setEditRoom(c.room ?? "");
                      }}
                      aria-label={`Edit ${c.name}`}
                      className="flex size-7 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                    >
                      <Icon name="pencil" size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRemoveTarget(c)}
                      aria-label={`Delete ${c.name}`}
                      className="flex size-7 items-center justify-center rounded-full text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  </div>
                ) : null}
              </div>

              {editingId === c.id ? (
                <div className="mt-3 rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Class name">
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={60} />
                    </Field>
                    <Field label="Room">
                      <Input value={editRoom} onChange={(e) => setEditRoom(e.target.value)} maxLength={60} />
                    </Field>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                    <Button type="button" size="sm" disabled={pending === c.id} onClick={() => void saveClass(c.id)}>
                      {pending === c.id ? <Icon name="loader" size={14} className="animate-spin" /> : "Save"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title={`Delete ${removeTarget?.name ?? "this class"}?`}
        description="Its timetable is removed and students are unlinked from the class (their accounts stay). This cannot be undone."
        confirmLabel="Delete class"
        pending={Boolean(removeTarget && pending === removeTarget.id)}
        onConfirm={() => void removeClass()}
        onCancel={() => setRemoveTarget(null)}
      />
    </section>
  );
}
