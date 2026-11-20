import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { EmptyState, SectionHeader, Stat, VerifiedTick } from "@/components/ui/primitives";
import { getAuth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/constants";
import { db } from "@/lib/db";
import { compactNumber, timeAgo } from "@/lib/format";
import { getOrgStats, getOrganizationBySlug } from "@/lib/organizations";
import { RequestOrgVerification } from "./request-verification";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);
  if (!org) return { title: "Campus not found" };
  return {
    title: org.name,
    description: org.description ?? `${org.name} on GuruLens Campus`,
  };
}

export default async function CampusDetailPage({ params }: Props) {
  const auth = await getAuth();
  if (!auth) redirect(`/login?redirect=/campus`);

  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);
  if (!org) notFound();

  const membership = await db.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: org.id, userId: auth.user.id } },
    select: { role: true, status: true },
  });

  const isAdmin = ADMIN_ROLES.includes(auth.user.role);
  const isMember = membership?.status === "active";
  if (!isMember && !isAdmin) notFound();

  const canManage =
    isAdmin || (isMember && ["owner", "admin", "manager"].includes(membership?.role ?? ""));
  const isStaff = isAdmin || (isMember && ["owner", "admin", "manager", "teacher"].includes(membership?.role ?? ""));

  const [stats, classes, branches, members] = await Promise.all([
    getOrgStats(org.id),
    db.class.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        name: true,
        mode: true,
        status: true,
        teacher: { select: { name: true } },
        _count: { select: { enrollments: true, sessions: true } },
      },
    }),
    db.organizationBranch.findMany({
      where: { organizationId: org.id },
      orderBy: { isMain: "desc" },
      select: { id: true, name: true, address: true, isMain: true },
    }),
    db.organizationMember.findMany({
      where: { organizationId: org.id, status: "active" },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      take: 50,
      select: {
        id: true,
        role: true,
        joinedAt: true,
        user: { select: { id: true, name: true, avatarKey: true, role: true } },
      },
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-8 pb-12 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start gap-4">
        <span className="flex size-16 flex-none items-center justify-center rounded-3xl bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/25">
          <Icon name={org.type === "school" ? "book-open" : "grid"} size={28} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">{org.name}</h1>
            {org.verifiedStatus === "verified" ? <VerifiedTick /> : null}
            <span className="rounded-chip bg-ink-100 px-2.5 py-1 text-[11px] font-bold capitalize text-ink-500">
              {org.type}
            </span>
          </div>
          {org.nameSi ? (
            <p lang="si" className="font-si text-[13.5px] font-semibold text-ink-500">
              {org.nameSi}
            </p>
          ) : null}
          <p className="mt-1 text-[12px] font-semibold text-ink-400">
            /campus/{org.slug} · joined {timeAgo(org.createdAt)}
          </p>
          {org.description ? (
            <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-ink-600">{org.description}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] font-semibold text-ink-500">
            {org.address ? (
              <span className="flex items-center gap-1">
                <Icon name="location" size={13} /> {org.address}
              </span>
            ) : null}
            {org.email ? (
              <a href={`mailto:${org.email}`} className="flex items-center gap-1 hover:text-brand-600">
                <Icon name="mail" size={13} /> {org.email}
              </a>
            ) : null}
            {org.phone ? (
              <span className="flex items-center gap-1">
                <Icon name="phone" size={13} /> {org.phone}
              </span>
            ) : null}
            {org.website ? (
              <a
                href={org.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 hover:text-brand-600"
              >
                <Icon name="globe" size={13} /> {org.website.replace(/^https?:\/\//, "")}
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Members" value={compactNumber(stats.members)} icon="users" />
        <Stat label="Classes" value={compactNumber(stats.classes)} icon="book-open" />
        <Stat label="Students" value={compactNumber(stats.students)} icon="user" />
        <Stat label="Channels" value={compactNumber(stats.channels)} icon="radio" />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {/* Classes */}
          <section>
            <SectionHeader
              title="Classes"
              subtitle={`${classes.length} class${classes.length === 1 ? "" : "es"} under this organization`}
            />
            {classes.length === 0 ? (
              <EmptyState
                icon="book-open"
                title="No classes yet"
                description="Classes created by members of this organization appear here."
              />
            ) : (
              <div className="card divide-y divide-ink-100">
                {classes.map((cls) => (
                  <div key={cls.id} className="flex flex-wrap items-center gap-3 p-4">
                    <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <Icon name="book" size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-bold text-ink-900">{cls.name}</span>
                        <span className="rounded-chip bg-ink-100 px-2 py-0.5 text-[10.5px] font-bold capitalize text-ink-500">
                          {cls.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[12px] font-semibold text-ink-400">
                        {cls.teacher.name} · {cls._count.enrollments} students · {cls._count.sessions} sessions ·{" "}
                        {cls.mode}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Team */}
          <section>
            <SectionHeader title="Team" subtitle={`${members.length} active member${members.length === 1 ? "" : "s"}`} />
            {members.length === 0 ? (
              <p className="text-[13px] text-ink-400">No members yet.</p>
            ) : (
              <div className="card divide-y divide-ink-100">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-3.5">
                    <Avatar
                      name={m.user.name}
                      src={m.user.avatarKey ? `/api/media/${m.user.avatarKey}` : null}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-ink-900">{m.user.name}</p>
                      <p className="text-[11.5px] font-semibold capitalize text-ink-400">
                        {m.role} · joined {timeAgo(m.joinedAt)}
                      </p>
                    </div>
                    {m.user.role === "teacher" ? (
                      <Link
                        href="/explore"
                        className="text-[11.5px] font-bold text-brand-600 hover:underline"
                      >
                        View profile
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-8">
          {/* Verification */}
          <section>
            <SectionHeader title="Verification" />
            <div className="card p-4">
              <div className="flex items-center gap-2">
                <Icon
                  name={org.verifiedStatus === "verified" ? "shield-check" : "shield"}
                  size={18}
                  className={org.verifiedStatus === "verified" ? "text-success-500" : "text-ink-400"}
                />
                <span className="text-[13px] font-extrabold capitalize text-ink-900">
                  {org.verifiedStatus.replace("_", " ")}
                </span>
                {org.verifiedAt ? (
                  <span className="ml-auto text-[11px] font-semibold text-ink-400">
                    {timeAgo(org.verifiedAt)}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-ink-500">
                {org.verifiedStatus === "verified"
                  ? "This organization has been verified by the GuruLens team."
                  : org.verifiedStatus === "pending" || org.verifiedStatus === "in_review"
                    ? "The GuruLens team is reviewing this organization's evidence."
                    : "Verified organizations earn trust with students, parents and teachers."}
              </p>
              {canManage && (org.verifiedStatus === "none" || org.verifiedStatus === "rejected") ? (
                <div className="mt-4 border-t border-ink-100 pt-4">
                  <RequestOrgVerification organizationId={org.id} />
                </div>
              ) : null}
            </div>
          </section>

          {/* Branches */}
          <section>
            <SectionHeader title="Branches" subtitle={`${branches.length} location${branches.length === 1 ? "" : "s"}`} />
            {branches.length === 0 ? (
              <p className="text-[13px] text-ink-400">No branches added.</p>
            ) : (
              <div className="space-y-2">
                {branches.map((b) => (
                  <div key={b.id} className="card flex items-start gap-2.5 p-3.5">
                    <Icon name="location" size={15} className="mt-0.5 flex-none text-ink-400" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-ink-900">
                        {b.name}
                        {b.isMain ? (
                          <span className="ml-1.5 rounded-chip bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">
                            Main
                          </span>
                        ) : null}
                      </p>
                      {b.address ? <p className="text-[11.5px] text-ink-500">{b.address}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Quick links */}
          {isStaff ? (
            <section>
              <SectionHeader title="Quick actions" />
              <div className="space-y-2">
                <LinkButton href="/classhub" variant="outline" className="w-full justify-start">
                  <Icon name="book-open" size={16} /> ClassHub
                </LinkButton>
                <LinkButton href="/channels" variant="outline" className="w-full justify-start">
                  <Icon name="radio" size={16} /> Channels
                </LinkButton>
                {isAdmin ? (
                  <LinkButton href="/admin/organizations" variant="outline" className="w-full justify-start">
                    <Icon name="shield" size={16} /> Admin verification
                  </LinkButton>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
