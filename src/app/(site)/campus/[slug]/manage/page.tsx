import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { LinkButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { InfoNote, SectionHeader, Stat, VerifiedTick } from "@/components/ui/primitives";
import { ShareButton } from "@/components/ui/share-button";
import { getAuth } from "@/lib/auth";
import { getCampusActivity } from "@/lib/campus";
import { db } from "@/lib/db";
import { formatDate, timeAgo } from "@/lib/format";
import { getLmsWorkspaceForOrganization } from "@/lib/lms";
import {
  getOrgAccess,
  getOrgCapacity,
  getOrganizationBySlug,
  orgQuotaDefaults,
} from "@/lib/organizations";
import { getSchoolClasses } from "@/lib/school";
import { CampusNav } from "../campus-nav";
import { RequestOrgVerification } from "../request-verification";
import { LmsClaimCard } from "@/components/lms/LmsClaimCard";
import { CampusDeletionCard } from "@/components/campus/CampusDeletionCard";
import { BranchManager } from "./branch-manager";
import { OrgProfileForm } from "./org-profile-form";
import { QuotaForm } from "./quota-form";
import { SchoolClassManager } from "./school-class-manager";
import { TeamManager } from "./team-manager";
import { TimetableBuilder } from "./timetable-builder";

type Props = { params: Promise<{ slug: string }> };

const ACTIVITY_META: Record<string, { label: string; icon: string }> = {
  "organization.profile.update": { label: "updated the campus profile", icon: "pencil" },
  "organization.quotas.update": { label: "updated plan limits", icon: "sliders" },
  "organization.branch.create": { label: "added a branch", icon: "plus" },
  "organization.branch.update": { label: "updated a branch", icon: "location" },
  "organization.branch.delete": { label: "removed a branch", icon: "trash" },
  "organization.member.add": { label: "added a team member", icon: "user-plus" },
  "organization.member.update": { label: "updated a team member", icon: "users" },
  "organization.member.remove": { label: "removed a team member", icon: "user" },
  "school.class.create": { label: "created a school class", icon: "school" },
  "school.class.update": { label: "updated a school class", icon: "pencil" },
  "school.class.delete": { label: "deleted a school class", icon: "trash" },
  "school.timetable.save": { label: "saved a class timetable", icon: "calendar" },
  "school.join.request": { label: "requested school membership", icon: "user-plus" },
};

export const metadata: Metadata = {
  title: "Manage campus",
  robots: { index: false, follow: false },
};

export default async function CampusManagePage({ params }: Props) {
  const auth = await getAuth();
  const { slug } = await params;
  if (!auth) redirect(`/login?redirect=/campus/${slug}/manage`);

  const org = await getOrganizationBySlug(slug);
  if (!org) notFound();

  const access = await getOrgAccess(auth.user.id, auth.user.role, org.id);
  if (!access.canManage) notFound();

  const [capacity, branches, members, pendingRequest, activity, schoolClasses] = await Promise.all([
    getOrgCapacity(org.id),
    db.organizationBranch.findMany({
      where: { organizationId: org.id },
      orderBy: [{ isMain: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        isMain: true,
        _count: { select: { members: true, classes: true } },
      },
    }),
    db.organizationMember.findMany({
      where: { organizationId: org.id, status: { not: "removed" } },
      orderBy: [{ status: "asc" }, { joinedAt: "asc" }],
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
          select: { id: true, name: true, email: true, avatarKey: true, role: true },
        },
      },
    }),
    db.organizationVerificationRequest.findFirst({
      where: { organizationId: org.id, status: { in: ["pending", "in_review"] } },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, actionReason: true, createdAt: true },
    }),
    getCampusActivity(org.id, 8),
    org.type === "school" ? getSchoolClasses(org.id) : Promise.resolve([]),
  ]);

  const logoUrl = org.logoKey ? `/api/media/${org.logoKey}` : null;
  const coverUrl = org.coverKey ? `/api/media/${org.coverKey}` : null;
  const canEdit = access.canAdminister;

  const existingWorkspace = await getLmsWorkspaceForOrganization(org.id);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-6 pb-12 sm:px-6">
      <div className="mb-1">
        <Link
          href={`/campus/${org.slug}`}
          className="inline-flex items-center gap-1 text-[12px] font-bold text-ink-400 transition-colors hover:text-brand-600"
        >
          <Icon name="arrow-left" size={13} /> Back to campus
        </Link>
      </div>

      <CampusNav slug={org.slug} active="manage" canManage={access.canManage} />

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
              Manage {org.name}
            </h1>
            {org.verifiedStatus === "verified" ? <VerifiedTick /> : null}
            <span className="rounded-chip bg-ink-100 px-2.5 py-1 text-[11px] font-bold capitalize text-ink-500">
              {org.type}
            </span>
            <span className="rounded-chip bg-brand-50 px-2.5 py-1 text-[11px] font-bold capitalize text-brand-700">
              {access.role === "admin" ? "GuruLens admin" : access.role}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-ink-500">
            Branding, branches, team roles and capacity for this campus.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ShareButton
            path={`/campus/${org.slug}`}
            title={`${org.name} · GuruLens Campus`}
            text={`Visit ${org.name} on GuruLens Campus`}
            label="Share campus"
          />
          <LinkButton href={`/campus/${org.slug}`} variant="outline" size="sm">
            <Icon name="external" size={14} /> View campus
          </LinkButton>
        </div>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Team" value={capacity.usage.members} icon="users" />
        <Stat label="Teachers" value={capacity.usage.teachers} icon="user" />
        <Stat label="Channels" value={capacity.usage.channels} icon="radio" />
        <Stat label="Classes" value={capacity.usage.classes} icon="book-open" />
      </div>

      {!canEdit ? (
        <InfoNote icon="info" className="mb-5">
          You can update branding and the campus profile as a manager. Only owners and admins can
          change branches, plan limits and the team.
        </InfoNote>
      ) : null}

      <div className="space-y-6">
        <OrgProfileForm
          organizationId={org.id}
          slug={org.slug}
          initial={{
            name: org.name,
            nameSi: org.nameSi ?? "",
            description: org.description ?? "",
            website: org.website ?? "",
            phone: org.phone ?? "",
            email: org.email ?? "",
            address: org.address ?? "",
          }}
          logoUrl={logoUrl}
          coverUrl={coverUrl}
          canEdit={access.canManage}
        />

        <QuotaForm
          organizationId={org.id}
          initial={{
            teacherQuota: capacity.limits.teacherQuota,
            channelQuota: capacity.limits.channelQuota,
            classQuota: capacity.limits.classQuota,
          }}
          defaults={orgQuotaDefaults(org.type)}
          usage={{
            teachers: capacity.usage.teachers,
            channels: capacity.usage.channels,
            classes: capacity.usage.classes,
            students: capacity.usage.students,
          }}
          canEdit={canEdit}
        />

        <BranchManager
          organizationId={org.id}
          slug={org.slug}
          branches={branches.map((branch) => ({
            id: branch.id,
            name: branch.name,
            address: branch.address,
            phone: branch.phone,
            isMain: branch.isMain,
            memberCount: branch._count.members,
            classCount: branch._count.classes,
          }))}
          canEdit={canEdit}
        />

        {org.type === "school" ? (
          <>
            <SchoolClassManager
              organizationId={org.id}
              classes={schoolClasses.map((c) => ({
                id: c.id,
                name: c.name,
                section: c.section,
                room: c.room,
                students: c._count.members,
              }))}
              canEdit={canEdit}
            />
            {access.canManage ? (
              <TimetableBuilder
                organizationId={org.id}
                classes={schoolClasses.map((c) => ({ id: c.id, name: c.name, room: c.room }))}
              />
            ) : null}
          </>
        ) : null}

        <TeamManager
          organizationId={org.id}
          members={members.map((member) => ({
            id: member.id,
            role: member.role,
            status: member.status,
            joinedLabel: formatDate(member.joinedAt),
            branch: member.branch,
            admissionNo: member.admissionNo,
            indexNo: member.indexNo,
            staffId: member.staffId,
            schoolClass: member.schoolClass,
            user: member.user,
          }))}
          branches={branches.map((branch) => ({ id: branch.id, name: branch.name }))}
          schoolClasses={schoolClasses.map((c) => ({ id: c.id, name: c.name }))}
          canEdit={canEdit}
        />

        <section className="card p-5">
          <SectionHeader
            title="Recent activity"
            subtitle="Audited changes made by your campus team"
          />
          {activity.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink-200 p-4 text-center text-[12.5px] text-ink-400">
              No activity recorded yet. Profile, branch and team changes will appear here.
            </p>
          ) : (
            <ol className="relative space-y-3 border-l border-ink-100 pl-4">
              {activity.map((item) => {
                const meta = ACTIVITY_META[item.action] ?? {
                  label: item.action.replace(/\./g, " "),
                  icon: "info",
                };
                return (
                  <li key={item.id} className="relative">
                    <span className="absolute top-0.5 -left-[25px] flex size-5 items-center justify-center rounded-full bg-white ring-1 ring-ink-100">
                      <Icon name={meta.icon} size={11} className="text-brand-600" />
                    </span>
                    <p className="text-[12.5px] text-ink-700">
                      <span className="font-bold text-ink-900">{item.actor.name}</span> {meta.label}
                      <span className="ml-2 text-[11px] font-semibold text-ink-400">
                        {timeAgo(item.createdAt)}
                      </span>
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <LmsClaimCard
          organizationId={org.id}
          organizationName={org.name}
          existing={existingWorkspace ? { subdomain: existingWorkspace.subdomain } : null}
        />

        <section className="card p-5">
          <SectionHeader title="Verification" subtitle="Trust badge for your campus" />
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
                verified {timeAgo(org.verifiedAt)}
              </span>
            ) : null}
          </div>

          {pendingRequest ? (
            <InfoNote icon="clock" className="mt-3">
              Your verification request is <span className="font-bold">{pendingRequest.status}</span>{" "}
              (submitted {timeAgo(pendingRequest.createdAt)}). We&apos;ll notify the team when a
              decision is made.
              {pendingRequest.actionReason ? (
                <span className="mt-1 block text-ink-500">{pendingRequest.actionReason}</span>
              ) : null}
            </InfoNote>
          ) : org.verifiedStatus === "verified" ? (
            <p className="mt-2 text-[12px] leading-relaxed text-ink-500">
              This organization has been verified by the GuruLens team.
            </p>
          ) : canEdit ? (
            <div className="mt-4 border-t border-ink-100 pt-4">
              <p className="mb-3 text-[12px] leading-relaxed text-ink-500">
                Submit a short note about the documents you can provide (registration certificate,
                ministry approval, principal&apos;s letter). A moderator will review it.
              </p>
              <RequestOrgVerification organizationId={org.id} />
            </div>
          ) : (
            <p className="mt-2 text-[12px] leading-relaxed text-ink-500">
              The campus owner or admin can request verification.
            </p>
          )}
        </section>

        {canEdit ? (
          <CampusDeletionCard
            organizationId={org.id}
            organizationName={org.name}
            memberCount={members.length}
          />
        ) : null}
      </div>
    </div>
  );
}
