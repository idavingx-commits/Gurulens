import { Avatar } from "@/components/ui/avatar";
import { CodeManager, type CodeRow } from "@/components/studio/CodeManager";
import { TierManager, type TierRow } from "@/components/studio/TierManager";
import { EmptyState, SectionHeader } from "@/components/ui/primitives";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { compactNumber } from "@/lib/format";

export default async function StudioAudiencePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [codes, tiers, followers, followerTotal] = await Promise.all([
    db.enrollmentCode.findMany({
      where: { teacherId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        code: true,
        label: true,
        maxUses: true,
        uses: true,
        expiresAt: true,
        _count: { select: { eligibilities: true } },
      },
    }),
    db.membershipTier.findMany({
      where: { teacherId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        priceLkr: true,
        perks: true,
        active: true,
        _count: { select: { members: { where: { status: "active" } } } },
      },
    }),
    db.follow.findMany({
      where: { teacherId: user.id },
      orderBy: { createdAt: "desc" },
      take: 24,
      select: {
        follower: { select: { id: true, name: true, avatarKey: true, role: true } },
      },
    }),
    db.follow.count({ where: { teacherId: user.id } }),
  ]);

  const codeRows: CodeRow[] = codes.map((c) => ({
    id: c.id,
    code: c.code,
    label: c.label,
    maxUses: c.maxUses,
    uses: c.uses,
    expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
    claimed: c._count.eligibilities,
  }));

  const tierRows: TierRow[] = tiers.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    priceLkr: t.priceLkr,
    perks: t.perks ? (JSON.parse(t.perks) as string[]) : [],
    active: t.active,
    memberCount: t._count.members,
  }));

  return (
    <div className="space-y-10">
      <section>
        <SectionHeader
          title="Enrollment codes"
          subtitle="Verify real students, then let them review your classes."
        />
        <CodeManager codes={codeRows} />
      </section>

      <section>
        <SectionHeader
          title="Supporters"
          subtitle="Membership tiers gate your supporters-only posts."
        />
        <TierManager tiers={tierRows} />
      </section>

      <section>
        <SectionHeader
          title="Followers"
          subtitle={`${compactNumber(followerTotal)} student${followerTotal === 1 ? "" : "s"} following you`}
        />
        {followers.length > 0 ? (
          <div className="flex flex-wrap gap-2.5">
            {followers.map(({ follower }) => (
              <div
                key={follower.id}
                className="card flex items-center gap-2.5 px-3.5 py-2.5"
                title={`${follower.name}${follower.role === "teacher" ? " · teacher" : ""}`}
              >
                <Avatar
                  name={follower.name}
                  src={follower.avatarKey ? `/api/media/${follower.avatarKey}` : null}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="max-w-[160px] truncate text-[12.5px] font-bold text-ink-800">
                    {follower.name}
                  </p>
                  <p className="text-[10.5px] font-semibold tracking-wide text-ink-400 uppercase">
                    {follower.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="users"
            title="No followers yet"
            description="Publish lessons and reels regularly — students who follow you see every post in their feed."
          />
        )}
      </section>
    </div>
  );
}
