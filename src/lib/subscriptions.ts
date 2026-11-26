/**
 * Subscription management utilities
 * Handles plans, subscriptions, and feature entitlements
 */

import { db } from "./db";

export type PlanType = "free" | "teacher_pro" | "institute" | "institute_plus" | "campus_pilot" | "campus_pro";
export type SubscriptionStatus = "active" | "cancelled" | "expired" | "trial" | "suspended";

export interface PlanLimits {
  channels: number;      // -1 for unlimited
  classes: number;       // -1 for unlimited
  storage_mb: number;
  students_per_class?: number;
  teachers?: number;
  branches?: number;
  students?: number;
  grades?: number;
  lms_courses?: number;
  lms_lessons?: number;
  lms_students?: number;
}

export interface PlanFeatures {
  public_profile?: boolean;
  basic_posts?: boolean;
  basic_quizzes?: boolean;
  enrollment_codes?: boolean;
  advanced_analytics?: boolean;
  priority_support?: boolean;
  custom_branding?: boolean;
  voice_messages?: boolean;
  scheduled_posts?: boolean;
  multi_teacher?: boolean;
  institute_dashboard?: boolean;
  fee_tracking?: boolean;
  multi_branch?: boolean;
  api_access?: boolean;
  white_label?: boolean;
  school_dashboard?: boolean;
  grade_management?: boolean;
  class_management?: boolean;
  attendance_tracking?: boolean;
  school_channels?: boolean;
  parent_portal?: boolean;
  basic_reports?: boolean;
  advanced_reports?: boolean;
  examination_management?: boolean;
  results_management?: boolean;
  clubs_societies?: boolean;
  events_calendar?: boolean;
  notice_approval?: boolean;
  audit_logs?: boolean;
  dedicated_support?: boolean;
  lms_workspace?: boolean;
  course_builder?: boolean;
  lesson_player?: boolean;
  student_progress?: boolean;
  course_announcements?: boolean;
  lms_analytics?: boolean;
  lms_certificates?: boolean;
}

// Get all active plans
export async function getActivePlans() {
  return db.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

// Get plan by slug
export async function getPlanBySlug(slug: string) {
  const plan = await db.plan.findUnique({ where: { slug } });
  if (!plan) return null;

  return {
    ...plan,
    limits: JSON.parse(plan.limits) as PlanLimits,
    features: plan.features ? (JSON.parse(plan.features) as string[]) : [],
  };
}

// Get user's active subscription
export async function getUserSubscription(userId: string) {
  const subscription = await db.userSubscription.findFirst({
    where: {
      userId,
      status: { in: ["active", "trial"] },
    },
    include: {
      plan: true,
      entitlements: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!subscription) {
    // Return free plan details
    const freePlan = await getPlanBySlug("free");
    return {
      plan: freePlan,
      status: "free" as const,
      limits: freePlan?.limits ?? { channels: 3, classes: 5, storage_mb: 500 },
      features: freePlan?.features ?? [],
    };
  }

  return {
    id: subscription.id,
    plan: {
      ...subscription.plan,
      limits: JSON.parse(subscription.plan.limits) as PlanLimits,
      features: subscription.plan.features ? JSON.parse(subscription.plan.features) : [],
    },
    status: subscription.status as SubscriptionStatus,
    startedAt: subscription.startedAt,
    expiresAt: subscription.expiresAt,
    trialEndsAt: subscription.trialEndsAt,
    entitlements: subscription.entitlements,
    limits: JSON.parse(subscription.plan.limits) as PlanLimits,
    features: subscription.plan.features ? JSON.parse(subscription.plan.features) : [],
  };
}

// Check if user has feature access
export async function hasFeature(userId: string, feature: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId);
  if (!subscription) return false;

  return subscription.features.includes(feature);
}

// Get user's limit for a feature
export async function getLimit(userId: string, limitKey: keyof PlanLimits): Promise<number> {
  const subscription = await getUserSubscription(userId);
  if (!subscription) {
    // Free plan defaults
    const defaults: PlanLimits = { channels: 3, classes: 5, storage_mb: 500 };
    return defaults[limitKey] ?? 0;
  }

  return subscription.limits[limitKey] ?? 0;
}

// Check if user is within limit
export async function isWithinLimit(
  userId: string,
  limitKey: keyof PlanLimits,
  currentUsage: number
): Promise<{ allowed: boolean; limit: number; used: number; remaining: number }> {
  const limit = await getLimit(userId, limitKey);

  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, limit: -1, used: currentUsage, remaining: -1 };
  }

  return {
    allowed: currentUsage < limit,
    limit,
    used: currentUsage,
    remaining: Math.max(0, limit - currentUsage),
  };
}

// Create subscription (for admin use or after payment)
export async function createSubscription(data: {
  userId: string;
  planSlug: string;
  organizationId?: string;
  status?: SubscriptionStatus;
  trialDays?: number;
}) {
  const plan = await db.plan.findUnique({ where: { slug: data.planSlug } });
  if (!plan) throw new Error("Plan not found");

  // Cancel any existing active subscription
  await db.userSubscription.updateMany({
    where: {
      userId: data.userId,
      status: { in: ["active", "trial"] },
    },
    data: {
      status: "cancelled",
      cancelledAt: new Date(),
    },
  });

  const now = new Date();
  const isTrial = data.status === "trial" || (data.trialDays && data.trialDays > 0);
  const trialEndsAt = isTrial
    ? new Date(now.getTime() + (data.trialDays ?? 14) * 24 * 60 * 60 * 1000)
    : null;

  // Calculate expiry (1 month for monthly, 1 year for yearly)
  let expiresAt: Date | null = null;
  if (!isTrial && plan.billingCycle !== "lifetime") {
    expiresAt = new Date(now);
    if (plan.billingCycle === "monthly") {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else if (plan.billingCycle === "yearly") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }
  }

  const subscription = await db.userSubscription.create({
    data: {
      userId: data.userId,
      planId: plan.id,
      organizationId: data.organizationId,
      status: isTrial ? "trial" : (data.status ?? "active"),
      startedAt: now,
      expiresAt,
      trialEndsAt,
    },
  });

  // Create feature entitlements based on plan limits
  const limits = JSON.parse(plan.limits) as PlanLimits;
  const entitlementData = Object.entries(limits).map(([feature, limitValue]) => ({
    subscriptionId: subscription.id,
    feature,
    limitValue: limitValue as number,
    usedValue: 0,
  }));

  await db.featureEntitlement.createMany({ data: entitlementData });

  return subscription;
}

// Update entitlement usage
export async function updateEntitlementUsage(
  subscriptionId: string,
  feature: string,
  usedValue: number
) {
  return db.featureEntitlement.update({
    where: { subscriptionId_feature: { subscriptionId, feature } },
    data: { usedValue },
  });
}

// Increment entitlement usage
export async function incrementEntitlementUsage(
  subscriptionId: string,
  feature: string,
  amount = 1
) {
  return db.featureEntitlement.update({
    where: { subscriptionId_feature: { subscriptionId, feature } },
    data: { usedValue: { increment: amount } },
  });
}

// Cancel subscription
export async function cancelSubscription(subscriptionId: string) {
  return db.userSubscription.update({
    where: { id: subscriptionId },
    data: {
      status: "cancelled",
      cancelledAt: new Date(),
    },
  });
}

// Check and update expired subscriptions
export async function processExpiredSubscriptions() {
  const now = new Date();

  // Find expired active subscriptions
  const expiredActive = await db.userSubscription.findMany({
    where: {
      status: "active",
      expiresAt: { lt: now },
    },
  });

  // Find expired trials
  const expiredTrials = await db.userSubscription.findMany({
    where: {
      status: "trial",
      trialEndsAt: { lt: now },
    },
  });

  const toExpire = [...expiredActive, ...expiredTrials];

  if (toExpire.length > 0) {
    await db.userSubscription.updateMany({
      where: { id: { in: toExpire.map((s) => s.id) } },
      data: { status: "expired" },
    });
  }

  return { expired: toExpire.length };
}

// Get subscription stats for admin
export async function getSubscriptionStats() {
  const [total, active, trial, expired, cancelled] = await Promise.all([
    db.userSubscription.count(),
    db.userSubscription.count({ where: { status: "active" } }),
    db.userSubscription.count({ where: { status: "trial" } }),
    db.userSubscription.count({ where: { status: "expired" } }),
    db.userSubscription.count({ where: { status: "cancelled" } }),
  ]);

  // Group by plan
  const byPlan = await db.userSubscription.groupBy({
    by: ["planId"],
    where: { status: { in: ["active", "trial"] } },
    _count: true,
  });

  const plans = await db.plan.findMany({
    where: { id: { in: byPlan.map((b) => b.planId) } },
  });

  const planStats = byPlan.map((b) => {
    const plan = plans.find((p) => p.id === b.planId);
    return {
      planId: b.planId,
      planName: plan?.name ?? "Unknown",
      planSlug: plan?.slug ?? "unknown",
      count: b._count,
    };
  });

  return {
    total,
    active,
    trial,
    expired,
    cancelled,
    byPlan: planStats,
  };
}

// Admin: Grant subscription to user
export async function grantSubscription(data: {
  userId: string;
  planSlug: string;
  durationDays?: number;
  reason?: string;
  grantedBy: string;
}) {
  const subscription = await createSubscription({
    userId: data.userId,
    planSlug: data.planSlug,
    status: "active",
  });

  // If custom duration specified
  if (data.durationDays) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + data.durationDays);
    
    await db.userSubscription.update({
      where: { id: subscription.id },
      data: { expiresAt },
    });
  }

  // Log the grant action
  await db.auditLog.create({
    data: {
      actorId: data.grantedBy,
      action: "subscription_granted",
      targetRef: `subscription:${subscription.id}`,
      meta: JSON.stringify({
        targetUserId: data.userId,
        planSlug: data.planSlug,
        durationDays: data.durationDays,
        reason: data.reason,
      }),
    },
  });

  return subscription;
}

// Get user's subscription history
export async function getSubscriptionHistory(userId: string) {
  return db.userSubscription.findMany({
    where: { userId },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
}
