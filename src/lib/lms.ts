/**
 * LMS workspaces ("learning hubs") that power <subdomain>.gurulens.us.
 *
 * A workspace belongs to a teacher (personal hub) or to an organization
 * (institute / school). Managers are the workspace owner, organization
 * managers, or GuruLens admins. Learners enroll per course.
 */

import { headers } from "next/headers";

import { ADMIN_ROLES, type Role } from "./constants";
import { db } from "./db";
import {
  LMS_ROOT_DOMAIN,
  normalizeSubdomain,
  validateSubdomain,
  type LmsLimits,
} from "./lms-shared";
import { getOrgAccess } from "./organizations";
import { getUserSubscription } from "./subscriptions";

export {
  LMS_ROOT_DOMAIN,
  RESERVED_SUBDOMAINS,
  SUBDOMAIN_PATTERN,
  lmsBrandColor,
  lmsInitials,
  lmsLimitLabel,
  lmsWithin,
  normalizeSubdomain,
  validateSubdomain,
} from "./lms-shared";
export type { LmsLimits } from "./lms-shared";

const LMS_DEFAULT_LIMITS: LmsLimits = { courses: 1, lessons: 20, students: 30 };

function limitValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export async function getLmsWorkspaceBySubdomain(subdomain: string) {
  return db.lmsWorkspace.findFirst({
    where: { subdomain: normalizeSubdomain(subdomain), isActive: true },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          verifiedStatus: true,
          logoKey: true,
          coverKey: true,
        },
      },
    },
  });
}

export async function getLmsWorkspaceForOrganization(organizationId: string) {
  return db.lmsWorkspace.findUnique({
    where: { organizationId },
    include: { courses: { select: { id: true } }, announcements: { select: { id: true } } },
  });
}

export async function getLmsWorkspacesForUser(userId: string) {
  return db.lmsWorkspace.findMany({
    where: { ownerId: userId, isActive: true },
    include: {
      organization: { select: { id: true, name: true, slug: true, type: true } },
      _count: { select: { courses: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getLmsLimits(ownerId: string): Promise<LmsLimits> {
  const subscription = await getUserSubscription(ownerId);
  const limits = (subscription?.limits ?? {}) as unknown as Record<string, unknown>;
  return {
    courses: limitValue(limits.lms_courses, LMS_DEFAULT_LIMITS.courses),
    lessons: limitValue(limits.lms_lessons, LMS_DEFAULT_LIMITS.lessons),
    students: limitValue(limits.lms_students, LMS_DEFAULT_LIMITS.students),
  };
}

type WorkspaceLike = {
  id: string;
  ownerId: string;
  organizationId: string | null;
  subdomain?: string;
};

export type LmsAccess = {
  canManage: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  orgRole: string | null;
  member: boolean;
};

/**
 * Resolve what a signed-in viewer may do in a workspace. `canManage` controls
 * the builder; `member` controls members-only lessons and enrolment.
 */
export async function getLmsAccess(
  workspace: WorkspaceLike,
  user: { id: string; role: string } | null,
): Promise<LmsAccess> {
  if (!user) {
    return { canManage: false, isAdmin: false, isOwner: false, orgRole: null, member: false };
  }

  const isAdmin = ADMIN_ROLES.includes(user.role as Role);
  const isOwner = workspace.ownerId === user.id;
  let orgRole: string | null = null;
  let orgManage = false;
  let member = isAdmin || isOwner;

  if (workspace.organizationId) {
    const access = await getOrgAccess(user.id, user.role, workspace.organizationId);
    orgRole = access.role;
    orgManage = access.canManage;
    if (access.canView) member = true;
  }

  return {
    canManage: isAdmin || isOwner || orgManage,
    isAdmin,
    isOwner,
    orgRole,
    member,
  };
}

export type LmsCourseCard = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverKey: string | null;
  level: string;
  status: string;
  visibility: string;
  lessonCount: number;
  learnerCount: number;
  moduleCount: number;
  enrolled: boolean;
  enrollmentStatus: string | null;
  progress: number;
};

export async function getLmsCourseCards(
  workspaceId: string,
  userId: string | null,
  options: { includeDrafts?: boolean } = {},
): Promise<LmsCourseCard[]> {
  const courses = await db.lmsCourse.findMany({
    where: {
      workspaceId,
      ...(options.includeDrafts ? {} : { status: "published" }),
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      coverKey: true,
      level: true,
      status: true,
      visibility: true,
      modules: {
        select: {
          _count: { select: { lessons: true } },
          lessons: { select: { id: true } },
        },
      },
      enrollments: {
        where: { userId: userId ?? "__none__" },
        select: { status: true },
      },
      _count: { select: { enrollments: true } },
    },
  });

  const progressRows = userId
    ? await db.lmsLessonProgress.findMany({
        where: {
          userId,
          lesson: { module: { course: { workspaceId } } },
        },
        select: { lessonId: true },
      })
    : [];
  const completed = new Set(progressRows.map((row) => row.lessonId));

  return courses.map((course) => {
    const lessonIds = course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));
    const done = lessonIds.filter((id) => completed.has(id)).length;
    const enrollment = userId ? course.enrollments?.[0] ?? null : null;
    return {
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      coverKey: course.coverKey,
      level: course.level,
      status: course.status,
      visibility: course.visibility,
      lessonCount: lessonIds.length,
      moduleCount: course.modules.length,
      learnerCount: course._count.enrollments,
      enrolled: Boolean(enrollment),
      enrollmentStatus: enrollment?.status ?? null,
      progress: lessonIds.length === 0 ? 0 : Math.round((done / lessonIds.length) * 100),
    };
  });
}

export type LmsCourseDetail = NonNullable<Awaited<ReturnType<typeof getLmsCourseDetail>>>;

export async function getLmsCourseDetail(
  workspaceId: string,
  courseId: string,
  userId: string | null,
) {
  const course = await db.lmsCourse.findFirst({
    where: { workspaceId, OR: [{ id: courseId }, { slug: courseId }] },
    include: {
      modules: {
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            orderBy: { sortOrder: "asc" },
            include: {
              progress: {
                where: { userId: userId ?? "__none__" },
                select: { id: true },
              },
            },
          },
        },
      },
      enrollments: { where: { userId: userId ?? "__none__" } },
      _count: { select: { enrollments: true } },
    },
  });
  if (!course) return null;

  const enrollment = userId ? course.enrollments?.[0] ?? null : null;
  const totalLessons = course.modules.reduce((sum, module) => sum + module.lessons.length, 0);
  const completedLessons = course.modules.reduce(
    (sum, module) => sum + module.lessons.filter((lesson) => lesson.progress?.length).length,
    0,
  );

  return {
    ...course,
    enrollment,
    totalLessons,
    completedLessons,
    progress: totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100),
  };
}

export async function getLmsAnnouncements(workspaceId: string, limit = 6) {
  return db.lmsAnnouncement.findMany({
    where: { workspaceId },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: { author: { select: { id: true, name: true, avatarKey: true } } },
  });
}

export async function getLmsStats(workspaceId: string) {
  const [courses, publishedCourses, lessons, learners, completions] = await Promise.all([
    db.lmsCourse.count({ where: { workspaceId } }),
    db.lmsCourse.count({ where: { workspaceId, status: "published" } }),
    db.lmsLesson.count({ where: { module: { course: { workspaceId } } } }),
    db.lmsEnrollment.count({ where: { course: { workspaceId }, status: "active" } }),
    db.lmsLessonProgress.count({
      where: { lesson: { module: { course: { workspaceId } } } },
    }),
  ]);
  return { courses, publishedCourses, lessons, learners, completions };
}

/**
 * Called before account creation / workspace creation. Throws with a friendly
 * message when the subdomain cannot be used.
 */
export async function assertSubdomainAvailable(raw: string, ignoreWorkspaceId?: string) {
  const problem = validateSubdomain(raw);
  if (problem) throw new Error(problem);
  const existing = await db.lmsWorkspace.findUnique({
    where: { subdomain: normalizeSubdomain(raw) },
    select: { id: true },
  });
  if (existing && existing.id !== ignoreWorkspaceId) {
    throw new Error("That subdomain is already taken. Try another one.");
  }
}

export function lmsPublicUrl(subdomain: string): string {
  if (process.env.NODE_ENV === "production") {
    return `https://${subdomain}.${LMS_ROOT_DOMAIN}`;
  }
  return `/lms/${subdomain}`;
}

/**
 * True when the current request already came in on `<tenant>.gurulens.us`
 * (or `<tenant>.localhost`). In that case internal links must be root-relative;
 * otherwise they need the `/lms/<tenant>` prefix.
 */
export async function isLmsTenantHost(tenant: string): Promise<boolean> {
  const store = await headers();
  const host = (store.get("host") ?? "")
    .split(",")[0]!
    .trim()
    .split(":")[0]!
    .toLowerCase();
  if (!host) return false;
  const root = LMS_ROOT_DOMAIN.toLowerCase();
  if (host.endsWith(`.${root}`) && host !== root && host !== `www.${root}`) return true;
  if (host.endsWith(".localhost")) {
    const sub = host.slice(0, -".localhost".length);
    return sub.length > 0 && sub !== "www" && sub === tenant.toLowerCase();
  }
  return false;
}

/** Base path for tenant links: "" on a subdomain, `/lms/<tenant>` elsewhere. */
export async function getLmsBasePath(tenant: string): Promise<string> {
  return (await isLmsTenantHost(tenant)) ? "" : `/lms/${tenant}`;
}

export type LmsViewer = { id: string; name: string; role: string; avatarKey: string | null } | null;

export function lmsCoursePath(subdomain: string, courseId: string): string {
  return `/lms/${subdomain}/courses/${courseId}`;
}
