/**
 * Subscriptions API - Plans and user subscriptions
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getActivePlans,
  getUserSubscription,
  getSubscriptionHistory,
  createSubscription,
  cancelSubscription,
} from "@/lib/subscriptions";

// GET: Get plans and user's subscription
export async function GET(request: NextRequest) {
  try {
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

    // Authenticated: Get user's subscription
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (action === "history") {
      const history = await getSubscriptionHistory(session.user.id);
      return NextResponse.json({ history });
    }

    const subscription = await getUserSubscription(session.user.id);

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error("Error in GET /api/subscriptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}

// POST: Start trial or subscription (for future payment integration)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { planSlug, trialDays } = body;

    if (!planSlug) {
      return NextResponse.json(
        { error: "Plan slug is required" },
        { status: 400 }
      );
    }

    // For now, only allow starting trials
    // Real payment integration would go here
    const subscription = await createSubscription({
      userId: session.user.id,
      planSlug,
      status: "trial",
      trialDays: trialDays || 14,
    });

    return NextResponse.json({
      subscription,
      message: `Your ${trialDays || 14}-day trial has started!`,
    }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/subscriptions:", error);
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}

// DELETE: Cancel subscription
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get("id");

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Subscription ID is required" },
        { status: 400 }
      );
    }

    await cancelSubscription(subscriptionId);

    return NextResponse.json({
      success: true,
      message: "Subscription cancelled successfully",
    });
  } catch (error) {
    console.error("Error in DELETE /api/subscriptions:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
