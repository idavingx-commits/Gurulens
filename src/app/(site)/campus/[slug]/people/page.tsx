import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";

import { Avatar } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { EmptyState, SectionHeader, Stat, VerifiedTick } from "@/components/ui/primitives";
import { ShareButton } from "@/components/ui/share-button";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { getOrgAccess, getOrganizationBySlug } from "@/lib/organizations";
import { CampusNav } from "../campus-nav";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; role?: string; branch?: string }>;
};

const ROLES = ["owner", "admin", "manager", "teacher", "staff", "student"] as const;
type RoleFilter = (typeof ROLES)[number];

const ROLE_META: Record<string, { label: string; tone: string }> = {
  owner: { label: "Owner", tone: "bg-brand-50 text-brand-700" },
  admin: { label: "Admin", tone: "bg-accent-100 text-accent-700" },
  manager: { label: "Manager", tone: "bg-success-100 text-success-600" },
  teacher: { label: "Teacher", tone: "bg-ink-100 text-ink-600" },
  staff: { label: "Staff", tone: "bg-ink-100 text-ink-500" },
  student: { label: "Student", tone: "bg-warn-100 text-warn-600" },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);
  if (!org) return { title: "Campus not found" };
  const imageKey = org.coverKey ?? org.logoKey;
  const imageUrl = imageKey ? `/api/media/${imageKey}` : "/brand/og-default.png";
  return {
    title: `${org.name} team · Campus`,
    description: `Meet the teachers and staff at ${org.name} on GuruLens Campus.`,
    alternates: { canonical: `/campus/${slug}/people` },
    openGraph: {
      type: "website",
      title: `${org.name} team · GuruLens Campus`,
      description: `Meet the team at ${org.name}.`,
      url: `/campus/${slug}/people`,
      images: [{ url: imageUrl, alt: `${org.name} on GuruLens Campus` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${org.name} team · GuruLens Campus`,
      description: `Meet the team at ${org.name}.`,
      images: [imageUrl],
    },
  };
}

export default async function CampusPeoplePage({ params, searchParams }: Props) {
  const auth = await getAuth();
  const { slug } = await params;
  if (!auth) redirect(`/login?redirect=/campus/${slug}/people`);

  const org = await getOrganizationBySlug(slug);
  if (!org) notFound();
  const campusSlug = org.slug;

  const access = await getOrgAccess(auth.user.id, auth.user.role, org.id);
  // Public directory: any signed-in visitor can see the campus people list.
  // Emails and school IDs stay visible to managers only.

  const query = await searchParams;
  const q = (query.q ?? "").trim();
  const role = ROLES.includes(query.role as RoleFilter) ? (query.role as RoleFilter) : undefined;
  const branches = org.branches;
  const branchId = branches.some((branch) => branch.id === query.branch) ? query.branch : undefined;
  const canSeeEmails = access.canManage;

  const userFilters: Prisma.UserWhereInput[] = [
    { name: { contains: q, mode: "insensitive" } },
  ];
  if (canSeeEmails) {
    userFilters.push({ email: { contains: q, mode: "insensitive" } });
  }

  const where: Prisma.OrganizationMemberWhereInput = {
    organizationId: org.id,
    status: "active",
    ...(role ? { role } : {}),
    ...(branchId ? { branchId } : {}),
    ...(q ? { user: { OR: userFilters } } : {}),
  };

  const [members, allMembers] = await Promise.all([
    db.organizationMember.findMany({
      where,
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      take: 120,
      select: {
        id: true,
        role: true,
        status: true,
        joinedAt: true,
        admissionNo: true,
        indexNo: true,
        staffId: true,
        schoolClass: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarKey: true,
            teacherProfile: {
              select: { handle: true, verifiedStatus: true, tagline: true },
            },
          },
        },
      },
    }),
    db.organizationMember.findMany({
      where: { organizationId: org.id, status: "active" },
      select: { role: true },
    }),
  ]);

  const roleCount = new Map<string, number>();
  for (const member of allMembers) {
    roleCount.set(member.role, (roleCount.get(member.role) ?? 0) + 1);
  }

  const sorted = [...members].sort(
    (a, b) => ROLES.indexOf(a.role as RoleFilter) - ROLES.indexOf(b.role as RoleFilter),
  );

  function href(next: { q?: string; role?: string; branch?: string }) {
    const params = new URLSearchParams();
    const nextQuery = next.q ?? q;
    const nextRole = next.role !== undefined ? next.role : role;
    const nextBranch = next.branch !== undefined ? next.branch : branchId;
    if (nextQuery) params.set("q", nextQuery);
    if (nextRole) params.set("role", nextRole);
    if (nextBranch) params.set("branch", nextBranch);
    const qs = params.toString();
    return qs ? `/campus/${campusSlug}/people?${qs}` : `/campus/${campusSlug}/people`;
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-6 pb-12 sm:px-6">
      <div className="mb-1">
        <Link
          href={`/campus/${org.slug}`}
          className="inline-flex items-center gap-1 text-[12px] font-bold text-ink-400 transition-colors hover:text-brand-600"
        >
          <Icon name="arrow-left" size={13} /> Back to {org.name}
        </Link>
      </div>

      <CampusNav slug={org.slug} active="people" canManage={access.canManage} />

      <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">People</h1>
          <p className="mt-1 text-[13px] text-ink-500">
            Teachers, managers and staff who make {org.name} run.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ShareButton
            path={`/campus/${org.slug}/people`}
            title={`${org.name} team · GuruLens Campus`}
            text={`Meet the team at ${org.name} on GuruLens`}
            label="Share team"
          />
          {access.canAdminister ? (
            <LinkButton href={`/campus/${org.slug}/manage`} variant="outline" size="sm">
              <Icon name="user-plus" size={14} /> Manage team
            </LinkButton>
          ) : null}
        </div>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="People" value={allMembers.length} icon="users" />
        <Stat label="Teachers" value={roleCount.get("teacher") ?? 0} icon="user" />
        <Stat
          label="Leaders"
          value={
            (roleCount.get("owner") ?? 0) +
            (roleCount.get("admin") ?? 0) +
            (roleCount.get("manager") ?? 0)
          }
          icon="crown"
        />
        <Stat
          label={org.type === "school" ? "Students" : "Staff"}
          value={roleCount.get(org.type === "school" ? "student" : "staff") ?? 0}
          icon={org.type === "school" ? "school" : "award"}
        />
      </div>

      <form method="get" className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-56">
          <Icon
            name="search"
            size={16}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-400"
          />
          <Input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={canSeeEmails ? "Search name or email…" : "Search by name…"}
            aria-label="Search campus team"
            className="h-10 pl-10"
          />
        </div>
        {role ? <input type="hidden" name="role" value={role} /> : null}
        {branchId ? <input type="hidden" name="branch" value={branchId} /> : null}
        <button
          type="submit"
          className="inline-flex h-10 flex-none items-center gap-2 rounded-full bg-brand-600 px-4 text-[12.5px] font-bold text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          <Icon name="search" size={14} /> Search
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={href({ role: "" })}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition-colors ${
            !role
              ? "border-brand-600 bg-brand-600 text-white shadow-sm"
              : "border-ink-200 bg-white/80 text-ink-600 hover:border-brand-300 hover:text-brand-700"
          }`}
        >
          <Icon name="users" size={13} /> Everyone
          <span
            className={`rounded-chip px-1.5 py-0.5 text-[10px] font-black ${
              !role ? "bg-white/20 text-white" : "bg-ink-100 text-ink-500"
            }`}
          >
            {allMembers.length}
          </span>
        </Link>
        {ROLES.map((value) => {
          const meta = ROLE_META[value];
          const active = role === value;
          return (
            <Link
              key={value}
              href={href({ role: value })}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition-colors ${
                active
                  ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                  : "border-ink-200 bg-white/80 text-ink-600 hover:border-brand-300 hover:text-brand-700"
              }`}
            >
              {meta.label}s
              <span
                className={`rounded-chip px-1.5 py-0.5 text-[10px] font-black ${
                  active ? "bg-white/20 text-white" : "bg-ink-100 text-ink-500"
                }`}
              >
                {roleCount.get(value) ?? 0}
              </span>
            </Link>
          );
        })}
      </div>

      {branches.length > 1 ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Link
            href={href({ branch: "" })}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11.5px] font-bold transition-colors ${
              !branchId
                ? "border-ink-900 bg-ink-900 text-white"
                : "border-ink-200 bg-white/80 text-ink-600 hover:border-brand-300"
            }`}
          >
            <Icon name="location" size={12} /> All branches
          </Link>
          {branches.map((branch) => (
            <Link
              key={branch.id}
              href={href({ branch: branch.id })}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11.5px] font-bold transition-colors ${
                branchId === branch.id
                  ? "border-ink-900 bg-ink-900 text-white"
                  : "border-ink-200 bg-white/80 text-ink-600 hover:border-brand-300"
              }`}
            >
              {branch.name}
            </Link>
          ))}
        </div>
      ) : null}

      {(q || role || branchId) && (
        <div className="mt-4 flex items-center gap-2 text-[12px] font-semibold text-ink-400">
          <span>
            {sorted.length} result{sorted.length === 1 ? "" : "s"}
          </span>
          <Link href={`/campus/${org.slug}/people`} className="font-bold text-brand-600 hover:underline">
            Clear filters
          </Link>
        </div>
      )}

      <SectionHeader
        className="mt-7"
        title="Campus directory"
        subtitle={`${sorted.length} active member${sorted.length === 1 ? "" : "s"}`}
      />

      {sorted.length === 0 ? (
        <EmptyState
          icon="users"
          title="No people match"
          description={
            q || role || branchId
              ? "Try a different search or clear the filters."
              : "Invite teachers and staff from the manage page."
          }
          action={
            access.canAdminister ? (
              <LinkButton href={`/campus/${org.slug}/manage`} variant="outline">
                Manage team
              </LinkButton>
            ) : undefined
          }
        />
      ) : (
        <div className="card divide-y divide-ink-100">
          {sorted.map((member) => {
            const meta = ROLE_META[member.role] ?? ROLE_META.staff;
            const handle = member.user.teacherProfile?.handle;
            return (
              <div key={member.id} className="flex flex-wrap items-center gap-3 p-4">
                <Avatar
                  name={member.user.name}
                  src={member.user.avatarKey ? `/api/media/${member.user.avatarKey}` : null}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-[13.5px] font-bold text-ink-900">
                    {handle ? (
                      <Link href={`/teacher/${handle}`} className="truncate hover:text-brand-700">
                        {member.user.name}
                      </Link>
                    ) : (
                      <span className="truncate">{member.user.name}</span>
                    )}
                    {member.user.teacherProfile?.verifiedStatus === "verified" ? (
                      <VerifiedTick className="size-4 flex-none" />
                    ) : null}
                    <span
                      className={`rounded-chip px-1.5 py-0.5 text-[10px] font-bold ${meta.tone}`}
                    >
                      {meta.label}
                    </span>
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] font-semibold text-ink-400">
                    {member.user.teacherProfile?.tagline ? (
                      <span className="max-w-full truncate text-ink-500">
                        {member.user.teacherProfile.tagline}
                      </span>
                    ) : null}
                    {member.schoolClass ? (
                      <span className="inline-flex items-center gap-0.5 rounded-chip bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">
                        <Icon name="school" size={9} /> {member.schoolClass.name}
                      </span>
                    ) : null}
                    {canSeeEmails && member.admissionNo ? (
                      <span className="rounded-chip bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold text-ink-500">
                        Adm. {member.admissionNo}
                      </span>
                    ) : null}
                    {canSeeEmails && member.staffId ? (
                      <span className="rounded-chip bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold text-ink-500">
                        Staff {member.staffId}
                      </span>
                    ) : null}
                    {member.branch ? (
                      <span className="inline-flex items-center gap-0.5">
                        <Icon name="location" size={10} /> {member.branch.name}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-0.5">
                      <Icon name="calendar" size={10} /> joined {formatDate(member.joinedAt)}
                    </span>
                  </p>
                  {canSeeEmails ? (
                    <a
                      href={`mailto:${member.user.email}`}
                      className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-ink-400 hover:text-brand-700"
                    >
                      <Icon name="mail" size={10} /> {member.user.email}
                    </a>
                  ) : null}
                </div>
                {handle ? (
                  <LinkButton href={`/teacher/${handle}`} variant="outline" size="sm">
                    Profile
                  </LinkButton>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
