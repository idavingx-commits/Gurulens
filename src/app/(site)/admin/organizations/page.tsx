import Link from "next/link";

import { VerificationDecisions, type DecisionRow } from "@/components/admin/VerificationDecisions";
import { Icon } from "@/components/ui/icons";
import { SectionHeader, Stat } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/format";

export default async function AdminOrganizationsPage() {
  const [requests, organizations, pendingCount, verifiedCount] = await Promise.all([
    db.organizationVerificationRequest.findMany({
      where: { status: { in: ["pending", "in_review"] } },
      orderBy: { createdAt: "asc" },
      take: 50,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            verifiedStatus: true,
            createdAt: true,
            members: {
              where: { role: "owner", status: "active" },
              take: 1,
              select: { user: { select: { name: true, avatarKey: true } } },
            },
            _count: {
              select: {
                members: true,
                branches: true,
                classes: true,
                channels: true,
              },
            },
          },
        },
      },
    }),
    db.organization.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        verifiedStatus: true,
        createdAt: true,
        _count: { select: { members: true, branches: true, classes: true, channels: true } },
      },
    }),
    db.organizationVerificationRequest.count({ where: { status: { in: ["pending", "in_review"] } } }),
    db.organization.count({ where: { verifiedStatus: "verified" } }),
  ]);

  const rows: DecisionRow[] = requests.map((r) => {
    const evidenceKeys: string[] = r.evidenceKeys ? JSON.parse(r.evidenceKeys) : [];
    const owner = r.organization.members[0]?.user;
    return {
      id: r.id,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      title: r.organization.name,
      subtitle: `${r.organization.type === "school" ? "School" : "Institute"} · /campus/${r.organization.slug}`,
      href: `/campus/${r.organization.slug}`,
      avatarName: r.organization.name,
      avatarSrc: null,
      meta: [
        { label: "Type", value: r.organization.type === "school" ? "School" : "Institute" },
        { label: "Owner", value: owner?.name ?? "Unknown" },
        { label: "Members", value: String(r.organization._count.members) },
        { label: "Branches", value: String(r.organization._count.branches) },
        { label: "Classes", value: String(r.organization._count.classes) },
        { label: "Channels", value: String(r.organization._count.channels) },
      ],
      evidenceNote: r.evidenceNote,
      evidenceKeys,
    };
  });

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Organizations" value={organizations.length} icon="grid" />
        <Stat label="Pending review" value={pendingCount} icon="clock" tone={pendingCount > 0 ? "warn" : "default"} />
        <Stat label="Verified" value={verifiedCount} icon="shield-check" />
        <Stat label="Schools" value={organizations.filter((o) => o.type === "school").length} icon="book-open" />
      </div>

      <section>
        <SectionHeader
          title="Organization verification"
          subtitle={`${rows.length} open request${rows.length === 1 ? "" : "s"} · oldest first`}
        />
        <VerificationDecisions rows={rows} endpoint="/api/admin/organizations" entityLabel="organization" />
      </section>

      <section>
        <SectionHeader title="All organizations" subtitle="Institutes and schools on GuruLens" />
        {organizations.length === 0 ? (
          <p className="text-[13px] text-ink-400">No organizations registered yet.</p>
        ) : (
          <div className="card divide-y divide-ink-100">
            {organizations.map((org) => (
              <div key={org.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon name={org.type === "school" ? "book-open" : "grid"} size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/campus/${org.slug}`} className="truncate font-bold text-ink-900 hover:text-brand-600">
                      {org.name}
                    </Link>
                    <span className="rounded-chip bg-ink-100 px-2 py-0.5 text-[10.5px] font-bold capitalize text-ink-500">
                      {org.type}
                    </span>
                    <span
                      className={
                        org.verifiedStatus === "verified"
                          ? "rounded-chip bg-success-100 px-2 py-0.5 text-[10.5px] font-bold text-success-600"
                          : "rounded-chip bg-ink-100 px-2 py-0.5 text-[10.5px] font-bold capitalize text-ink-500"
                      }
                    >
                      {org.verifiedStatus.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12px] font-semibold text-ink-400">
                    {org._count.members} members · {org._count.branches} branches · {org._count.classes} classes ·{" "}
                    {org._count.channels} channels · joined {timeAgo(org.createdAt)}
                  </p>
                </div>
                <Icon name="chevron-right" size={18} className="flex-none text-ink-300" />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
