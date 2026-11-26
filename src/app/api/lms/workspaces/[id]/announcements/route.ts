import { type NextRequest } from "next/server";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { getLmsAccess } from "@/lib/lms";
import { lmsAnnouncementSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

// POST: publish an announcement to the workspace.
export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(request);
  const { id } = await ctx.params;
  const body = await parseBody(request, lmsAnnouncementSchema);

  const workspace = await db.lmsWorkspace.findUnique({
    where: { id },
    select: { id: true, ownerId: true, organizationId: true, subdomain: true },
  });
  if (!workspace) throw new ApiError(404, "Workspace not found.", "not_found");

  const access = await getLmsAccess(workspace, auth.user);
  if (!access.canManage) {
    throw new ApiError(403, "You cannot post announcements here.", "forbidden");
  }

  const announcement = await db.lmsAnnouncement.create({
    data: {
      workspaceId: workspace.id,
      authorId: auth.user.id,
      title: body.title,
      body: body.body,
      pinned: body.pinned,
    },
  });

  await writeAudit(auth.user.id, "lms.announcement.create", announcement.id, {
    workspaceId: workspace.id,
    pinned: announcement.pinned,
  });

  return ok({ announcement }, { status: 201 });
});
