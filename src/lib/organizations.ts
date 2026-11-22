/**
 * Organization management utilities
 * Supports both Institutes and Schools
 */

import { db } from "./db";
import { ADMIN_ROLES, type Role } from "./constants";
import type { Prisma } from "@prisma/client";

export type OrganizationType = "institute" | "school";
export type OrgMemberRole = "owner" | "admin" | "manager" | "teacher" | "staff";
export type VerificationStatus = "none" | "pending" | "in_review" | "verified" | "rejected" | "suspended";

export const ORG_MEMBER_ROLES = ["owner", "admin", "manager", "teacher", "staff"] as const;
export type OrgMemberRoleOption = (typeof ORG_MEMBER_ROLES)[number];

export const ORG_MEMBER_STATUSES = ["active", "invited", "suspended", "removed"] as const;
export type OrgMemberStatus = (typeof ORG_MEMBER_STATUSES)[number];

export type OrgSettings = {
  channelQuota?: number;
  classQuota?: number;
  teacherQuota?: number;
  [key: string]: unknown;
};

export function parseOrgSettings(raw: string | null | undefined): OrgSettings {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as OrgSettings)
      : {};
  } catch {
    return {};
  }
}

export function orgQuotaDefaults(type: string) {
  return type === "school"
    ? { teacherQuota: 30, channelQuota: 50, classQuota: 100 }
    : { teacherQuota: 10, channelQuota: 25, classQuota: 50 };
}

/**
 * Resolves a user's access to an organization. System admins/moderators get
 * full access; members need an active membership. `canManage` covers daily
 * operations (profile, classes, channels); `canAdminister` covers structural
 * changes such as team roles and branches.
 */
export async function getOrgAccess(
  userId: string,
  userRole: string,
  organizationId: string,
): Promise<{
  canView: boolean;
  canManage: boolean;
  canAdminister: boolean;
  role: OrgMemberRole | "admin" | null;
}> {
  if (ADMIN_ROLES.includes(userRole as Role)) {
    return { canView: true, canManage: true, canAdminister: true, role: "admin" };
  }

  const membership = await db.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    select: { role: true, status: true },
  });

  if (membership?.status !== "active") {
    return { canView: false, canManage: false, canAdminister: false, role: null };
  }

  const role = membership.role as OrgMemberRole;
  return {
    canView: true,
    canManage: ["owner", "admin", "manager"].includes(role),
    canAdminister: ["owner", "admin"].includes(role),
    role,
  };
}

/**
 * Capacity snapshot for a campus: quotas from `Organization.settings` plus
 * live usage, so the manage page can show what is left.
 */
export async function getOrgCapacity(organizationId: string) {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { type: true, settings: true },
  });

  const defaults = orgQuotaDefaults(org?.type ?? "institute");
  const settings = parseOrgSettings(org?.settings);

  const teacherQuota =
    typeof settings.teacherQuota === "number" && settings.teacherQuota > 0
      ? settings.teacherQuota
      : defaults.teacherQuota;
  const channelQuota =
    typeof settings.channelQuota === "number" && settings.channelQuota > 0
      ? settings.channelQuota
      : defaults.channelQuota;
  const classQuota =
    typeof settings.classQuota === "number" && settings.classQuota > 0
      ? settings.classQuota
      : defaults.classQuota;

  const [members, teachers, channels, classes, students] = await Promise.all([
    db.organizationMember.count({ where: { organizationId, status: "active" } }),
    db.organizationMember.count({
      where: { organizationId, status: "active", role: { in: ["teacher", "staff"] } },
    }),
    db.channel.count({ where: { organizationId, isActive: true } }),
    db.class.count({ where: { organizationId, status: "active" } }),
    db.classEnrollment.count({
      where: { class: { organizationId }, status: "active" },
    }),
  ]);

  return {
    limits: { teacherQuota, channelQuota, classQuota },
    usage: { members, teachers, channels, classes, students },
    settings,
  };
}


// Create a new organization (institute or school)
export async function createOrganization(data: {
  type: OrganizationType;
  name: string;
  slug: string;
  nameSi?: string;
  description?: string;
  ownerId: string;
  logoKey?: string;
  coverKey?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
}) {
  const { ownerId, ...orgData } = data;

  return db.$transaction(async (tx) => {
    // Create the organization
    const org = await tx.organization.create({
      data: {
        ...orgData,
        settings: JSON.stringify({
          channelQuota: data.type === "institute" ? 25 : 50,
          classQuota: data.type === "institute" ? 50 : 100,
          teacherQuota: data.type === "institute" ? 10 : 30,
        }),
      },
    });

    // Add the creator as owner
    await tx.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: ownerId,
        role: "owner",
        status: "active",
        permissions: JSON.stringify(["*"]), // Owner has all permissions
      },
    });

    // Create main branch
    await tx.organizationBranch.create({
      data: {
        organizationId: org.id,
        name: "Main Branch",
        isMain: true,
      },
    });

    return org;
  });
}

// Get user's organizations
export async function getUserOrganizations(userId: string) {
  const memberships = await db.organizationMember.findMany({
    where: { userId, status: "active" },
    include: {
      organization: {
        include: {
          branches: true,
          _count: {
            select: {
              members: { where: { status: "active" } },
              channels: { where: { isActive: true } },
              classes: { where: { status: "active" } },
            },
          },
        },
      },
    },
  });

  return memberships.map((m) => ({
    ...m.organization,
    memberRole: m.role,
    memberPermissions: m.permissions ? JSON.parse(m.permissions) : [],
  }));
}

// Get organization by slug
export async function getOrganizationBySlug(slug: string) {
  return db.organization.findUnique({
    where: { slug },
    include: {
      branches: true,
      members: {
        where: { status: "active" },
        include: {
          branch: { select: { id: true, name: true } },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarKey: true,
              teacherProfile: { select: { handle: true, verifiedStatus: true } },
            },
          },
        },
      },
      _count: {
        select: {
          channels: { where: { isActive: true } },
          classes: { where: { status: "active" } },
        },
      },
    },
  });
}

// Check if user has permission in organization
export async function hasOrgPermission(
  userId: string,
  organizationId: string,
  permission: string
): Promise<boolean> {
  const membership = await db.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
  });

  if (!membership || membership.status !== "active") return false;

  // Owner has all permissions
  if (membership.role === "owner") return true;

  const permissions = membership.permissions ? JSON.parse(membership.permissions) : [];
  return permissions.includes("*") || permissions.includes(permission);
}

// Get user's role in organization
export async function getOrgMemberRole(
  userId: string,
  organizationId: string
): Promise<OrgMemberRole | null> {
  const membership = await db.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
  });

  return membership?.status === "active" ? (membership.role as OrgMemberRole) : null;
}

// Invite user to organization
export async function inviteToOrganization(data: {
  organizationId: string;
  userId: string;
  role: OrgMemberRole;
  branchId?: string;
  permissions?: string[];
  invitedBy: string;
}) {
  // Check if already a member
  const existing = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: data.organizationId,
        userId: data.userId,
      },
    },
  });

  if (existing) {
    throw new Error("User is already a member of this organization");
  }

  return db.organizationMember.create({
    data: {
      organizationId: data.organizationId,
      userId: data.userId,
      role: data.role,
      branchId: data.branchId,
      permissions: data.permissions ? JSON.stringify(data.permissions) : null,
      status: "invited",
      invitedAt: new Date(),
    },
  });
}

// Accept organization invitation
export async function acceptOrgInvitation(userId: string, organizationId: string) {
  const membership = await db.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
  });

  if (!membership) {
    throw new Error("No invitation found");
  }

  if (membership.status !== "invited") {
    throw new Error("Invalid invitation status");
  }

  return db.organizationMember.update({
    where: { id: membership.id },
    data: {
      status: "active",
      joinedAt: new Date(),
    },
  });
}

// Update organization
export async function updateOrganization(
  organizationId: string,
  data: Prisma.OrganizationUpdateInput
) {
  return db.organization.update({
    where: { id: organizationId },
    data,
  });
}

// Request organization verification
export async function requestOrgVerification(data: {
  organizationId: string;
  evidenceKeys: string[];
  evidenceNote?: string;
}) {
  // Check for existing pending request
  const existing = await db.organizationVerificationRequest.findFirst({
    where: {
      organizationId: data.organizationId,
      status: { in: ["pending", "in_review"] },
    },
  });

  if (existing) {
    throw new Error("A verification request is already pending");
  }

  return db.$transaction(async (tx) => {
    const request = await tx.organizationVerificationRequest.create({
      data: {
        organizationId: data.organizationId,
        evidenceKeys: JSON.stringify(data.evidenceKeys),
        evidenceNote: data.evidenceNote,
        status: "pending",
      },
    });

    await tx.organization.update({
      where: { id: data.organizationId },
      data: { verifiedStatus: "pending" },
    });

    return request;
  });
}

// Get organization stats
export async function getOrgStats(organizationId: string) {
  const [members, channels, classes, students] = await Promise.all([
    db.organizationMember.count({
      where: { organizationId, status: "active" },
    }),
    db.channel.count({
      where: { organizationId, isActive: true },
    }),
    db.class.count({
      where: { organizationId, status: "active" },
    }),
    db.classEnrollment.count({
      where: {
        class: { organizationId },
        status: "active",
      },
    }),
  ]);

  return { members, channels, classes, students };
}
