import { BadgesPanel, type BadgeInfo, type GrantRow } from "@/components/admin/BadgesPanel";
import { SectionHeader } from "@/components/ui/primitives";
import { BADGE_KEYS } from "@/lib/constants";
import { db } from "@/lib/db";

const BADGE_META: Array<{ key: string; name: string; description: string; kind: string }> = [
  {
    key: BADGE_KEYS.verified,
    name: "Verified Teacher",
    description: "Identity and qualifications confirmed by the GuruLens team.",
    kind: "verification",
  },
  {
    key: BADGE_KEYS.highlyRated,
    name: "Highly Rated",
    description: "Consistently excellent reviews from verified students.",
    kind: "achievement",
  },
  {
    key: BADGE_KEYS.activeEducator,
    name: "Active Educator",
    description: "Regularly publishes lessons, reels and quizzes.",
    kind: "achievement",
  },
  {
    key: BADGE_KEYS.communityContributor,
    name: "Community Contributor",
    description: "Goes above and beyond helping students on GuruLens.",
    kind: "achievement",
  },
];

export default async function AdminBadgesPage() {
  const [dbBadges, grants] = await Promise.all([
    db.badge.findMany({
      select: {
        key: true,
        name: true,
        _count: { select: { grants: { where: { active: true } } } },
      },
    }),
    db.badgeGrant.findMany({
      where: { active: true },
      orderBy: { grantedAt: "desc" },
      take: 25,
      select: {
        id: true,
        reason: true,
        grantedAt: true,
        badge: { select: { key: true, name: true } },
        user: { select: { name: true, email: true, avatarKey: true } },
      },
    }),
  ]);

  const dbCounts = new Map(dbBadges.map((b) => [b.key, b._count.grants]));

  // Show every known badge, merging names seeded in the database when present.
  const badges: BadgeInfo[] = BADGE_META.map((meta) => {
    const dbBadge = dbBadges.find((b) => b.key === meta.key);
    return {
      ...meta,
      name: dbBadge?.name ?? meta.name,
      activeCount: dbCounts.get(meta.key) ?? 0,
    };
  });

  const grantRows: GrantRow[] = grants.map((g) => ({
    id: g.id,
    badgeKey: g.badge.key,
    badgeName: g.badge.name,
    userName: g.user.name,
    userEmail: g.user.email,
    userAvatarKey: g.user.avatarKey,
    reason: g.reason,
    grantedAt: g.grantedAt.toISOString(),
  }));

  return (
    <div>
      <SectionHeader
        title="Badges"
        subtitle="Recognition shown on teacher profiles and cards."
      />
      <BadgesPanel badges={badges} grants={grantRows} />
    </div>
  );
}
