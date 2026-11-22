import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import {
  EmptyState,
  InfoNote,
  SectionHeader,
  Stat,
  VerifiedTick,
} from "@/components/ui/primitives";
import { ShareButton } from "@/components/ui/share-button";
import { getAuth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/constants";
import { db } from "@/lib/db";
import { compactNumber } from "@/lib/format";
import { getOrgStats, getUserOrganizations } from "@/lib/organizations";

export const metadata: Metadata = {
  title: "Campus",
  description: "Schools and institutes managing classes, channels and teams on GuruLens.",
};

const CAMPUS_TYPES = ["school", "institute"] as const;
type CampusType = (typeof CAMPUS_TYPES)[number];

const SORTS = [
  { value: "recent", label: "Recently added", icon: "clock" },
  { value: "name", label: "Name", icon: "list" },
  { value: "students", label: "Most students", icon: "user" },
  { value: "classes", label: "Most classes", icon: "book-open" },
  { value: "members", label: "Biggest team", icon: "users" },
] as const;
type CampusSort = (typeof SORTS)[number]["value"];

const TYPE_META: Record<CampusType, { label: string; icon: string; chip: string }> = {
  school: { label: "School", icon: "school", chip: "bg-brand-600/95 text-white" },
  institute: { label: "Institute", icon: "grid", chip: "bg-accent-600/95 text-white" },
};

type CampusOrg = {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  logoKey: string | null;
  coverKey: string | null;
  verifiedStatus: string;
  memberRole: string;
  createdAt: Date;
  stats: { members: number; channels: number; classes: number; students: number };
};

function canManageOrg(role: string) {
  return role === "admin" || ["owner", "admin", "manager"].includes(role);
}

export default async function CampusPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; sort?: string }>;
}) {
  const auth = await getAuth();
  if (!auth) redirect("/login?redirect=/campus");

  const { q, type: rawType, sort: rawSort } = await searchParams;
  const query = (q ?? "").trim();
  const type = CAMPUS_TYPES.includes(rawType as CampusType) ? (rawType as CampusType) : undefined;
  const sort: CampusSort = SORTS.some((item) => item.value === rawSort)
    ? (rawSort as CampusSort)
    : "recent";
  const isAdmin = ADMIN_ROLES.includes(auth.user.role);

  const myOrgs = await getUserOrganizations(auth.user.id);

  let organizations: CampusOrg[] = await Promise.all(
    myOrgs.map(async (org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      type: org.type,
      description: org.description,
      logoKey: org.logoKey,
      coverKey: org.coverKey,
      verifiedStatus: org.verifiedStatus,
      memberRole: org.memberRole,
      createdAt: org.createdAt,
      stats: await getOrgStats(org.id),
    })),
  );

  // Admins can see organizations they do not belong to yet (for registration / oversight).
  if (isAdmin) {
    const all = await db.organization.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        description: true,
        logoKey: true,
        coverKey: true,
        verifiedStatus: true,
        createdAt: true,
      },
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

  const totalStudents = organizations.reduce((sum, o) => sum + o.stats.students, 0);
  const totalMembers = organizations.reduce((sum, o) => sum + o.stats.members, 0);
  const totalClasses = organizations.reduce((sum, o) => sum + o.stats.classes, 0);
  const totalChannels = organizations.reduce((sum, o) => sum + o.stats.channels, 0);
  const verifiedCount = organizations.filter((o) => o.verifiedStatus === "verified").length;

  const needle = query.toLowerCase();
  const filtered = organizations.filter((org) => {
    if (type && org.type !== type) return false;
    if (!needle) return true;
    return [org.name, org.slug, org.description ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "name":
        return a.name.localeCompare(b.name);
      case "students":
        return b.stats.students - a.stats.students || a.name.localeCompare(b.name);
      case "classes":
        return b.stats.classes - a.stats.classes || a.name.localeCompare(b.name);
      case "members":
        return b.stats.members - a.stats.members || a.name.localeCompare(b.name);
      default:
        return b.createdAt.getTime() - a.createdAt.getTime() || a.name.localeCompare(b.name);
    }
  });

  const schools = sorted.filter((o) => o.type === "school");
  const institutes = sorted.filter((o) => o.type !== "school");
  const isFiltering = Boolean(query || type);
  const hasFilters = Boolean(query || type || sort !== "recent");

  function filterHref(value?: CampusType) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (value) params.set("type", value);
    if (sort !== "recent") params.set("sort", sort);
    const qs = params.toString();
    return qs ? `/campus?${qs}` : "/campus";
  }

  function sortHref(value: CampusSort) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (type) params.set("type", type);
    if (value !== "recent") params.set("sort", value);
    const qs = params.toString();
    return qs ? `/campus?${qs}` : "/campus";
  }

  function OrgCard({ org }: { org: CampusOrg }) {
    const meta = TYPE_META[org.type === "school" ? "school" : "institute"];
    const logoUrl = org.logoKey ? `/api/media/${org.logoKey}` : null;
    const coverUrl = org.coverKey ? `/api/media/${org.coverKey}` : null;
    const manage = canManageOrg(org.memberRole);

    return (
      <article className="card group relative flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-xl">
        <Link href={`/campus/${org.slug}`} className="flex flex-1 flex-col">
          <div className="relative h-20 overflow-hidden bg-gradient-to-br from-ink-900 via-brand-800 to-accent-700">
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverUrl}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <>
                <div
                  aria-hidden="true"
                  className="absolute -top-8 -right-6 size-28 rounded-full bg-white/10 blur-2xl"
                />
                <div className="absolute inset-0 flex items-center justify-center text-white/60">
                  <Icon name={meta.icon} size={26} />
                </div>
              </>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink-900/45 via-transparent to-transparent" />
            <span
              className={`absolute top-3 left-3 inline-flex items-center gap-1 rounded-chip px-2 py-0.5 text-[9.5px] font-black tracking-[0.1em] uppercase shadow-sm ${meta.chip}`}
            >
              <Icon name={meta.icon} size={10} strokeWidth={2.8} />
              {meta.label}
            </span>
          </div>

          <div className="flex flex-1 flex-col px-4 pb-4">
            <Avatar
              name={org.name}
              src={logoUrl}
              size="lg"
              ring
              className="-mt-6 !rounded-2xl"
            />
            <div className="mt-2 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[15px] font-bold text-ink-900">{org.name}</span>
                {org.verifiedStatus === "verified" ? <VerifiedTick className="size-4" /> : null}
              </div>
              <p className="truncate text-[12px] text-ink-400">
                /campus/{org.slug} · {org.memberRole}
              </p>
            </div>

            {org.description ? (
              <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-ink-600">
                {org.description}
              </p>
            ) : null}

            <div className="mt-auto grid grid-cols-3 gap-1 border-t border-ink-100 pt-2.5 text-[11px] font-semibold text-ink-400">
              <span className="flex items-center gap-1">
                <Icon name="users" size={12} /> {compactNumber(org.stats.members)}
              </span>
              <span className="flex items-center gap-1">
                <Icon name="book" size={12} /> {compactNumber(org.stats.classes)}
              </span>
              <span className="flex items-center gap-1">
                <Icon name="user" size={12} /> {compactNumber(org.stats.students)}
              </span>
            </div>
          </div>
        </Link>

        <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
          {manage ? (
            <Link
              href={`/campus/${org.slug}/manage`}
              aria-label={`Manage ${org.name}`}
              className="flex size-8 items-center justify-center rounded-full border border-white/60 bg-white/90 text-ink-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-brand-700"
            >
              <Icon name="settings" size={14} />
            </Link>
          ) : null}
          <ShareButton
            path={`/campus/${org.slug}`}
            title={`${org.name} · GuruLens Campus`}
            text={`Visit ${org.name} on GuruLens Campus`}
            label="Share campus"
            iconOnly
            className="!h-8 border-white/60 bg-white/90 text-ink-700 shadow-sm backdrop-blur-sm hover:bg-white"
          />
        </div>
      </article>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-6 pb-12 sm:px-6">
      {/* Hero */}
      <section className="animate-fade-up relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink-900 via-brand-800 to-accent-700 px-5 py-7 text-white shadow-xl sm:px-8 sm:py-9">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-12 size-64 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 -left-16 size-64 rounded-full bg-accent-400/20 blur-3xl"
        />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-chip bg-white/15 px-2.5 py-1 text-[10px] font-black tracking-[0.16em] uppercase backdrop-blur-sm">
              <Icon name="book-open" size={11} /> GuruLens Campus
            </span>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
              One campus. Every classroom.
            </h1>
            <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-white/75">
              Manage branches, teachers, classes and channels for your school or institute — with
              one team, one brand and one place to grow.
            </p>
          </div>

          {auth.user.role === "teacher" || isAdmin ? (
            <Link
              href="/campus/create"
              className="inline-flex h-10 flex-none items-center gap-2 rounded-full bg-white px-5 text-[13px] font-bold text-brand-700 shadow-lg transition-transform hover:-translate-y-0.5"
            >
              <Icon name="plus" size={16} /> Register organization
            </Link>
          ) : null}
        </div>

        <form className="relative mt-5 flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 basis-56">
            <Icon
              name="search"
              size={17}
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-400"
            />
            <Input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search your schools and institutes…"
              aria-label="Search campuses"
              className="h-11 border-white/25 bg-white/95 pl-10 text-ink-900 placeholder:text-ink-400"
            />
            {type ? <input type="hidden" name="type" value={type} /> : null}
            {sort !== "recent" ? <input type="hidden" name="sort" value={sort} /> : null}
          </div>
          <button
            type="submit"
            className="inline-flex h-11 flex-none items-center gap-2 rounded-full bg-white px-5 text-[13px] font-bold text-brand-700 shadow-lg transition-transform hover:-translate-y-0.5"
          >
            <Icon name="search" size={15} /> Search
          </button>
        </form>

        <div className="relative mt-5 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-chip bg-white/12 px-3 py-1.5 text-[11.5px] font-bold text-white/90 backdrop-blur-sm">
            <Icon name="grid" size={12} />
            {compactNumber(organizations.length)} campus
            {organizations.length === 1 ? "" : "es"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-chip bg-white/12 px-3 py-1.5 text-[11.5px] font-bold text-white/90 backdrop-blur-sm">
            <Icon name="users" size={12} />
            {compactNumber(totalMembers)} team members
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-chip bg-white/12 px-3 py-1.5 text-[11.5px] font-bold text-white/90 backdrop-blur-sm">
            <Icon name="book-open" size={12} />
            {compactNumber(totalClasses)} classes
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-chip bg-white/12 px-3 py-1.5 text-[11.5px] font-bold text-white/90 backdrop-blur-sm">
            <Icon name="shield-check" size={12} />
            {verifiedCount} verified
          </span>
        </div>
      </section>

      {/* Type filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={filterHref()}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition-colors ${
            type
              ? "border-ink-200 bg-white/80 text-ink-600 hover:border-brand-300 hover:text-brand-700"
              : "border-brand-600 bg-brand-600 text-white shadow-sm"
          }`}
        >
          <Icon name="grid" size={13} /> All
        </Link>
        {CAMPUS_TYPES.map((value) => {
          const meta = TYPE_META[value];
          const active = type === value;
          return (
            <Link
              key={value}
              href={filterHref(value)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition-colors ${
                active
                  ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                  : "border-ink-200 bg-white/80 text-ink-600 hover:border-brand-300 hover:text-brand-700"
              }`}
            >
              <Icon name={meta.icon} size={13} />
              {meta.label}s
            </Link>
          );
        })}
        {hasFilters ? (
          <Link
            href="/campus"
            className="ml-auto inline-flex items-center gap-1 text-[12px] font-bold text-ink-400 transition-colors hover:text-ink-700"
          >
            <Icon name="x" size={12} /> Clear
          </Link>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-black tracking-wide text-ink-400 uppercase">
          <Icon name="sliders" size={12} /> Sort
        </span>
        {SORTS.map((item) => {
          const active = sort === item.value;
          return (
            <Link
              key={item.value}
              href={sortHref(item.value)}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11.5px] font-bold transition-colors ${
                active
                  ? "border-ink-900 bg-ink-900 text-white"
                  : "border-ink-200 bg-white/80 text-ink-600 hover:border-brand-300 hover:text-brand-700"
              }`}
            >
              <Icon name={item.icon} size={11} />
              {item.label}
            </Link>
          );
        })}
        {hasFilters ? (
          <span className="ml-auto text-[11.5px] font-semibold text-ink-400">
            {sorted.length} of {organizations.length} shown
          </span>
        ) : null}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Campuses" value={organizations.length} icon="grid" />
        <Stat label="Team" value={totalMembers} icon="users" />
        <Stat label="Classes" value={totalClasses} icon="book-open" />
        <Stat label="Students" value={totalStudents} icon="user" />
      </div>

      {organizations.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon="book-open"
            title="No campus yet"
            description={
              isAdmin
                ? "Register the first school or institute to start managing campus operations."
                : "Schools and institutes are registered by campus owners. Ask your school admin to add you to their team."
            }
            action={
              isAdmin ? <LinkButton href="/campus/create">Register organization</LinkButton> : undefined
            }
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon="search"
            title="No campuses match"
            description="Try a different name or clear the filters."
            action={
              <Link href="/campus" className="text-sm font-bold text-brand-600 hover:underline">
                Show all campuses
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {schools.length > 0 ? (
            <section>
              <SectionHeader
                title={isFiltering || isAdmin ? "Schools" : "My schools"}
                subtitle={`${schools.length} school${schools.length === 1 ? "" : "s"}`}
                action={
                  totalChannels > 0 ? (
                    <span className="text-[12px] font-semibold text-ink-400">
                      {compactNumber(totalChannels)} campus channels
                    </span>
                  ) : undefined
                }
              />
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
                title={isFiltering || isAdmin ? "Institutes" : "My institutes"}
                subtitle={`${institutes.length} institute${institutes.length === 1 ? "" : "s"}`}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                {institutes.map((org) => (
                  <OrgCard key={org.id} org={org} />
                ))}
              </div>
            </section>
          ) : null}

          {organizations.length > 0 && !isAdmin && schools.length === 0 ? (
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
