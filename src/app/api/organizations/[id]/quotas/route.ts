/**
 * Campus quota API.
 * PATCH /api/organizations/[id]/quotas — update teacher/channel/class limits.
 */

import { type NextRequest } from "next/server";
import { z } from "zod";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { getOrgAccess, parseOrgSettings } from "@/lib/organizations";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  teacherQuota: z.number().int().min(1).max(1000).optional(),
  channelQuota: z.number().int().min(1).max(5000).optional(),
  classQuota: z.number().int().min(1).max(10000).optional(),
});

export const PATCH = route(async (req: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(req);
  const { id } = await ctx.params;

  const access = await getOrgAccess(auth.user.id, auth.user.role, id);
  if (!access.canAdminister) {
    throw new ApiError(403, "Only campus owners and admins can change quotas.", "forbidden");
  }

  const body = await parseBody(req, bodySchema);
  if (Object.keys(body).length === 0) {
    throw new ApiError(400, "Nothing to update.", "empty");
  }

  const org = await db.organization.findUnique({
    where: { id },
    select: { id: true, settings: true },
  });
  if (!org) throw new ApiError(404, "Organization not found.", "not_found");

  const settings = { ...parseOrgSettings(org.settings), ...body };
  const updated = await db.organization.update({
    where: { id },
    data: { settings: JSON.stringify(settings) },
    select: { settings: true },
  });

  await writeAudit(auth.user.id, "organization.quotas.update", id, {
    quotas: body,
  });

  return ok({ quotas: parseOrgSettings(updated.settings) });
});
