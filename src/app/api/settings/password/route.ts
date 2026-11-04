import { type NextRequest } from "next/server";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { passwordChangeSchema } from "@/lib/validation";

export const POST = route(async (req: NextRequest) => {
  const auth = await requireAuth(req);

  const rl = rateLimit(`password:${auth.user.id}`, 5, 60 * 60 * 1000);
  if (!rl.ok) {
    throw new ApiError(429, "Too many attempts. Please try again later.", "rate_limited");
  }

  const body = await parseBody(req, passwordChangeSchema);

  const user = await db.user.findUnique({
    where: { id: auth.user.id },
    select: { passwordHash: true },
  });
  if (!user) throw new ApiError(401, "Please sign in again.", "unauthenticated");

  const valid = await verifyPassword(body.currentPassword, user.passwordHash);
  if (!valid) {
    throw new ApiError(400, "Your current password is incorrect.", "wrong_password");
  }

  if (body.currentPassword === body.newPassword) {
    throw new ApiError(400, "The new password must be different.", "same_password");
  }

  await db.user.update({
    where: { id: auth.user.id },
    data: { passwordHash: await hashPassword(body.newPassword) },
  });

  // Invalidate other sessions so a leaked session cannot outlive the change.
  await db.session.deleteMany({
    where: { userId: auth.user.id, id: { not: auth.sessionId } },
  });

  await writeAudit(auth.user.id, "password.change", auth.user.id, {});
  return ok({ changed: true });
});
