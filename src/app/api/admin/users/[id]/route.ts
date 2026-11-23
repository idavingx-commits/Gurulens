/**
 * Admin actions on a user account.
 *
 * Moderators (ADMIN_ROLES): suspend / reactivate.
 * Main admins only (SUPER_ADMIN_ROLES): set_role, delete_account, grant_plan,
 * cancel_plan, verify_email, signout_all — the full account-control surface.
 */

import { type NextRequest } from "next/server";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { notify, writeAudit } from "@/lib/audit";
import { ADMIN_ROLES, SUPER_ADMIN_ROLES } from "@/lib/constants";
import { db } from "@/lib/db";
import { cancelSubscription, grantSubscription } from "@/lib/subscriptions";
import { adminUserActionSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

/** Build a unique public handle when an admin promotes a user to teacher. */
async function generateTeacherHandle(name: string): Promise<string> {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) || "teacher";
  for (let attempt = 0; attempt < 6; attempt++) {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const handle = `${base}-${suffix}`;
    const taken = await db.teacherProfile.findUnique({ where: { handle } });
    if (!taken) return handle;
  }
  return `teacher-${Date.now().toString(36)}`;
}

export const POST = route(async (req: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(req, ADMIN_ROLES);
  const isSuperAdmin = (SUPER_ADMIN_ROLES as readonly string[]).includes(auth.user.role);
  const { id } = await ctx.params;
  const body = await parseBody(req, adminUserActionSchema);

  if (id === auth.user.id) {
    throw new ApiError(400, "You cannot moderate your own account.", "self_action");
  }

  const target = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      emailVerified: true,
      teacherProfile: { select: { handle: true } },
    },
  });
  if (!target) throw new ApiError(404, "User not found.", "not_found");

  const targetIsAdmin = (ADMIN_ROLES as readonly string[]).includes(target.role);
  if (targetIsAdmin && !isSuperAdmin) {
    throw new ApiError(403, "Only admins can moderate other moderators.", "forbidden");
  }

  const requireSuperAdmin = () => {
    if (!isSuperAdmin) {
      throw new ApiError(403, "Only main admins can do this.", "forbidden");
    }
  };

  switch (body.action) {
    case "suspend": {
      if (target.status === "suspended") {
        throw new ApiError(400, "This user is already suspended.", "already_suspended");
      }
      await db.$transaction([
        db.user.update({ where: { id }, data: { status: "suspended" } }),
        db.session.deleteMany({ where: { userId: id } }),
      ]);
      await notify(
        id,
        "moderation",
        "Your account has been suspended",
        body.reason?.trim() ||
          "Your account broke our community guidelines. Contact support to appeal.",
        null,
      );
      break;
    }
    case "reactivate": {
      if (target.status === "active") {
        throw new ApiError(400, "This user is already active.", "already_active");
      }
      await db.user.update({ where: { id }, data: { status: "active" } });
      await notify(
        id,
        "moderation",
        "Your account has been reactivated",
        "Welcome back! Please review our community guidelines to keep your account in good standing.",
        "/guidelines",
      );
      break;
    }
    case "set_role": {
      requireSuperAdmin();
      if (!body.role) {
        throw new ApiError(400, "Choose a role.", "role_required");
      }
      if (body.role === target.role) {
        throw new ApiError(400, `This user is already a ${target.role}.`, "same_role");
      }
      // Never leave the platform without an active admin.
      if (target.role === "admin" && body.role !== "admin") {
        const adminCount = await db.user.count({
          where: { role: "admin", status: "active" },
        });
        if (adminCount <= 1) {
          throw new ApiError(
            400,
            "This is the last active admin. Promote another admin first.",
            "last_admin",
          );
        }
      }
      // Promoting to teacher auto-creates a starter teacher profile so the
      // role change always works — the user can finish their profile later.
      if (body.role === "teacher" && !target.teacherProfile) {
        const handle = await generateTeacherHandle(target.name);
        await db.teacherProfile.create({
          data: {
            userId: id,
            handle,
            mode: "both",
            consentPublic: true,
            verifiedStatus: "none",
          },
        });
      }
      await db.user.update({ where: { id }, data: { role: body.role } });
      await notify(
        id,
        "account",
        "Your account role changed",
        `Your role is now ${body.role}.${
          body.role === "teacher" && !target.teacherProfile
            ? " We created a starter teacher profile for you — finish it in Studio."
            : ""
        }`,
        body.role === "teacher" ? "/studio" : "/dashboard",
      );
      break;
    }
    case "delete_account": {
      requireSuperAdmin();
      if (
        !body.confirmEmail ||
        body.confirmEmail.trim().toLowerCase() !== target.email.toLowerCase()
      ) {
        throw new ApiError(
          400,
          "Type the account's email address exactly to confirm deletion.",
          "confirm_email",
        );
      }
      if (target.role === "admin") {
        const adminCount = await db.user.count({
          where: { role: "admin", status: "active" },
        });
        if (adminCount <= 1) {
          throw new ApiError(
            400,
            "This is the last active admin. Promote another admin first.",
            "last_admin",
          );
        }
      }
      // Channels and media reference users loosely (no FK) — clean them first.
      // Everything else cascades from the user row.
      await db.$transaction([
        db.channel.deleteMany({ where: { ownerId: id, ownerType: "user" } }),
        db.media.deleteMany({ where: { ownerId: id } }),
        db.user.delete({ where: { id } }),
      ]);
      break;
    }
    case "grant_plan": {
      requireSuperAdmin();
      if (!body.planSlug) {
        throw new ApiError(400, "Choose a plan to grant.", "plan_required");
      }
      const plan = await db.plan.findUnique({ where: { slug: body.planSlug } });
      if (!plan) throw new ApiError(404, "Plan not found.", "plan_not_found");
      const subscription = await grantSubscription({
        userId: id,
        planSlug: body.planSlug,
        durationDays: body.durationDays,
        reason: body.reason,
        grantedBy: auth.user.id,
      });
      await notify(
        id,
        "account",
        `${plan.name} is now active on your account`,
        body.reason?.trim() || "The GuruLens team activated this plan for you.",
        "/pricing",
      );
      await writeAudit(auth.user.id, "subscription.grant", subscription.id, {
        targetUserId: id,
        planSlug: body.planSlug,
        durationDays: body.durationDays ?? null,
      });
      return ok({ done: true, subscriptionId: subscription.id });
    }
    case "cancel_plan": {
      requireSuperAdmin();
      const subscription = await db.userSubscription.findFirst({
        where: { userId: id, status: { in: ["active", "trial"] } },
        orderBy: { createdAt: "desc" },
        select: { id: true, plan: { select: { name: true } } },
      });
      if (!subscription) {
        throw new ApiError(400, "This user has no active plan.", "no_subscription");
      }
      await cancelSubscription(subscription.id);
      await notify(
        id,
        "account",
        "Your plan was changed",
        `${subscription.plan.name} was cancelled by the GuruLens team. You are back on the free plan.`,
        "/pricing",
      );
      break;
    }
    case "verify_email": {
      requireSuperAdmin();
      if (target.emailVerified) {
        throw new ApiError(400, "This email is already verified.", "already_verified");
      }
      await db.user.update({ where: { id }, data: { emailVerified: true } });
      await notify(
        id,
        "account",
        "Your email has been verified",
        "The GuruLens team verified your email address manually.",
        "/settings",
      );
      break;
    }
    case "signout_all": {
      requireSuperAdmin();
      await db.session.deleteMany({ where: { userId: id } });
      await notify(
        id,
        "security",
        "You were signed out everywhere",
        body.reason?.trim() ||
          "The GuruLens team signed out all your sessions as a security precaution. Please sign in again.",
        "/login",
      );
      break;
    }
  }

  await writeAudit(auth.user.id, `user.${body.action}`, id, {
    role: body.role ?? null,
    reason: body.reason ?? null,
    planSlug: body.planSlug ?? null,
    targetEmail: target.email,
  });

  return ok({ done: true });
});
