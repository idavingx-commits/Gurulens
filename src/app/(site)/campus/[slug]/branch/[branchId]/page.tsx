import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CampusClassCard } from "@/components/campus/class-card";
import { Avatar } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { EmptyState, SectionHeader, Stat } from "@/components/ui/primitives";
import { ShareButton } from "@/components/ui/share-button";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { getOrgAccess, getOrganizationBySlug } from "@/lib/organizations";
import { CampusNav } from "../../campus-nav";

type Props = { params: Promise<{ slug: string; branchId: string }> };

const ROLE_TONE: Record<string, string> = {
  owner: "bg-brand-50 text-brand-700",
  admin: "bg-accent-100 text-accent-700",
  manager: "bg-success-100 text-success-600",
  teacher: "bg-ink-100 text-ink-600",
  staff: "bg-ink-100 text-ink-500",
};

async function getBranch(slug: string, branchId: string) {
  const org = await getOrganizationBySlug(slug);
  if (!org) return null;
  const branch = await db.organizationBranch.findFirst({
    where: { id: branchId, organizationId: org.id },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      isMain: true,
      createdAt: true,
      _count: {
        select: {
          members: { where: { status: "active" } },
          classes: { where: { status: "active" } },
        },
      },
    },
  });
  return branch ? { org, branch } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, branchId } = await params;
  const data = await getBranch(slug, branchId);
  if (!data) return { title: "Branch not found" };
  const { org, branch } = data;
  const imageKey = org.coverKey ?? org.logoKey;
  const imageUrl = imageKey ? `/api/media/${imageKey}` : "/brand/og-default.png";
  const title = `${branch.name} · ${org.name} Campus`;
  return {
    title,
    description: branch.address
      ? `${branch.name} at ${org.name} · ${branch.address}`
      : `${branch.name} at ${org.name} on GuruLens Campus`,
    alternates: { canonical: `/campus/${slug}/branch/${branchId}` },
    openGraph: {
      type: "website",
      title,
      description: `${branch.name} at ${org.name} on GuruLens Campus.`,
      url: `/campus/${slug}/branch/${branchId}`,
      images: [{ url: imageUrl, alt: `${org.name} on GuruLens Campus` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: `${branch.name} at ${org.name} on GuruLens Campus.`,
      images: [imageUrl],
    },
  };
}

export default async function CampusBranchPage({ params }: Props) {
  const auth = await getAuth();
  const { slug, branchId } = await params;
  if (!auth) redirect(`/login?redirect=/campus/${slug}/branch/${branchId}`);

  const data = await getBranch(slug, branchId);
  if (!data) notFound();
  const { org, branch } = data;

  const access = await getOrgAccess(auth.user.id, auth.user.role, org.id);
  if (!access.canView) notFound();

  const [members, classes, students] = await Promise.all([
    db.organizationMember.findMany({
      where: { organizationId: org.id, branchId, status: "active" },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      select: {
        id: true,
        role: true,
        joinedAt: true,
        user: {
          select: {
            name: true,
            avatarKey: true,
            teacherProfile: { select: { handle: true, verifiedStatus: true } },
          },
        },
      },
    }),
    db.class.findMany({
      where: { organizationId: org.id, branchId, status: "active" },
      orderBy: { createdAt: "desc" },
      take: 30,
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
    db.classEnrollment.count({
      where: { class: { organizationId: org.id, branchId }, status: "active" },
    }),
  ]);

  const teachers = members.filter((member) => member.role === "teacher").length;
  const mapQuery = encodeURIComponent(
    [branch.name, branch.address, org.name].filter(Boolean).join(", "),
  );

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

      <CampusNav slug={org.slug} active="overview" canManage={access.canManage} />

      <header className="card mt-6 overflow-hidden">
        <div className="relative h-24 overflow-hidden bg-gradient-to-br from-ink-900 via-brand-800 to-accent-700 sm:h-28">
          <div
            aria-hidden="true"
            className="absolute -top-12 -right-8 size-40 rounded-full bg-white/10 blur-3xl"
          />
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-chip bg-white/15 px-2.5 py-1 text-[10px] font-black tracking-[0.12em] text-white uppercase backdrop-blur-sm">
            <Icon name="location" size={11} /> Branch
          </span>
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
            {branch.isMain ? (
              <span className="inline-flex h-8 items-center rounded-full border border-white/50 bg-white/90 px-3 text-[11px] font-bold text-brand-700 shadow-sm">
                Main branch
              </span>
            ) : null}
            <ShareButton
              path={`/campus/${org.slug}/branch/${branch.id}`}
              title={`${branch.name} · ${org.name}`}
              text={`${branch.name} at ${org.name} on GuruLens`}
              label="Share branch"
              iconOnly
              className="!h-8 border-white/60 bg-white/90 text-ink-700 shadow-sm backdrop-blur-sm hover:bg-white"
            />
          </div>
        </div>

        <div className="px-5 pb-5">
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink-900">{branch.name}</h1>
          <p className="mt-0.5 text-[12px] font-semibold text-ink-400">
            {org.name} · opened {formatDate(branch.createdAt)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] font-semibold text-ink-500">
            {branch.address ? (
              <span className="inline-flex items-center gap-1">
                <Icon name="location" size={13} /> {branch.address}
              </span>
            ) : null}
            {branch.phone ? (
              <a href={`tel:${branch.phone}`} className="inline-flex items-center gap-1 hover:text-brand-600">
                <Icon name="phone" size={13} /> {branch.phone}
              </a>
            ) : null}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-bold text-brand-600 hover:underline"
            >
              <Icon name="external" size={12} /> Open in Maps
            </a>
            {access.canAdminister ? (
              <Link
                href={`/campus/${org.slug}/manage`}
                className="inline-flex items-center gap-1 font-bold text-brand-600 hover:underline"
              >
                <Icon name="settings" size={12} /> Manage branch
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Team" value={members.length} icon="users" />
        <Stat label="Teachers" value={teachers} icon="user" />
        <Stat label="Classes" value={classes.length} icon="book-open" />
        <Stat label="Students" value={students} icon="target" />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <SectionHeader
            title="Classes at this branch"
            subtitle={`${classes.length} active class${classes.length === 1 ? "" : "es"}`}
            action={
              <Link
                href={`/campus/${org.slug}/classes?branch=${branch.id}`}
                className="text-[12.5px] font-bold text-brand-600 hover:underline"
              >
                View all
              </Link>
            }
          />
          {classes.length === 0 ? (
            <EmptyState
              icon="book-open"
              title="No classes here yet"
              description="Classes assigned to this branch will appear here."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {classes.map((cls) => (
                <CampusClassCard key={cls.id} cls={cls} />
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionHeader
            title="Branch team"
            subtitle={`${members.length} active member${members.length === 1 ? "" : "s"}`}
            action={
              access.canAdminister ? (
                <Link
                  href={`/campus/${org.slug}/manage`}
                  className="text-[12px] font-bold text-brand-600 hover:underline"
                >
                  Assign
                </Link>
              ) : undefined
            }
          />
          {members.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink-200 p-4 text-center text-[12.5px] text-ink-400">
              No team members assigned to this branch.
            </p>
          ) : (
            <div className="card divide-y divide-ink-100">
              {members.map((member) => {
                const handle = member.user.teacherProfile?.handle;
                return (
                  <div key={member.id} className="flex items-center gap-2.5 p-3">
                    <Avatar
                      name={member.user.name}
                      src={member.user.avatarKey ? `/api/media/${member.user.avatarKey}` : null}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-bold text-ink-900">
                        {handle ? (
                          <Link href={`/teacher/${handle}`} className="hover:text-brand-700">
                            {member.user.name}
                          </Link>
                        ) : (
                          member.user.name
                        )}
                      </p>
                      <p className="text-[10.5px] font-semibold text-ink-400">
                        joined {formatDate(member.joinedAt)}
                      </p>
                    </div>
                    <span
                      className={`flex-none rounded-chip px-1.5 py-0.5 text-[10px] font-bold capitalize ${
                        ROLE_TONE[member.role] ?? "bg-ink-100 text-ink-500"
                      }`}
                    >
                      {member.role}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <LinkButton
            href={`/campus/${org.slug}/people?branch=${branch.id}`}
            variant="outline"
            className="mt-3 w-full justify-start"
          >
            <Icon name="users" size={15} /> Open branch directory
          </LinkButton>
        </section>
      </div>
    </div>
  );
}
