/**
 * Subscriptions API - plans, the signed-in user's plan and plan activation.
 *
 * During the launch period every plan is free, so activating a zero-price plan
 * creates an active subscription immediately. Paid plans stay behind
 * "contact sales" until a payment provider is wired up.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { ADMIN_ROLES } from "@/lib/constants";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  cancelSubscription,
  createSubscription,
  getActivePlans,
  getSubscriptionHistory,
  getUserSubscription,
} from "@/lib/subscriptions";

const activateSchema = z.object({
  planSlug: z.string().trim().min(1).max(80),
});

// GET: Get plans and user's subscription
export const GET = route(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  // Public: List all active plans
  if (action === "plans") {
    const plans = await getActivePlans();
    return NextResponse.json({
      plans: plans.map((p) => ({
        ...p,
        limits: JSON.parse(p.limits),
        features: p.features ? JSON.parse(p.features) : [],
      })),
    });
  }

  const session = await getSession();
  if (!session) {
    throw new ApiError(401, "Please sign in to continue.", "unauthenticated");
  }

  if (action === "history") {
    const history = await getSubscriptionHistory(session.user.id);
    return NextResponse.json({ history });
  }

  const subscription = await getUserSubscription(session.user.id);
  return NextResponse.json({ subscription });
});

// POST: Activate a free/launch plan. Paid plans require sales contact.
export const POST = route(async (request: NextRequest) => {
  const auth = await requireAuth(request);
  const body = await parseBody(request, activateSchema);

  const plan = await db.plan.findUnique({ where: { slug: body.planSlug } });
  if (!plan || !plan.isActive) {
    throw new ApiError(404, "That plan is not available.", "plan_not_found");
  }

  if (plan.priceLkr > 0) {
    throw new ApiError(
      400,
      "Payments are not open yet. Contact GuruLens support and we will set up this plan for you.",
      "payments_not_open",
    );
  }

  const subscription = await createSubscription({
    userId: auth.user.id,
    planSlug: plan.slug,
    status: "active",
  });

  await writeAudit(auth.user.id, "subscription.activate", subscription.id, {
    planSlug: plan.slug,
    priceLkr: plan.priceLkr,
    billingCycle: plan.billingCycle,
  });

  return ok(
    {
      subscriptionId: subscription.id,
      planSlug: plan.slug,
      planName: plan.name,
    },
    { status: 201 },
  );
});

// DELETE: Cancel the signed-in user's own subscription (admins may cancel any).
export const DELETE = route(async (request: NextRequest) => {
  const auth = await requireAuth(request);
  const { searchParams } = new URL(request.url);
  const subscriptionId = searchParams.get("id");

  if (!subscriptionId) {
    throw new ApiError(400, "Subscription ID is required.", "id_required");
  }

  const subscription = await db.userSubscription.findUnique({
    where: { id: subscriptionId },
    select: { id: true, userId: true, status: true, plan: { select: { name: true } } },
  });
  if (!subscription) {
    throw new ApiError(404, "Subscription not found.", "not_found");
  }

  const isAdmin = ADMIN_ROLES.includes(auth.user.role);
  if (subscription.userId !== auth.user.id && !isAdmin) {
    throw new ApiError(403, "You can only cancel your own subscription.", "forbidden");
  }

  await cancelSubscription(subscription.id);
  await writeAudit(auth.user.id, "subscription.cancel", subscription.id, {
    ownerId: subscription.userId,
    planName: subscription.plan.name,
    admin: isAdmin && subscription.userId !== auth.user.id,
  });

  return NextResponse.json({
    success: true,
    message: "Subscription cancelled successfully",
  });
});
