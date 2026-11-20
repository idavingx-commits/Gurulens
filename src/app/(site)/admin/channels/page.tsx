import Link from "next/link";

import { VerificationDecisions, type DecisionRow } from "@/components/admin/VerificationDecisions";
import { Icon } from "@/components/ui/icons";
import { SectionHeader, Stat } from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { compactNumber, timeAgo } from "@/lib/format";

export default async function AdminChannelsPage() {
  const [requests, channels, pendingCount, verifiedCount] = await Promise.all([
    db.channelVerificationRequest.findMany({
      where: { status: { in: ["pending", "in_review"] } },
      orderBy: { createdAt: "asc" },
      take: 50,
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            ownerId: true,
            ownerType: true,
            followerCount: true,
            postCount: true,
            verifiedStatus: true,
            createdAt: true,
          },
        },
      },
    }),
    db.channel.findMany({
      where: { isActive: true },
      orderBy: { followerCount: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        visibility: true,
        verifiedStatus: true,
        followerCount: true,
        postCount: true,
        createdAt: true,
      },
    }),
    db.channelVerificationRequest.count({ where: { status: { in: ["pending", "in_review"] } } }),
    db.channel.count({ where: { verifiedStatus: "verified", isActive: true } }),
  ]);

  // Resolve owner names for the request cards (user or organization).
  const userIds = requests.filter((r) => r.channel.ownerType === "user").map((r) => r.channel.ownerId);
  const orgIds = requests.filter((r) => r.channel.ownerType !== "user").map((r) => r.channel.ownerId);
  const [users, orgs] = await Promise.all([
    userIds.length > 0
      ? db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, avatarKey: true } })
      : Promise.resolve([]),
    orgIds.length > 0
      ? db.organization.findMany({ where: { id: { in: orgIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
  ]);
  const userMap = new Map(users.map((u) => [u.id, u]));
  const orgMap = new Map(orgs.map((o) => [o.id, o]));

  const rows: DecisionRow[] = requests.map((r) => {
    const evidenceKeys: string[] = r.evidenceKeys ? JSON.parse(r.evidenceKeys) : [];
    const owner = r.channel.ownerType === "user" ? userMap.get(r.channel.ownerId) : orgMap.get(r.channel.ownerId);
    return {
      id: r.id,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      title: r.channel.name,
      subtitle: `@${r.channel.slug} · owned by ${owner?.name ?? "unknown"}`,
      href: `/channel/${r.channel.slug}`,
      avatarName: r.channel.name,
      avatarSrc: null,
      meta: [
        { label: "Owner type", value: r.channel.ownerType === "user" ? "Teacher" : "Organization" },
        { label: "Owner", value: owner?.name ?? "Unknown" },
        { label: "Followers", value: compactNumber(r.channel.followerCount) },
        { label: "Posts", value: compactNumber(r.channel.postCount) },
      ],
      evidenceNote: r.evidenceNote,
      evidenceKeys,
    };
  });

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Active channels" value={channels.length} icon="radio" />
        <Stat label="Pending review" value={pendingCount} icon="clock" tone={pendingCount > 0 ? "warn" : "default"} />
        <Stat label="Verified" value={verifiedCount} icon="shield-check" />
        <Stat
          label="Reach"
          value={compactNumber(channels.reduce((sum, c) => sum + c.followerCount, 0))}
          icon="users"
        />
      </div>

      <section>
        <SectionHeader
          title="Channel verification"
          subtitle={`${rows.length} open request${rows.length === 1 ? "" : "s"} · oldest first`}
        />
        <VerificationDecisions rows={rows} endpoint="/api/admin/channels" entityLabel="channel" />
      </section>

      <section>
        <SectionHeader title="Top channels" subtitle="By follower count" />
        {channels.length === 0 ? (
          <p className="text-[13px] text-ink-400">No channels created yet.</p>
        ) : (
          <div className="card divide-y divide-ink-100">
            {channels.map((ch) => (
              <div key={ch.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-accent-100 text-accent-700">
                  <Icon name="radio" size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/channel/${ch.slug}`} className="truncate font-bold text-ink-900 hover:text-brand-600">
                      {ch.name}
                    </Link>
                    <span className="rounded-chip bg-ink-100 px-2 py-0.5 text-[10.5px] font-bold capitalize text-ink-500">
                      {ch.type}
                    </span>
                    {ch.verifiedStatus === "verified" ? (
                      <span className="rounded-chip bg-success-100 px-2 py-0.5 text-[10.5px] font-bold text-success-600">
                        verified
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[12px] font-semibold text-ink-400">
                    {compactNumber(ch.followerCount)} followers · {compactNumber(ch.postCount)} posts ·{" "}
                    {ch.visibility} · created {timeAgo(ch.createdAt)}
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
