import { type NextRequest } from "next/server";

import { ApiError, ok, requireAuth, route } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { getLmsAccess } from "@/lib/lms";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(request);
  const { id } = await ctx.params;

  const announcement = await db.lmsAnnouncement.findUnique({
    where: { id },
    include: {
      workspace: {
        select: { id: true, ownerId: true, organizationId: true },
      },
    },
  });
  if (!announcement) throw new ApiError(404, "Announcement not found.", "not_found");

  const access = await getLmsAccess(announcement.workspace, auth.user);
  if (!access.canManage) {
    throw new ApiError(403, "You cannot delete this announcement.", "forbidden");
  }

  await db.lmsAnnouncement.delete({ where: { id } });
  await writeAudit(auth.user.id, "lms.announcement.delete", id, {
    workspaceId: announcement.workspaceId,
  });

  return ok({ deleted: true });
});
