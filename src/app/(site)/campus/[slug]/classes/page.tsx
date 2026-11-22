import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";

import { CampusClassCard } from "@/components/campus/class-card";
import { LinkButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { EmptyState, SectionHeader, Stat } from "@/components/ui/primitives";
import { ShareButton } from "@/components/ui/share-button";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { compactNumber } from "@/lib/format";
import { getOrgAccess, getOrganizationBySlug } from "@/lib/organizations";
import { CampusNav } from "../campus-nav";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; branch?: string; status?: string }>;
};

const STATUSES = ["all", "active", "archived", "draft"] as const;
type StatusFilter = (typeof STATUSES)[number];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);
  if (!org) return { title: "Campus not found" };
  const imageKey = org.coverKey ?? org.logoKey;
  const imageUrl = imageKey ? `/api/media/${imageKey}` : "/brand/og-default.png";
  return {
    title: `${org.name} classes · Campus`,
    description: `Classes, teachers and enrolment at ${org.name} on GuruLens Campus.`,
    alternates: { canonical: `/campus/${slug}/classes` },
    openGraph: {
      type: "website",
      title: `${org.name} classes · GuruLens Campus`,
      description: `Browse classes at ${org.name}.`,
      url: `/campus/${slug}/classes`,
      images: [{ url: imageUrl, alt: `${org.name} on GuruLens Campus` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${org.name} classes · GuruLens Campus`,
      description: `Browse classes at ${org.name}.`,
      images: [imageUrl],
    },
  };
}

export default async function CampusClassesPage({ params, searchParams }: Props) {
  const auth = await getAuth();
  const { slug } = await params;
  if (!auth) redirect(`/login?redirect=/campus/${slug}/classes`);

  const org = await getOrganizationBySlug(slug);
  if (!org) notFound();
  const campusSlug = org.slug;

  const access = await getOrgAccess(auth.user.id, auth.user.role, org.id);
  if (!access.canView) notFound();

  const query = await searchParams;
  const q = (query.q ?? "").trim();
  const status = STATUSES.includes(query.status as StatusFilter)
    ? (query.status as StatusFilter)
    : "all";
  const branches = org.branches;
  const branchId = branches.some((branch) => branch.id === query.branch) ? query.branch : undefined;

  const where: Prisma.ClassWhereInput = {
    organizationId: org.id,
    ...(branchId ? { branchId } : {}),
    ...(status !== "all" ? { status } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { teacher: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [classes, statusCounts] = await Promise.all([
    db.class.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 60,
      select: {
        id: true,
        name: true,
        description: true,
        coverKey: true,
        mode: true,
        status: true,
        branch: { select: { id: true, name: true } },
        teacher: {
          select: {
            name: true,
            avatarKey: true,
            teacherProfile: { select: { handle: true } },
          },
        },
        _count: {
          select: {
            enrollments: { where: { status: "active" } },
            sessions: true,
          },
        },
      },
    }),
    db.class.groupBy({
      by: ["status"],
      where: { organizationId: org.id },
      _count: { _all: true },
    }),
  ]);

  const counts = new Map(statusCounts.map((row) => [row.status, row._count._all]));
  const total = statusCounts.reduce((sum, row) => sum + row._count._all, 0);
  const studentTotal = classes.reduce((sum, cls) => sum + cls._count.enrollments, 0);
  const sessionTotal = classes.reduce((sum, cls) => sum + cls._count.sessions, 0);

  function href(next: { q?: string; branch?: string; status?: string }) {
    const params = new URLSearchParams();
    const nextQuery = next.q ?? q;
    const nextBranch = next.branch !== undefined ? next.branch : branchId;
    const nextStatus = next.status ?? status;
    if (nextQuery) params.set("q", nextQuery);
    if (nextBranch) params.set("branch", nextBranch);
    if (nextStatus !== "all") params.set("status", nextStatus);
    const qs = params.toString();
    return qs ? `/campus/${campusSlug}/classes?${qs}` : `/campus/${campusSlug}/classes`;
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

      <CampusNav slug={org.slug} active="classes" canManage={access.canManage} />

      <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Classes</h1>
          <p className="mt-1 text-[13px] text-ink-500">
            Every class running under {org.name}, with teachers, branches and enrolment.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ShareButton
            path={`/campus/${org.slug}/classes`}
            title={`${org.name} classes · GuruLens Campus`}
            text={`Browse classes at ${org.name} on GuruLens`}
            label="Share classes"
          />
          <LinkButton href={`/campus/${org.slug}`} variant="outline" size="sm">
            <Icon name="grid" size={14} /> Overview
          </LinkButton>
        </div>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Classes" value={compactNumber(total)} icon="book-open" />
        <Stat label="Active" value={compactNumber(counts.get("active") ?? 0)} icon="check-circle" />
        <Stat label="Students" value={compactNumber(studentTotal)} icon="users" />
        <Stat label="Sessions" value={compactNumber(sessionTotal)} icon="calendar" />
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
            placeholder="Search classes or teachers…"
            aria-label="Search campus classes"
            className="h-10 pl-10"
          />
        </div>
        {branchId ? <input type="hidden" name="branch" value={branchId} /> : null}
        {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
        <button
          type="submit"
          className="inline-flex h-10 flex-none items-center gap-2 rounded-full bg-brand-600 px-4 text-[12.5px] font-bold text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          <Icon name="search" size={14} /> Search
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {STATUSES.map((value) => {
          const active = status === value;
          return (
            <Link
              key={value}
              href={href({ status: value })}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-bold capitalize transition-colors ${
                active
                  ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                  : "border-ink-200 bg-white/80 text-ink-600 hover:border-brand-300 hover:text-brand-700"
              }`}
            >
              {value === "all" ? "All classes" : value}
              <span
                className={`rounded-chip px-1.5 py-0.5 text-[10px] font-black ${
                  active ? "bg-white/20 text-white" : "bg-ink-100 text-ink-500"
                }`}
              >
                {value === "all" ? total : (counts.get(value) ?? 0)}
              </span>
            </Link>
          );
        })}
        {branches.length > 1 ? (
          <span className="ml-auto flex flex-wrap items-center gap-2">
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
          </span>
        ) : null}
      </div>

      {(q || branchId || status !== "all") && (
        <div className="mt-4 flex items-center gap-2 text-[12px] font-semibold text-ink-400">
          <span>
            {classes.length} result{classes.length === 1 ? "" : "s"}
          </span>
          <Link href={`/campus/${org.slug}/classes`} className="font-bold text-brand-600 hover:underline">
            Clear filters
          </Link>
        </div>
      )}

      <SectionHeader
        className="mt-7"
        title="Campus classes"
        subtitle={`${classes.length} class${classes.length === 1 ? "" : "es"} shown`}
        action={
          access.canManage ? (
            <Link href="/classhub" className="text-[12.5px] font-bold text-brand-600 hover:underline">
              ClassHub
            </Link>
          ) : undefined
        }
      />

      {classes.length === 0 ? (
        <EmptyState
          icon="book-open"
          title="No classes match"
          description={
            q || branchId || status !== "all"
              ? "Try a different search or clear the filters."
              : "Classes created by campus teachers will appear here."
          }
          action={
            q || branchId || status !== "all" ? (
              <LinkButton href={`/campus/${org.slug}/classes`} variant="outline">
                Clear filters
              </LinkButton>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => (
            <CampusClassCard key={cls.id} cls={cls} />
          ))}
        </div>
      )}
    </div>
  );
}
