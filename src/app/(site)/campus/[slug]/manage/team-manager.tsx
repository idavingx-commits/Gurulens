"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Field, Input, Select } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/interactive";
import { InfoNote } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError } from "@/lib/client";

export type TeamRole = "owner" | "admin" | "manager" | "teacher" | "staff" | "student";
export type TeamStatus = "active" | "invited" | "suspended";

export type TeamRow = {
  id: string;
  role: string;
  status: string;
  joinedLabel: string;
  branch: { id: string; name: string } | null;
  admissionNo?: string | null;
  indexNo?: string | null;
  staffId?: string | null;
  schoolClass?: { id: string; name: string } | null;
  user: { id: string; name: string; email: string; avatarKey: string | null; role: string };
};

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  teacher: "Teacher",
  staff: "Staff",
  student: "Student",
};

const STATUS_TONE: Record<string, string> = {
  active: "bg-success-100 text-success-600",
  invited: "bg-warn-100 text-warn-600",
  suspended: "bg-ink-100 text-ink-500",
};

export function TeamManager({
  organizationId,
  members,
  branches,
  schoolClasses = [],
  canEdit,
}: {
  organizationId: string;
  members: TeamRow[];
  branches: { id: string; name: string }[];
  schoolClasses?: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("teacher");
  const [branchId, setBranchId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<TeamRole>("teacher");
  const [editBranch, setEditBranch] = useState("");
  const [editStatus, setEditStatus] = useState<TeamStatus>("active");
  const [editClass, setEditClass] = useState("");
  const [editAdmission, setEditAdmission] = useState("");
  const [editIndex, setEditIndex] = useState("");
  const [editStaff, setEditStaff] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<TeamRow | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const base = `/api/organizations/${organizationId}/members`;
  const pendingCount = members.filter((m) => m.status === "invited").length;

  const needle = search.trim().toLowerCase();
  const filtered = members.filter((member) => {
    if (roleFilter !== "all" && member.role !== roleFilter) return false;
    if (!needle) return true;
    return [
      member.user.name,
      member.user.email,
      member.branch?.name ?? "",
      member.role,
      member.status,
    ]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });

  async function addMember(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    if (!email.trim()) {
      setError("Enter the email address of an existing GuruLens account.");
      return;
    }

    setPending("add");
    try {
      await apiFetch(base, {
        method: "POST",
        body: {
          email: email.trim(),
          role,
          branchId: branchId || undefined,
        },
      });
      setEmail("");
      toast.success("Team member added.");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not add the team member.");
    } finally {
      setPending(null);
    }
  }

  function startEdit(member: TeamRow) {
    setEditingId(member.id);
    setEditRole(member.role as TeamRole);
    setEditBranch(member.branch?.id ?? "");
    setEditStatus(
      member.status === "invited" || member.status === "suspended" ? member.status : "active",
    );
    setEditClass(member.schoolClass?.id ?? "");
    setEditAdmission(member.admissionNo ?? "");
    setEditIndex(member.indexNo ?? "");
    setEditStaff(member.staffId ?? "");
    setError(null);
  }

  async function saveMember(id: string) {
    if (pending) return;
    setError(null);
    setPending(id);
    try {
      await apiFetch(`${base}/${id}`, {
        method: "PATCH",
        body: {
          role: editRole,
          branchId: editBranch || null,
          status: editStatus,
          schoolClassId: editClass || null,
          admissionNo: editAdmission.trim() || null,
          indexNo: editIndex.trim() || null,
          staffId: editStaff.trim() || null,
        },
      });
      setEditingId(null);
      toast.success("Team member updated.");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not update the team member.");
    } finally {
      setPending(null);
    }
  }

  async function reactivate(member: TeamRow) {
    if (pending) return;
    setPending(member.id);
    setError(null);
    try {
      await apiFetch(`${base}/${member.id}`, {
        method: "PATCH",
        body: { status: "active" },
      });
      toast.success(`${member.user.name} is active again.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not reactivate the member.");
    } finally {
      setPending(null);
    }
  }

  async function removeMember() {
    if (!removeTarget || pending) return;
    setPending(removeTarget.id);
    setError(null);
    try {
      await apiFetch(`${base}/${removeTarget.id}`, { method: "DELETE" });
      toast.success("Team member removed.");
      setRemoveTarget(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not remove the member.");
      setRemoveTarget(null);
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-extrabold text-ink-900">Team</h2>
          <p className="text-[12px] text-ink-400">
            {members.length} member{members.length === 1 ? "" : "s"} · roles control what each person
            can manage
          </p>
        </div>
      </div>

      {error ? (
        <InfoNote icon="alert" tone="danger" className="mt-4">
          {error}
        </InfoNote>
      ) : null}

      {pendingCount > 0 ? (
        <InfoNote icon="user-plus" tone="warn" className="mt-4">
          <span className="font-bold">
            {pendingCount} registration{pendingCount === 1 ? "" : "s"} awaiting approval.
          </span>{" "}
          Check the admission / staff IDs below, then press Approve.
        </InfoNote>
      ) : null}

      {canEdit ? (
        <form onSubmit={addMember} className="mt-4 rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
          <p className="mb-3 text-[12.5px] font-bold text-ink-700">Add an existing GuruLens account</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_150px_150px_auto]">
            <Field label="Email" htmlFor="member-email">
              <Input
                id="member-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="teacher@example.com"
                required
              />
            </Field>
            <Field label="Role" htmlFor="member-role">
              <Select
                id="member-role"
                value={role}
                onChange={(event) => setRole(event.target.value as TeamRole)}
              >
                <option value="teacher">Teacher</option>
                <option value="staff">Staff</option>
                <option value="student">Student</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </Select>
            </Field>
            <Field label="Branch" htmlFor="member-branch">
              <Select
                id="member-branch"
                value={branchId}
                onChange={(event) => setBranchId(event.target.value)}
              >
                <option value="">No branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex items-end">
              <Button type="submit" size="md" className="w-full" disabled={pending === "add"}>
                {pending === "add" ? (
                  <Icon name="loader" size={15} className="animate-spin" />
                ) : (
                  <Icon name="user-plus" size={15} />
                )}
                Add
              </Button>
            </div>
          </div>
          <p className="mt-2 text-[11.5px] text-ink-400">
            The person must already have a GuruLens account. They will be notified and can open the
            campus immediately.
          </p>
        </form>
      ) : (
        <InfoNote icon="info" className="mt-4">
          Only campus owners and admins can add or change team members.
        </InfoNote>
      )}

      {members.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 basis-44">
            <Icon
              name="search"
              size={14}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-400"
            />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email or branch…"
              aria-label="Search team"
              className="h-9 pl-8 text-[12.5px]"
            />
          </div>
          <Select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            aria-label="Filter by role"
            className="h-9 w-36 py-0 text-[12.5px]"
          >
            <option value="all">All roles</option>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="teacher">Teacher</option>
            <option value="staff">Staff</option>
            <option value="student">Student</option>
          </Select>
          <span className="text-[11.5px] font-semibold text-ink-400">
            {filtered.length} of {members.length}
          </span>
        </div>
      ) : null}

      <div className="mt-4 divide-y divide-ink-100">
        {members.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ink-200 p-4 text-center text-[12.5px] text-ink-400">
            No team members yet.
          </p>
        ) : filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ink-200 p-4 text-center text-[12.5px] text-ink-400">
            No members match that search.
          </p>
        ) : (
          filtered.map((member) => (
            <div key={member.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start gap-3">
                <Avatar
                  name={member.user.name}
                  src={member.user.avatarKey ? `/api/media/${member.user.avatarKey}` : null}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-bold text-ink-900">
                    {member.user.name}
                    <span
                      className={`rounded-chip px-1.5 py-0.5 text-[10px] font-bold capitalize ${
                        STATUS_TONE[member.status] ?? "bg-ink-100 text-ink-500"
                      }`}
                    >
                      {member.status}
                    </span>
                    <span className="rounded-chip bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold text-ink-500">
                      {member.user.role}
                    </span>
                  </p>
                  <p className="truncate text-[11.5px] text-ink-400">{member.user.email}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold text-ink-500">
                    <span>{ROLE_LABEL[member.role] ?? member.role}</span>
                    {member.branch ? (
                      <span className="inline-flex items-center gap-0.5">
                        <Icon name="location" size={10} /> {member.branch.name}
                      </span>
                    ) : null}
                    {member.schoolClass ? (
                      <span className="inline-flex items-center gap-0.5 rounded-chip bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">
                        <Icon name="school" size={9} /> {member.schoolClass.name}
                      </span>
                    ) : null}
                    {member.admissionNo ? (
                      <span className="rounded-chip bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold text-ink-500">
                        Adm. {member.admissionNo}
                      </span>
                    ) : null}
                    {member.indexNo ? (
                      <span className="rounded-chip bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold text-ink-500">
                        Index {member.indexNo}
                      </span>
                    ) : null}
                    {member.staffId ? (
                      <span className="rounded-chip bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold text-ink-500">
                        Staff {member.staffId}
                      </span>
                    ) : null}
                    <span className="text-ink-400">joined {member.joinedLabel}</span>
                  </p>
                </div>

                {canEdit ? (
                  <div className="flex flex-none items-center gap-1">
                    {member.status !== "active" ? (
                      <button
                        type="button"
                        onClick={() => void reactivate(member)}
                        disabled={pending === member.id}
                        className="rounded-full bg-success-100 px-2.5 py-1 text-[11px] font-bold text-success-600 hover:bg-success-500 hover:text-white disabled:opacity-50"
                      >
                        {member.status === "invited" ? "Approve" : "Activate"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => startEdit(member)}
                      aria-label={`Edit ${member.user.name}`}
                      className="flex size-7 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                    >
                      <Icon name="pencil" size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRemoveTarget(member)}
                      aria-label={`Remove ${member.user.name}`}
                      className="flex size-7 items-center justify-center rounded-full text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  </div>
                ) : null}
              </div>

              {editingId === member.id ? (
                <div className="mt-3 rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Role" htmlFor={`member-role-${member.id}`}>
                      <Select
                        id={`member-role-${member.id}`}
                        value={editRole}
                        onChange={(event) => setEditRole(event.target.value as TeamRole)}
                      >
                        <option value="teacher">Teacher</option>
                        <option value="staff">Staff</option>
                        <option value="student">Student</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                        <option value="owner">Owner</option>
                      </Select>
                    </Field>
                    <Field label="Branch" htmlFor={`member-branch-${member.id}`}>
                      <Select
                        id={`member-branch-${member.id}`}
                        value={editBranch}
                        onChange={(event) => setEditBranch(event.target.value)}
                      >
                        <option value="">No branch</option>
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Status" htmlFor={`member-status-${member.id}`}>
                      <Select
                        id={`member-status-${member.id}`}
                        value={editStatus}
                        onChange={(event) => setEditStatus(event.target.value as TeamStatus)}
                      >
                        <option value="active">Active</option>
                        <option value="invited">Invited</option>
                        <option value="suspended">Suspended</option>
                      </Select>
                    </Field>
                  </div>

                  {schoolClasses.length > 0 || editRole === "student" || editRole === "teacher" ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {schoolClasses.length > 0 ? (
                        <Field label="Class" htmlFor={`member-class-${member.id}`}>
                          <Select
                            id={`member-class-${member.id}`}
                            value={editClass}
                            onChange={(event) => setEditClass(event.target.value)}
                          >
                            <option value="">No class</option>
                            {schoolClasses.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </Select>
                        </Field>
                      ) : null}
                      <Field label="Admission no." htmlFor={`member-adm-${member.id}`}>
                        <Input
                          id={`member-adm-${member.id}`}
                          value={editAdmission}
                          onChange={(event) => setEditAdmission(event.target.value)}
                          maxLength={40}
                          placeholder="Students"
                        />
                      </Field>
                      <Field label="Index no." htmlFor={`member-idx-${member.id}`}>
                        <Input
                          id={`member-idx-${member.id}`}
                          value={editIndex}
                          onChange={(event) => setEditIndex(event.target.value)}
                          maxLength={40}
                          placeholder="Exam index"
                        />
                      </Field>
                      <Field label="Staff ID" htmlFor={`member-staff-${member.id}`}>
                        <Input
                          id={`member-staff-${member.id}`}
                          value={editStaff}
                          onChange={(event) => setEditStaff(event.target.value)}
                          maxLength={40}
                          placeholder="Teachers / staff"
                        />
                      </Field>
                    </div>
                  ) : null}

                  <div className="mt-3 flex justify-end gap-2">
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
                      disabled={pending === member.id}
                      onClick={() => void saveMember(member.id)}
                    >
                      {pending === member.id ? (
                        <Icon name="loader" size={14} className="animate-spin" />
                      ) : (
                        "Save"
                      )}
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
        title="Remove this team member?"
        description={
          removeTarget
            ? `${removeTarget.user.name} will lose access to this campus. Their classes and channel content stay intact.`
            : ""
        }
        confirmLabel="Remove member"
        pending={Boolean(removeTarget && pending === removeTarget.id)}
        onConfirm={() => void removeMember()}
        onCancel={() => setRemoveTarget(null)}
      />
    </section>
  );
}
