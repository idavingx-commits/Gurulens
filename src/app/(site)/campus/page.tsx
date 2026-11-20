import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LinkButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { EmptyState, InfoNote, SectionHeader, Stat } from "@/components/ui/primitives";
import { getAuth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/constants";
import { db } from "@/lib/db";
import { getOrgStats, getUserOrganizations } from "@/lib/organizations";

export const metadata: Metadata = { title: "Campus" };

type CampusOrg = {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  verifiedStatus: string;
  memberRole: string;
  stats: { members: number; channels: number; classes: number; students: number };
};

export default async function CampusPage() {
  const auth = await getAuth();
  if (!auth) redirect("/login?redirect=/campus");

  const isAdmin = ADMIN_ROLES.includes(auth.user.role);
  const myOrgs = await getUserOrganizations(auth.user.id);

  let organizations: CampusOrg[] = await Promise.all(
    myOrgs.map(async (org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      type: org.type,
      description: org.description,
      verifiedStatus: org.verifiedStatus,
      memberRole: org.memberRole,
      stats: await getOrgStats(org.id),
    })),
  );

  // Admins can see organizations they do not belong to yet (for registration / oversight).
  if (isAdmin) {
    const all = await db.organization.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, name: true, slug: true, type: true, description: true, verifiedStatus: true },
    });
    const have = new Set(organizations.map((o) => o.id));
    const extra = await Promise.all(
      all
        .filter((o) => !have.has(o.id))
        .map(async (o) => ({
          ...o,
          memberRole: "admin",
          stats: await getOrgStats(o.id),
        })),
    );
    organizations = [...organizations, ...extra];
  }

  const schools = organizations.filter((o) => o.type === "school");
  const institutes = organizations.filter((o) => o.type !== "school");
  const totalStudents = organizations.reduce((sum, o) => sum + o.stats.students, 0);
  const totalTeachers = organizations.reduce((sum, o) => sum + o.stats.members, 0);
  const totalClasses = organizations.reduce((sum, o) => sum + o.stats.classes, 0);

  function OrgCard({ org }: { org: CampusOrg }) {
    return (
      <Link
        href={`/campus/${org.slug}`}
        className="card block p-4 transition-shadow hover:border-brand-200 hover:shadow-md"
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex size-11 flex-none items-center justify-center rounded-2xl ${
              org.type === "school" ? "bg-brand-50 text-brand-600" : "bg-accent-100 text-accent-700"
            }`}
          >
            <Icon name={org.type === "school" ? "book-open" : "grid"} size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-[15px] font-bold text-ink-900">{org.name}</span>
              {org.verifiedStatus === "verified" ? (
                <span className="rounded-chip bg-success-100 px-2 py-0.5 text-[10.5px] font-bold text-success-600">
                  verified
                </span>
              ) : null}
            </div>
            <p className="text-[12px] font-semibold capitalize text-ink-400">
              {org.type} · {org.memberRole}
            </p>
            {org.description ? (
              <p className="mt-1.5 line-clamp-2 text-[12.5px] text-ink-500">{org.description}</p>
            ) : null}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-ink-100 pt-3 text-[11.5px] font-semibold text-ink-400">
          <span className="flex items-center gap-1">
            <Icon name="users" size={12} /> {org.stats.members} members
          </span>
          <span className="flex items-center gap-1">
            <Icon name="book" size={12} /> {org.stats.classes} classes
          </span>
          <span className="flex items-center gap-1">
            <Icon name="radio" size={12} /> {org.stats.channels} channels
          </span>
          <span className="flex items-center gap-1">
            <Icon name="user" size={12} /> {org.stats.students} students
          </span>
        </div>
      </Link>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-8 pb-12 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">Campus</h1>
          <p className="mt-1 text-[13px] text-ink-500">
            Schools and institutes — manage branches, teachers, classes and channels in one place.
          </p>
        </div>
        {isAdmin ? (
          <LinkButton href="/campus/create">
            <Icon name="plus" size={18} /> Register organization
          </LinkButton>
        ) : null}
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Organizations" value={organizations.length} icon="grid" />
        <Stat label="Members" value={totalTeachers} icon="users" />
        <Stat label="Classes" value={totalClasses} icon="book-open" />
        <Stat label="Students" value={totalStudents} icon="user" />
      </div>

      {organizations.length === 0 ? (
        <EmptyState
          icon="book-open"
          title="No campus yet"
          description={
            isAdmin
              ? "Register the first school or institute to start managing campus operations."
              : "Schools and institutes are registered by GuruLens admins. Ask your school admin to add you to their team."
          }
          action={
            isAdmin ? <LinkButton href="/campus/create">Register organization</LinkButton> : undefined
          }
        />
      ) : (
        <div className="space-y-10">
          {schools.length > 0 ? (
            <section>
              <SectionHeader title="Schools" subtitle={`${schools.length} school${schools.length === 1 ? "" : "s"}`} />
              <div className="grid gap-4 sm:grid-cols-2">
                {schools.map((org) => (
                  <OrgCard key={org.id} org={org} />
                ))}
              </div>
            </section>
          ) : null}

          {institutes.length > 0 ? (
            <section>
              <SectionHeader
                title={isAdmin ? "Institutes" : "My institutes"}
                subtitle={`${institutes.length} institute${institutes.length === 1 ? "" : "s"}`}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                {institutes.map((org) => (
                  <OrgCard key={org.id} org={org} />
                ))}
              </div>
            </section>
          ) : null}

          {schools.length === 0 && !isAdmin ? (
            <InfoNote icon="info">
              Your school is not on GuruLens yet? Ask your principal or ICT coordinator to contact
              GuruLens about the Campus pilot.
            </InfoNote>
          ) : null}
        </div>
      )}
    </div>
  );
}
