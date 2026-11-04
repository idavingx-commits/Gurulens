import { type NextRequest } from "next/server";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { notify, writeAudit } from "@/lib/audit";
import { ADMIN_ROLES, SUPER_ADMIN_ROLES } from "@/lib/constants";
import { db } from "@/lib/db";
import { adminUserActionSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

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
    select: { id: true, name: true, role: true, status: true, teacherProfile: { select: { handle: true } } },
  });
  if (!target) throw new ApiError(404, "User not found.", "not_found");

  const targetIsAdmin = (ADMIN_ROLES as readonly string[]).includes(target.role);
  if (targetIsAdmin && !isSuperAdmin) {
    throw new ApiError(403, "Only admins can moderate other moderators.", "forbidden");
  }

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
      if (!isSuperAdmin) {
        throw new ApiError(403, "Only admins can change roles.", "forbidden");
      }
      if (!body.role) {
        throw new ApiError(400, "Choose a role.", "role_required");
      }
      if (body.role === target.role) {
        throw new ApiError(400, `This user is already a ${target.role}.`, "same_role");
      }
      if (body.role === "teacher" && !target.teacherProfile) {
        throw new ApiError(
          400,
          "This user has no teacher profile. They should register as a teacher instead.",
          "no_teacher_profile",
        );
      }
      await db.user.update({ where: { id }, data: { role: body.role } });
      await notify(
        id,
        "account",
        "Your account role changed",
        `Your role is now ${body.role}. Sign in again to see the changes.`,
        "/dashboard",
      );
      break;
    }
  }

  await writeAudit(auth.user.id, `user.${body.action}`, id, {
    role: body.role ?? null,
    reason: body.reason ?? null,
  });

  return ok({ done: true });
});
