/**
 * Multi-role and permissions system
 * A user can have multiple roles: student, teacher, guardian, admin, etc.
 * This system manages role-based and workspace-based permissions
 */

import { db } from "./db";
import { getOrgMemberRole, hasOrgPermission } from "./organizations";

// Base roles in the system
export type UserRole = "student" | "teacher" | "moderator" | "admin";

// Extended roles for organizations
export type OrgRole = "owner" | "admin" | "manager" | "teacher" | "staff";

// School-specific roles
export type SchoolRole = 
  | "principal"
  | "vice_principal"
  | "sectional_head"
  | "school_admin"
  | "class_teacher"
  | "subject_teacher"
  | "student"
  | "parent"
  | "staff";

// Permission keys
export type Permission =
  // User permissions
  | "user:read"
  | "user:update"
  | "user:delete"
  | "user:manage"
  // Teacher permissions
  | "teacher:profile:read"
  | "teacher:profile:update"
  | "teacher:verify"
  // Channel permissions
  | "channel:create"
  | "channel:read"
  | "channel:update"
  | "channel:delete"
  | "channel:post"
  | "channel:moderate"
  | "channel:verify"
  // Class permissions
  | "class:create"
  | "class:read"
  | "class:update"
  | "class:delete"
  | "class:manage_students"
  | "class:manage_sessions"
  | "class:manage_attendance"
  | "class:manage_assignments"
  // Organization permissions
  | "org:read"
  | "org:update"
  | "org:manage_members"
  | "org:manage_branches"
  | "org:manage_classes"
  | "org:manage_channels"
  | "org:manage_billing"
  | "org:verify"
  // School permissions
  | "school:dashboard"
  | "school:manage_grades"
  | "school:manage_classes"
  | "school:manage_teachers"
  | "school:manage_students"
  | "school:manage_channels"
  | "school:manage_notices"
  | "school:approve_notices"
  | "school:manage_exams"
  | "school:manage_results"
  | "school:manage_events"
  | "school:manage_clubs"
  | "school:view_reports"
  | "school:manage_staff"
  // Admin permissions
  | "admin:dashboard"
  | "admin:manage_users"
  | "admin:manage_teachers"
  | "admin:manage_verification"
  | "admin:manage_content"
  | "admin:manage_reports"
  | "admin:manage_subscriptions"
  | "admin:manage_settings"
  | "admin:view_audit"
  | "admin:super";

// Role to permissions mapping
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  student: [
    "user:read",
    "user:update",
    "channel:read",
    "class:read",
  ],
  teacher: [
    "user:read",
    "user:update",
    "teacher:profile:read",
    "teacher:profile:update",
    "channel:create",
    "channel:read",
    "channel:update",
    "channel:post",
    "class:create",
    "class:read",
    "class:update",
    "class:manage_students",
    "class:manage_sessions",
    "class:manage_attendance",
    "class:manage_assignments",
  ],
  moderator: [
    "user:read",
    "user:update",
    "admin:dashboard",
    "admin:manage_content",
    "admin:manage_reports",
    "channel:moderate",
  ],
  admin: [
    "user:read",
    "user:update",
    "user:manage",
    "admin:dashboard",
    "admin:manage_users",
    "admin:manage_teachers",
    "admin:manage_verification",
    "admin:manage_content",
    "admin:manage_reports",
    "admin:manage_subscriptions",
    "admin:manage_settings",
    "admin:view_audit",
    "admin:super",
    "channel:verify",
    "teacher:verify",
    "org:verify",
  ],
};

// Organization role permissions
const ORG_ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  owner: [
    "org:read",
    "org:update",
    "org:manage_members",
    "org:manage_branches",
    "org:manage_classes",
    "org:manage_channels",
    "org:manage_billing",
    "class:create",
    "class:read",
    "class:update",
    "class:delete",
    "class:manage_students",
    "class:manage_sessions",
    "class:manage_attendance",
    "class:manage_assignments",
    "channel:create",
    "channel:read",
    "channel:update",
    "channel:delete",
    "channel:post",
    "channel:moderate",
  ],
  admin: [
    "org:read",
    "org:update",
    "org:manage_members",
    "org:manage_branches",
    "org:manage_classes",
    "org:manage_channels",
    "class:create",
    "class:read",
    "class:update",
    "class:manage_students",
    "class:manage_sessions",
    "class:manage_attendance",
    "class:manage_assignments",
    "channel:create",
    "channel:read",
    "channel:update",
    "channel:post",
    "channel:moderate",
  ],
  manager: [
    "org:read",
    "org:manage_classes",
    "org:manage_channels",
    "class:read",
    "class:update",
    "class:manage_students",
    "class:manage_sessions",
    "class:manage_attendance",
    "channel:read",
    "channel:update",
    "channel:post",
  ],
  teacher: [
    "org:read",
    "class:read",
    "class:update",
    "class:manage_students",
    "class:manage_sessions",
    "class:manage_attendance",
    "class:manage_assignments",
    "channel:read",
    "channel:post",
  ],
  staff: [
    "org:read",
    "class:read",
    "channel:read",
  ],
};

// School role permissions
const SCHOOL_ROLE_PERMISSIONS: Record<SchoolRole, Permission[]> = {
  principal: [
    "school:dashboard",
    "school:manage_grades",
    "school:manage_classes",
    "school:manage_teachers",
    "school:manage_students",
    "school:manage_channels",
    "school:manage_notices",
    "school:approve_notices",
    "school:manage_exams",
    "school:manage_results",
    "school:manage_events",
    "school:manage_clubs",
    "school:view_reports",
    "school:manage_staff",
    "org:read",
    "org:update",
    "org:manage_members",
    "org:manage_branches",
    "org:manage_billing",
  ],
  vice_principal: [
    "school:dashboard",
    "school:manage_grades",
    "school:manage_classes",
    "school:manage_teachers",
    "school:manage_students",
    "school:manage_channels",
    "school:manage_notices",
    "school:approve_notices",
    "school:manage_exams",
    "school:manage_results",
    "school:manage_events",
    "school:manage_clubs",
    "school:view_reports",
    "org:read",
  ],
  sectional_head: [
    "school:dashboard",
    "school:manage_classes",
    "school:manage_students",
    "school:manage_notices",
    "school:manage_exams",
    "school:manage_results",
    "school:view_reports",
    "org:read",
  ],
  school_admin: [
    "school:dashboard",
    "school:manage_students",
    "school:manage_notices",
    "school:view_reports",
    "org:read",
  ],
  class_teacher: [
    "school:dashboard",
    "school:manage_students",
    "school:manage_notices",
    "class:read",
    "class:update",
    "class:manage_attendance",
    "class:manage_assignments",
    "org:read",
  ],
  subject_teacher: [
    "school:dashboard",
    "class:read",
    "class:manage_attendance",
    "class:manage_assignments",
    "org:read",
  ],
  student: [
    "class:read",
    "org:read",
  ],
  parent: [
    "org:read",
  ],
  staff: [
    "org:read",
  ],
};

// Check if user has base permission
export function hasBasePermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

// Get user's base permissions
export function getBasePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

// Check if user has permission (combines base role + org role)
export async function checkPermission(
  userId: string,
  permission: Permission,
  context?: { organizationId?: string; classId?: string; channelId?: string }
): Promise<boolean> {
  // Get user
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, status: true },
  });

  if (!user || user.status !== "active") return false;

  // Check base role permission
  if (hasBasePermission(user.role as UserRole, permission)) {
    return true;
  }

  // Check organization permission if context provided
  if (context?.organizationId) {
    const orgRole = await getOrgMemberRole(userId, context.organizationId);
    if (orgRole) {
      // Check org role permissions
      if (ORG_ROLE_PERMISSIONS[orgRole]?.includes(permission)) {
        return true;
      }

      // Check organization type for school-specific permissions
      const org = await db.organization.findUnique({
        where: { id: context.organizationId },
        select: { type: true },
      });

      if (org?.type === "school") {
        // Map org role to school role
        const schoolRole = mapOrgRoleToSchoolRole(orgRole);
        if (schoolRole && SCHOOL_ROLE_PERMISSIONS[schoolRole]?.includes(permission)) {
          return true;
        }
      }

      // Check custom permissions
      return hasOrgPermission(userId, context.organizationId, permission);
    }
  }

  // Check class-specific permission
  if (context?.classId) {
    const cls = await db.class.findUnique({
      where: { id: context.classId },
      select: { teacherId: true, organizationId: true },
    });

    if (cls) {
      // Teacher of the class has class permissions
      if (cls.teacherId === userId) {
        const classPermissions: Permission[] = [
          "class:read",
          "class:update",
          "class:manage_students",
          "class:manage_sessions",
          "class:manage_attendance",
          "class:manage_assignments",
        ];
        if (classPermissions.includes(permission)) return true;
      }

      // Check org permission if class belongs to org
      if (cls.organizationId) {
        return checkPermission(userId, permission, { organizationId: cls.organizationId });
      }
    }
  }

  // Check channel-specific permission
  if (context?.channelId) {
    const channel = await db.channel.findUnique({
      where: { id: context.channelId },
      select: { ownerId: true, ownerType: true, organizationId: true },
    });

    if (channel) {
      // Owner has all channel permissions
      if (channel.ownerType === "user" && channel.ownerId === userId) {
        const channelPermissions: Permission[] = [
          "channel:read",
          "channel:update",
          "channel:delete",
          "channel:post",
          "channel:moderate",
        ];
        if (channelPermissions.includes(permission)) return true;
      }

      // Check org permission if channel belongs to org
      if (channel.organizationId) {
        return checkPermission(userId, permission, { organizationId: channel.organizationId });
      }
    }
  }

  return false;
}

// Map org role to school role
function mapOrgRoleToSchoolRole(orgRole: OrgRole): SchoolRole | null {
  const mapping: Partial<Record<OrgRole, SchoolRole>> = {
    owner: "principal",
    admin: "school_admin",
    manager: "sectional_head",
    teacher: "subject_teacher",
    staff: "staff",
  };
  return mapping[orgRole] ?? null;
}

// Get user's effective permissions in a context
export async function getEffectivePermissions(
  userId: string,
  context?: { organizationId?: string }
): Promise<Permission[]> {
  const permissions = new Set<Permission>();

  // Get user's base role
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) return [];

  // Add base permissions
  getBasePermissions(user.role as UserRole).forEach((p) => permissions.add(p));

  // Add organization permissions
  if (context?.organizationId) {
    const orgRole = await getOrgMemberRole(userId, context.organizationId);
    if (orgRole) {
      ORG_ROLE_PERMISSIONS[orgRole]?.forEach((p) => permissions.add(p));
    }
  }

  // Add permissions from all user's organizations
  const memberships = await db.organizationMember.findMany({
    where: { userId, status: "active" },
    include: { organization: { select: { type: true } } },
  });

  for (const membership of memberships) {
    ORG_ROLE_PERMISSIONS[membership.role as OrgRole]?.forEach((p) => permissions.add(p));

    // Add school-specific permissions
    if (membership.organization.type === "school") {
      const schoolRole = mapOrgRoleToSchoolRole(membership.role as OrgRole);
      if (schoolRole) {
        SCHOOL_ROLE_PERMISSIONS[schoolRole]?.forEach((p) => permissions.add(p));
      }
    }
  }

  return Array.from(permissions);
}

// Get user's roles summary
export async function getUserRolesSummary(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) return null;

  const memberships = await db.organizationMember.findMany({
    where: { userId, status: "active" },
    include: {
      organization: {
        select: { id: true, name: true, type: true, verifiedStatus: true },
      },
    },
  });

  const isGuardian = await db.guardian.findUnique({
    where: { userId },
    include: { _count: { select: { children: true } } },
  });

  const hasTeacherProfile = await db.teacherProfile.findUnique({
    where: { userId },
    select: { id: true, verifiedStatus: true },
  });

  return {
    baseRole: user.role,
    isTeacher: user.role === "teacher",
    isAdmin: user.role === "admin",
    isModerator: user.role === "moderator",
    hasTeacherProfile: !!hasTeacherProfile,
    teacherVerified: hasTeacherProfile?.verifiedStatus === "verified",
    isGuardian: !!isGuardian,
    childrenCount: isGuardian?._count.children ?? 0,
    organizations: memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      type: m.organization.type,
      role: m.role,
      verified: m.organization.verifiedStatus === "verified",
    })),
    instituteCount: memberships.filter((m) => m.organization.type === "institute").length,
    schoolCount: memberships.filter((m) => m.organization.type === "school").length,
  };
}

// Require permission middleware helper
export async function requirePermission(
  userId: string,
  permission: Permission,
  context?: { organizationId?: string; classId?: string; channelId?: string }
): Promise<void> {
  const hasPermission = await checkPermission(userId, permission, context);
  if (!hasPermission) {
    throw new Error(`Permission denied: ${permission}`);
  }
}
