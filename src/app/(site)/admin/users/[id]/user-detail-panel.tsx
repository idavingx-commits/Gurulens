"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button, LinkButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { ConfirmDialog, Modal } from "@/components/ui/interactive";
import { InfoNote, Stat } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError } from "@/lib/client";
import { cn, compactNumber, formatDate, timeAgo } from "@/lib/format";

export type UserDetail = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    avatarKey: string | null;
    emailVerified: boolean;
    mfaEnabled: boolean;
    createdAt: string;
    dateOfBirth: string | null;
    handle: string | null;
    teacherVerified: string | null;
  };
  posts: Array<{
    id: string;
    type: string;
    title: string | null;
    text: string;
    moderationStatus: string;
    visibility: string;
    likeCount: number;
    commentCount: number;
    viewCount: number;
    publishedAt: string;
  }>;
  channels: Array<{
    id: string;
    name: string;
    slug: string;
    verifiedStatus: string;
    followerCount: number;
    postCount: number;
    isActive: boolean;
  }>;
  classes: Array<{ id: string; name: string; status: string; mode: string; students: number }>;
  counts: {
    posts: number;
    comments: number;
    reviews: number;
    media: number;
    enrollments: number;
    channels: number;
    classes: number;
    sessions: number;
  };
  subscription: {
    planName: string;
    planSlug: string;
    status: string;
    expiresAt: string | null;
  };
  history: Array<{
    id: string;
    planName: string;
    status: string;
    createdAt: string;
    expiresAt: string | null;
  }>;
  sessions: Array<{
    id: string;
    ip: string | null;
    userAgent: string | null;
    createdAt: string;
    expiresAt: string;
  }>;
  audit: Array<{
    id: string;
    action: string;
    targetRef: string | null;
    meta: string | null;
    actorName: string;
    createdAt: string;
  }>;
  plans: Array<{ name: string; slug: string; priceLkr: number }>;
  memberships: Array<{
    id: string;
    role: string;
    status: string;
    orgName: string;
    orgSlug: string;
    orgType: string;
  }>;
};

const ROLE_CHIP: Record<string, string> = {
  student: "bg-ink-100 text-ink-600",
  teacher: "bg-brand-100 text-brand-700",
  moderator: "bg-accent-100 text-accent-700",
  admin: "bg-ink-900 text-white",
};

const STATUS_CHIP: Record<string, string> = {
  approved: "bg-success-100 text-success-600",
  pending: "bg-warn-100 text-warn-600",
  removed: "bg-danger-100 text-danger-600",
  rejected: "bg-danger-100 text-danger-600",
};

type Tab = "overview" | "content" | "spaces" | "activity";

export function UserDetailPanel({ detail }: { detail: UserDetail }) {
  const router = useRouter();
  const toast = useToast();
  const { user, counts } = detail;
  const suspended = user.status === "suspended";

  const [tab, setTab] = useState<Tab>("overview");
  const [busy, setBusy] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [newRole, setNewRole] = useState(user.role);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantSlug, setGrantSlug] = useState(detail.plans[0]?.slug ?? "free");
  const [grantDays, setGrantDays] = useState("");
  const [grantReason, setGrantReason] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [confirmAction, setConfirmAction] = useState<
    "reactivate" | "verify_email" | "signout_all" | "cancel_plan" | null
  >(null);

  async function act(action: string, extra?: Record<string, unknown>) {
    setBusy(true);
    try {
      await apiFetch(`/api/admin/users/${user.id}`, {
        method: "POST",
        body: { action, ...extra },
      });
      const labels: Record<string, string> = {
        suspend: "User suspended.",
        reactivate: "User reactivated.",
        set_role: "Role updated.",
        delete_account: "Account deleted.",
        grant_plan: "Plan granted.",
        cancel_plan: "Plan cancelled.",
        verify_email: "Email marked verified.",
        signout_all: "All sessions signed out.",
      };
      toast.success(labels[action] ?? "Done.");
      setRoleOpen(false);
      setSuspendOpen(false);
      setSuspendReason("");
      setGrantOpen(false);
      setDeleteOpen(false);
      setConfirmEmail("");
      setConfirmAction(null);
      if (action === "delete_account") {
        router.push("/admin/users");
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Could not complete the action.");
    } finally {
      setBusy(false);
    }
  }

  async function moderatePost(postId: string, action: "remove" | "restore" | "delete") {
    setBusy(true);
    try {
      if (action === "delete") {
        await apiFetch(`/api/admin/posts/${postId}`, { method: "DELETE" });
        toast.success("Post permanently deleted.");
      } else {
        await apiFetch("/api/admin/moderation", {
          method: "POST",
          body: { targetType: "post", targetId: postId, action },
        });
        toast.success(action === "remove" ? "Post removed." : "Post restored.");
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Could not moderate the post.");
    } finally {
      setBusy(false);
    }
  }

  const tabs: Array<{ id: Tab; label: string; icon: string; count?: number }> = [
    { id: "overview", label: "Overview", icon: "grid" },
    { id: "content", label: "Content", icon: "file-text", count: counts.posts },
    { id: "spaces", label: "Channels & classes", icon: "radio", count: counts.channels + counts.classes },
    { id: "activity", label: "Activity", icon: "clock" },
  ];

  return (
    <div>
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1 text-[12px] font-bold text-ink-400 transition-colors hover:text-brand-600"
      >
        <Icon name="arrow-left" size={13} /> All users
      </Link>

      {/* Identity header */}
      <div className="card mt-3 p-5">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar
            name={user.name}
            src={user.avatarKey ? `/api/media/${user.avatarKey}` : null}
            size="lg"
            ring
            className={suspended ? "opacity-50" : undefined}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-ink-900">{user.name}</h1>
              <span
                className={cn(
                  "rounded-chip px-2 py-0.5 text-[10px] font-bold capitalize",
                  ROLE_CHIP[user.role] ?? "bg-ink-100 text-ink-500",
                )}
              >
                {user.role}
              </span>
              <span
                className={cn(
                  "rounded-chip px-2 py-0.5 text-[10px] font-bold capitalize",
                  suspended
                    ? "bg-danger-100 text-danger-600"
                    : "bg-success-100 text-success-600",
                )}
              >
                {user.status}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-chip px-2 py-0.5 text-[10px] font-bold",
                  user.emailVerified
                    ? "bg-success-100 text-success-600"
                    : "bg-warn-100 text-warn-600",
                )}
              >
                <Icon name={user.emailVerified ? "check-circle" : "mail"} size={10} />
                {user.emailVerified ? "Email verified" : "Email unverified"}
              </span>
              {user.mfaEnabled ? (
                <span className="inline-flex items-center gap-1 rounded-chip bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                  <Icon name="shield-check" size={10} /> 2FA on
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-[12.5px] font-semibold text-ink-500">
              {user.email}
              {user.handle ? (
                <>
                  {" · "}
                  <Link href={`/teacher/${user.handle}`} className="text-brand-600 hover:underline">
                    @{user.handle}
                  </Link>
                </>
              ) : null}
              {" · joined "}
              {formatDate(user.createdAt)}
            </p>
          </div>
        </div>

        {/* Admin actions */}
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-ink-100 pt-4">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => { setNewRole(user.role); setRoleOpen(true); }}>
            <Icon name="sliders" size={13} /> Change role
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setGrantOpen(true)}>
            <Icon name="crown" size={13} /> Grant plan
          </Button>
          {detail.subscription.status !== "free" ? (
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setConfirmAction("cancel_plan")}>
              <Icon name="x" size={13} /> Cancel plan
            </Button>
          ) : null}
          {!user.emailVerified ? (
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setConfirmAction("verify_email")}>
              <Icon name="check-circle" size={13} /> Verify email
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setConfirmAction("signout_all")}>
            <Icon name="logout" size={13} /> Sign out sessions
          </Button>
          {suspended ? (
            <Button type="button" variant="success" size="sm" disabled={busy} onClick={() => setConfirmAction("reactivate")}>
              <Icon name="refresh" size={13} /> Reactivate
            </Button>
          ) : (
            <Button type="button" variant="danger" size="sm" disabled={busy} onClick={() => { setSuspendReason(""); setSuspendOpen(true); }}>
              <Icon name="lock" size={13} /> Suspend
            </Button>
          )}
          <Button type="button" variant="danger" size="sm" disabled={busy} onClick={() => { setConfirmEmail(""); setDeleteOpen(true); }}>
            <Icon name="trash" size={13} /> Delete account
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Posts" value={counts.posts} icon="file-text" />
        <Stat label="Comments" value={counts.comments} icon="message" />
        <Stat label="Channels" value={counts.channels} icon="radio" />
        <Stat label="Classes" value={counts.classes} icon="book-open" />
      </div>

      {/* Tabs */}
      <div className="mt-5 flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex flex-none items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition-all",
              tab === t.id
                ? "border-ink-900 bg-ink-900 text-white"
                : "border-ink-200 bg-white/70 text-ink-600 hover:border-brand-300",
            )}
          >
            <Icon name={t.icon} size={13} />
            {t.label}
            {t.count !== undefined ? (
              <span className={cn("rounded-full px-1.5 text-[10px]", tab === t.id ? "bg-white/20" : "bg-ink-100")}>
                {t.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <h2 className="text-[13px] font-extrabold text-ink-900">Account details</h2>
            <dl className="mt-3 space-y-2 text-[12.5px]">
              {[
                ["User ID", user.id],
                ["Email", user.email],
                ["Role", user.role],
                ["Status", user.status],
                ["Email verified", user.emailVerified ? "Yes" : "No"],
                ["Two-factor auth", user.mfaEnabled ? "Enabled" : "Off"],
                ["Date of birth", user.dateOfBirth ? formatDate(user.dateOfBirth) : "—"],
                ["Teacher handle", user.handle ? `@${user.handle}` : "—"],
                ["Teacher verification", user.teacherVerified ?? "—"],
                ["Media files", String(counts.media)],
                ["Reviews written", String(counts.reviews)],
                ["Class enrolments", String(counts.enrollments)],
                ["Active sessions", String(counts.sessions)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3">
                  <dt className="font-semibold text-ink-400">{label}</dt>
                  <dd className="text-right font-bold break-all text-ink-700">{value}</dd>
                </div>
              ))}
            </dl>

            {detail.memberships.length > 0 ? (
              <div className="mt-4 border-t border-ink-100 pt-3">
                <h3 className="text-[11px] font-black tracking-wide text-ink-400 uppercase">
                  Campus memberships
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {detail.memberships.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-2 text-[12px]">
                      <Link href={`/campus/${m.orgSlug}`} className="font-bold text-brand-600 hover:underline">
                        {m.orgName}
                      </Link>
                      <span className="font-semibold text-ink-400 capitalize">
                        {m.role} · {m.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="card p-5">
            <h2 className="text-[13px] font-extrabold text-ink-900">Subscription</h2>
            <div className="mt-3 rounded-2xl bg-brand-50/70 p-4">
              <p className="flex items-center gap-2 text-[14px] font-extrabold text-brand-800">
                <Icon name="crown" size={15} /> {detail.subscription.planName}
              </p>
              <p className="mt-1 text-[11.5px] font-semibold text-brand-700 capitalize">
                {detail.subscription.status}
                {detail.subscription.expiresAt
                  ? ` · expires ${formatDate(detail.subscription.expiresAt)}`
                  : ""}
              </p>
            </div>
            <h3 className="mt-4 text-[11px] font-black tracking-wide text-ink-400 uppercase">
              Plan history
            </h3>
            {detail.history.length === 0 ? (
              <p className="mt-2 text-[12px] text-ink-400">No subscriptions yet — on the free plan.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {detail.history.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-2 text-[12px]">
                    <span className="font-bold text-ink-700">{h.planName}</span>
                    <span className="font-semibold text-ink-400 capitalize">
                      {h.status} · {timeAgo(h.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {/* Content */}
      {tab === "content" ? (
        <div className="card mt-4 divide-y divide-ink-100">
          {detail.posts.length === 0 ? (
            <p className="p-5 text-[13px] text-ink-400">This user has not published any posts.</p>
          ) : (
            detail.posts.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="flex size-9 flex-none items-center justify-center rounded-xl bg-ink-100 text-ink-500">
                  <Icon name={p.type === "reel" || p.type === "video" ? "film" : "file-text"} size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-[12.5px] font-bold text-ink-800">
                      {p.title ?? p.text.slice(0, 70)}
                    </p>
                    <span className={cn("rounded-chip px-1.5 py-0.5 text-[9.5px] font-bold capitalize", STATUS_CHIP[p.moderationStatus] ?? "bg-ink-100 text-ink-500")}>
                      {p.moderationStatus}
                    </span>
                    <span className="rounded-chip bg-ink-100 px-1.5 py-0.5 text-[9.5px] font-bold text-ink-500 capitalize">
                      {p.type}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] font-semibold text-ink-400">
                    {compactNumber(p.likeCount)} likes · {compactNumber(p.commentCount)} comments ·{" "}
                    {compactNumber(p.viewCount)} views · {timeAgo(p.publishedAt)}
                  </p>
                </div>
                <div className="flex flex-none gap-1.5">
                  <LinkButton href={`/post/${p.id}`} variant="outline" size="xs">
                    <Icon name="eye" size={12} /> View
                  </LinkButton>
                  {p.moderationStatus === "removed" || p.moderationStatus === "rejected" ? (
                    <Button type="button" variant="outline" size="xs" disabled={busy} onClick={() => void moderatePost(p.id, "restore")}>
                      <Icon name="refresh" size={12} /> Restore
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" size="xs" disabled={busy} className="!border-warn-500/40 !text-warn-600" onClick={() => void moderatePost(p.id, "remove")}>
                      <Icon name="eye" size={12} /> Remove
                    </Button>
                  )}
                  <Button type="button" variant="danger" size="xs" disabled={busy} onClick={() => void moderatePost(p.id, "delete")}>
                    <Icon name="trash" size={12} /> Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

      {/* Channels & classes */}
      {tab === "spaces" ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <h2 className="text-[13px] font-extrabold text-ink-900">Channels ({detail.channels.length})</h2>
            {detail.channels.length === 0 ? (
              <p className="mt-2 text-[12px] text-ink-400">No personal channels.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {detail.channels.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl bg-ink-50 px-3 py-2">
                    <Link href={`/channel/${c.slug}`} className="min-w-0 truncate text-[12.5px] font-bold text-brand-600 hover:underline">
                      {c.name}
                    </Link>
                    <span className="flex-none text-[11px] font-semibold text-ink-400">
                      {compactNumber(c.followerCount)} followers · {c.postCount} posts
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card p-5">
            <h2 className="text-[13px] font-extrabold text-ink-900">Classes ({detail.classes.length})</h2>
            {detail.classes.length === 0 ? (
              <p className="mt-2 text-[12px] text-ink-400">No classes created.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {detail.classes.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl bg-ink-50 px-3 py-2">
                    <Link href={`/classhub/class/${c.id}`} className="min-w-0 truncate text-[12.5px] font-bold text-brand-600 hover:underline">
                      {c.name}
                    </Link>
                    <span className="flex-none text-[11px] font-semibold text-ink-400 capitalize">
                      {c.status} · {c.students} students
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {/* Activity */}
      {tab === "activity" ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <h2 className="text-[13px] font-extrabold text-ink-900">
              Sessions ({counts.sessions})
            </h2>
            {detail.sessions.length === 0 ? (
              <p className="mt-2 text-[12px] text-ink-400">No active sessions.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {detail.sessions.map((s) => (
                  <li key={s.id} className="rounded-xl bg-ink-50 px-3 py-2 text-[11.5px]">
                    <p className="font-bold text-ink-700">{s.ip ?? "unknown IP"}</p>
                    <p className="mt-0.5 truncate font-semibold text-ink-400">
                      {s.userAgent ?? "unknown device"}
                    </p>
                    <p className="mt-0.5 font-semibold text-ink-400">
                      Started {timeAgo(s.createdAt)} · expires {formatDate(s.expiresAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card p-5">
            <h2 className="text-[13px] font-extrabold text-ink-900">Audit trail</h2>
            {detail.audit.length === 0 ? (
              <p className="mt-2 text-[12px] text-ink-400">No recorded activity.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {detail.audit.map((a) => (
                  <li key={a.id} className="rounded-xl bg-ink-50 px-3 py-2 text-[11.5px]">
                    <p className="font-bold text-ink-700">
                      <span className="font-mono">{a.action}</span>
                      <span className="font-semibold text-ink-400"> · by {a.actorName}</span>
                    </p>
                    <p className="mt-0.5 font-semibold text-ink-400">{timeAgo(a.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {/* Role modal */}
      <Modal
        open={roleOpen}
        onClose={() => setRoleOpen(false)}
        title={`Change role for ${user.name}`}
        footer={
          <>
            <button type="button" onClick={() => setRoleOpen(false)} className="rounded-full px-4 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-100">
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || newRole === user.role}
              onClick={() => void act("set_role", { role: newRole })}
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
            <option value="teacher">Teacher</option>
            <option value="moderator">Moderator</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>
        <p className="mt-2 text-[11.5px] leading-relaxed text-ink-400">
          Promoting to teacher creates a starter teacher profile automatically. The last active
          admin cannot be demoted. Changes apply immediately.
        </p>
      </Modal>

      {/* Suspend modal */}
      <Modal
        open={suspendOpen}
        onClose={() => setSuspendOpen(false)}
        title={`Suspend ${user.name}?`}
        footer={
          <>
            <button type="button" onClick={() => setSuspendOpen(false)} className="rounded-full px-4 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-100">
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || suspendReason.trim().length < 5}
              onClick={() => void act("suspend", { reason: suspendReason })}
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

      {/* Grant plan modal */}
      <Modal
        open={grantOpen}
        onClose={() => setGrantOpen(false)}
        title={`Grant a plan to ${user.name}`}
        footer={
          <>
            <button type="button" onClick={() => setGrantOpen(false)} className="rounded-full px-4 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-100">
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || !grantSlug}
              onClick={() =>
                void act("grant_plan", {
                  planSlug: grantSlug,
                  durationDays: grantDays ? Number(grantDays) : undefined,
                  reason: grantReason.trim() || undefined,
                })
              }
              className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {busy ? "Granting…" : "Grant plan"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Plan">
            <Select value={grantSlug} onChange={(e) => setGrantSlug(e.target.value)}>
              {detail.plans.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Custom duration (days)" hint="Leave blank to use the plan's billing cycle.">
            <Input
              inputMode="numeric"
              value={grantDays}
              onChange={(e) => setGrantDays(e.target.value.replace(/\D/g, ""))}
              placeholder="e.g. 90"
            />
          </Field>
          <Field label="Note to the user (optional)">
            <Input
              value={grantReason}
              onChange={(e) => setGrantReason(e.target.value)}
              maxLength={300}
              placeholder="e.g. Winner of the October teaching challenge."
            />
          </Field>
        </div>
      </Modal>

      {/* Delete account modal */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`Permanently delete ${user.name}?`}
        footer={
          <>
            <button type="button" onClick={() => setDeleteOpen(false)} className="rounded-full px-4 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-100">
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()}
              onClick={() => void act("delete_account", { confirmEmail })}
              className="inline-flex items-center gap-2 rounded-full bg-danger-500 px-5 py-2 text-sm font-semibold text-white hover:bg-danger-600 disabled:opacity-50"
            >
              {busy ? "Deleting…" : "Delete forever"}
            </button>
          </>
        }
      >
        <InfoNote tone="danger" icon="alert" className="mb-3">
          This erases the account, its posts, comments, channels, classes and media. It cannot be
          undone. Consider suspending instead.
        </InfoNote>
        <Field label={`Type ${user.email} to confirm`}>
          <Input
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            placeholder={user.email}
            autoComplete="off"
          />
        </Field>
      </Modal>

      {/* Simple confirms */}
      <ConfirmDialog
        open={confirmAction === "reactivate"}
        title={`Reactivate ${user.name}?`}
        description="They will be able to sign in again. Their old content stays as it is."
        confirmLabel="Reactivate"
        tone="primary"
        pending={busy}
        onConfirm={() => void act("reactivate")}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmDialog
        open={confirmAction === "verify_email"}
        title="Mark email as verified?"
        description="Use this when you have confirmed the address belongs to this person (e.g. via support)."
        confirmLabel="Verify email"
        tone="primary"
        pending={busy}
        onConfirm={() => void act("verify_email")}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmDialog
        open={confirmAction === "signout_all"}
        title="Sign out all sessions?"
        description="Every device is signed out immediately. The user can sign in again with their password."
        confirmLabel="Sign out everywhere"
        pending={busy}
        onConfirm={() => void act("signout_all")}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmDialog
        open={confirmAction === "cancel_plan"}
        title={`Cancel ${detail.subscription.planName}?`}
        description="The user goes back to the free plan. Their content stays untouched."
        confirmLabel="Cancel plan"
        pending={busy}
        onConfirm={() => void act("cancel_plan")}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
