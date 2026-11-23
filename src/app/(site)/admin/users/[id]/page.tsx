import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { SUPER_ADMIN_ROLES } from "@/lib/constants";
import { db } from "@/lib/db";
import { getUserSubscription } from "@/lib/subscriptions";
import { UserDetailPanel, type UserDetail } from "./user-detail-panel";

type Props = { params: Promise<{ id: string }> };

export const metadata = { title: "User detail · Admin" };

export default async function AdminUserDetailPage({ params }: Props) {
  const viewer = await getCurrentUser();
  if (!viewer) redirect("/login?next=/admin/users");
  if (!SUPER_ADMIN_ROLES.includes(viewer.role)) redirect("/admin/users");

  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    include: {
      teacherProfile: {
        select: { handle: true, verifiedStatus: true, consentPublic: true, mode: true },
      },
    },
  });
  if (!user) notFound();

  const [
    posts,
    channels,
    classes,
    commentCount,
    reviewCount,
    mediaCount,
    enrollmentCount,
    subscription,
    history,
    sessionCount,
    sessions,
    audit,
    plans,
    memberships,
  ] = await Promise.all([
    db.post.findMany({
      where: { authorId: id },
      orderBy: { publishedAt: "desc" },
      take: 100,
      select: {
        id: true,
        type: true,
        title: true,
        text: true,
        moderationStatus: true,
        visibility: true,
        likeCount: true,
        commentCount: true,
        viewCount: true,
        publishedAt: true,
      },
    }),
    db.channel.findMany({
      where: { ownerId: id, ownerType: "user" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        verifiedStatus: true,
        followerCount: true,
        postCount: true,
        isActive: true,
      },
    }),
    db.class.findMany({
      where: { teacherId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        mode: true,
        _count: { select: { enrollments: true } },
      },
    }),
    db.comment.count({ where: { authorId: id } }),
    db.review.count({ where: { authorId: id } }),
    db.media.count({ where: { ownerId: id } }),
    db.classEnrollment.count({ where: { studentId: id } }),
    getUserSubscription(id),
    db.userSubscription.findMany({
      where: { userId: id },
      include: { plan: { select: { name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    db.session.count({ where: { userId: id } }),
    db.session.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, ip: true, userAgent: true, createdAt: true, expiresAt: true },
    }),
    db.auditLog.findMany({
      where: { OR: [{ actorId: id }, { targetRef: id }] },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        action: true,
        targetRef: true,
        meta: true,
        createdAt: true,
        actor: { select: { name: true } },
      },
    }),
    db.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { name: true, slug: true, priceLkr: true },
    }),
    db.organizationMember.findMany({
      where: { userId: id },
      include: { organization: { select: { name: true, slug: true, type: true } } },
      orderBy: { joinedAt: "desc" },
    }),
  ]);

  const detail: UserDetail = {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      avatarKey: user.avatarKey,
      emailVerified: user.emailVerified,
      mfaEnabled: user.mfaEnabled,
      createdAt: user.createdAt.toISOString(),
      dateOfBirth: user.dateOfBirth?.toISOString() ?? null,
      handle: user.teacherProfile?.handle ?? null,
      teacherVerified: user.teacherProfile?.verifiedStatus ?? null,
    },
    posts: posts.map((p) => ({
      ...p,
      publishedAt: p.publishedAt.toISOString(),
    })),
    channels,
    classes: classes.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      mode: c.mode,
      students: c._count.enrollments,
    })),
    counts: {
      posts: posts.length,
      comments: commentCount,
      reviews: reviewCount,
      media: mediaCount,
      enrollments: enrollmentCount,
      channels: channels.length,
      classes: classes.length,
      sessions: sessionCount,
    },
    subscription: {
      planName: subscription.plan?.name ?? "Free",
      planSlug: (subscription.plan as { slug?: string } | null)?.slug ?? "free",
      status: subscription.status,
      expiresAt:
        "expiresAt" in subscription && subscription.expiresAt
          ? subscription.expiresAt.toISOString()
          : null,
    },
    history: history.map((h) => ({
      id: h.id,
      planName: h.plan.name,
      status: h.status,
      createdAt: h.createdAt.toISOString(),
      expiresAt: h.expiresAt?.toISOString() ?? null,
    })),
    sessions: sessions.map((s) => ({
      id: s.id,
      ip: s.ip,
      userAgent: s.userAgent,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
    })),
    audit: audit.map((a) => ({
      id: a.id,
      action: a.action,
      targetRef: a.targetRef,
      meta: a.meta,
      actorName: a.actor.name,
      createdAt: a.createdAt.toISOString(),
    })),
    plans,
    memberships: memberships.map((m) => ({
      id: m.id,
      role: m.role,
      status: m.status,
      orgName: m.organization.name,
      orgSlug: m.organization.slug,
      orgType: m.organization.type,
    })),
  };

  return <UserDetailPanel detail={detail} />;
}
