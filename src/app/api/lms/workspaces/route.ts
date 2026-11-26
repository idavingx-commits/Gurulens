import { type NextRequest } from "next/server";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { ADMIN_ROLES, type Role } from "@/lib/constants";
import { db } from "@/lib/db";
import {
  assertSubdomainAvailable,
  getLmsLimits,
  normalizeSubdomain,
  validateSubdomain,
} from "@/lib/lms";
import { getOrgAccess } from "@/lib/organizations";
import { lmsWorkspaceSchema, lmsWorkspaceUpdateSchema } from "@/lib/validation";

async function mediaFor(
  userId: string,
  mediaId: string | null | undefined,
  allowed: string[],
  label: string,
): Promise<string | null | undefined> {
  if (mediaId === undefined) return undefined;
  if (mediaId === null || mediaId === "") return null;
  const media = await db.media.findUnique({
    where: { id: mediaId },
    select: { ownerId: true, kind: true },
  });
  if (!media || media.ownerId !== userId || !allowed.includes(media.kind)) {
    throw new ApiError(400, `That ${label} upload is not valid.`, "bad_media");
  }
  return mediaId;
}

// GET: subdomain availability check, or the signed-in user's workspaces.
export const GET = route(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const subdomain = searchParams.get("subdomain");

  if (subdomain) {
    const problem = validateSubdomain(subdomain);
    if (problem) {
      return ok({ available: false, reason: problem, normalized: normalizeSubdomain(subdomain) });
    }
    const existing = await db.lmsWorkspace.findUnique({
      where: { subdomain: normalizeSubdomain(subdomain) },
      select: { id: true },
    });
    return ok({
      available: !existing,
      reason: existing ? "That subdomain is already taken." : null,
      normalized: normalizeSubdomain(subdomain),
    });
  }

  const session = await getSession();
  if (!session) return ok({ workspaces: [] });

  const workspaces = await db.lmsWorkspace.findMany({
    where: { ownerId: session.user.id, isActive: true },
    include: {
      organization: { select: { id: true, name: true, slug: true, type: true } },
      _count: { select: { courses: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return ok({ workspaces });
});

// POST: claim a subdomain / create a learning hub.
export const POST = route(async (request: NextRequest) => {
  const auth = await requireAuth(request);
  const body = await parseBody(request, lmsWorkspaceSchema);

  try {
    await assertSubdomainAvailable(body.subdomain);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : "Invalid subdomain.", "subdomain");
  }

  if (!body.organizationId) {
    if (auth.user.role !== "teacher" && !ADMIN_ROLES.includes(auth.user.role as Role)) {
      throw new ApiError(
        403,
        "Only teachers, institutes and schools can create an LMS workspace.",
        "forbidden",
      );
    }
  } else {
    const org = await db.organization.findUnique({
      where: { id: body.organizationId },
      select: { id: true, name: true, type: true },
    });
    if (!org) throw new ApiError(404, "Organization not found.", "org_not_found");
    const access = await getOrgAccess(auth.user.id, auth.user.role, org.id);
    if (!access.canManage) {
      throw new ApiError(403, "You do not manage this organization.", "forbidden");
    }
    const existing = await db.lmsWorkspace.findUnique({
      where: { organizationId: org.id },
      select: { id: true, subdomain: true },
    });
    if (existing) {
      throw new ApiError(
        409,
        `This organization already has the workspace ${existing.subdomain}.`,
        "workspace_exists",
      );
    }
  }

  const logoKey = await mediaFor(auth.user.id, body.logoMediaId, ["org_logo"], "logo");
  const coverKey = await mediaFor(auth.user.id, body.coverMediaId, ["org_cover"], "cover");

  const workspace = await db.lmsWorkspace.create({
    data: {
      subdomain: normalizeSubdomain(body.subdomain),
      name: body.name,
      tagline: body.tagline ?? null,
      description: body.description ?? null,
      brandColor: body.brandColor ?? "#0094fd",
      ownerId: auth.user.id,
      organizationId: body.organizationId ?? null,
      logoKey: logoKey ?? null,
      coverKey: coverKey ?? null,
    },
  });

  await writeAudit(auth.user.id, "lms.workspace.create", workspace.id, {
    subdomain: workspace.subdomain,
    organizationId: workspace.organizationId,
  });

  return ok({ workspace }, { status: 201 });
});

// PATCH: update branding / subdomain (managers only).
export const PATCH = route(async (request: NextRequest) => {
  const auth = await requireAuth(request);
  const body = await parseBody(request, lmsWorkspaceUpdateSchema);

  const workspace = await db.lmsWorkspace.findUnique({ where: { id: body.id } });
  if (!workspace) throw new ApiError(404, "Workspace not found.", "not_found");

  const isAdmin = ADMIN_ROLES.includes(auth.user.role as Role);
  let canManage = isAdmin || workspace.ownerId === auth.user.id;
  if (!canManage && workspace.organizationId) {
    const access = await getOrgAccess(auth.user.id, auth.user.role, workspace.organizationId);
    canManage = access.canManage;
  }
  if (!canManage) throw new ApiError(403, "You cannot edit this workspace.", "forbidden");

  let subdomain = workspace.subdomain;
  if (body.subdomain && normalizeSubdomain(body.subdomain) !== workspace.subdomain) {
    try {
      await assertSubdomainAvailable(body.subdomain, workspace.id);
    } catch (err) {
      throw new ApiError(400, err instanceof Error ? err.message : "Invalid subdomain.", "subdomain");
    }
    subdomain = normalizeSubdomain(body.subdomain);
  }

  const logoKey = await mediaFor(auth.user.id, body.logoMediaId, ["org_logo"], "logo");
  const coverKey = await mediaFor(auth.user.id, body.coverMediaId, ["org_cover"], "cover");

  const updated = await db.lmsWorkspace.update({
    where: { id: workspace.id },
    data: {
      subdomain,
      name: body.name ?? workspace.name,
      tagline: body.tagline === undefined ? workspace.tagline : body.tagline || null,
      description:
        body.description === undefined ? workspace.description : body.description || null,
      brandColor: body.brandColor ?? workspace.brandColor,
      ...(logoKey !== undefined ? { logoKey } : {}),
      ...(coverKey !== undefined ? { coverKey } : {}),
    },
  });

  const limits = await getLmsLimits(updated.ownerId);
  await writeAudit(auth.user.id, "lms.workspace.update", updated.id, {
    subdomain: updated.subdomain,
    limits,
  });

  return ok({ workspace: updated });
});
