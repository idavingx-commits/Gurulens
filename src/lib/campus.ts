/**
 * Campus-wide read models shared by the campus pages.
 *
 * Everything here is derived from existing tables (classes, sessions,
 * enrolments, channels, audit log) so the campus experience can grow without
 * schema migrations.
 */

import { db } from "./db";

export const CAMPUS_TZ = "Asia/Colombo";

const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const DAY_INDEX: Record<string, number> = {
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
  sun: 0,
};

function dayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CAMPUS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function timeLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: CAMPUS_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function campusDayKey(date: Date): string {
  return dayKey(date);
}

export function campusTimeLabel(date: Date): string {
  return timeLabel(date);
}

export function campusDayLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: CAMPUS_TZ,
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(date);
}

export type CampusSession = {
  id: string;
  scheduledAt: Date;
  duration: number;
  topic: string | null;
  status: string;
  class: {
    id: string;
    name: string;
    coverKey: string | null;
    mode: string;
    branch: { id: string; name: string } | null;
    teacher: { name: string; avatarKey: string | null };
  };
};

/** Upcoming class sessions across every active class in the campus. */
export async function getCampusUpcomingSessions(
  organizationId: string,
  options: { take?: number; branchId?: string | null } = {},
): Promise<CampusSession[]> {
  const { take = 8, branchId } = options;
  return db.classSession.findMany({
    where: {
      class: {
        organizationId,
        status: "active",
        ...(branchId ? { branchId } : {}),
      },
      status: { in: ["scheduled", "in_progress"] },
      scheduledAt: { gte: new Date() },
    },
    orderBy: { scheduledAt: "asc" },
    take,
    select: {
      id: true,
      scheduledAt: true,
      duration: true,
      topic: true,
      status: true,
      class: {
        select: {
          id: true,
          name: true,
          coverKey: true,
          mode: true,
          branch: { select: { id: true, name: true } },
          teacher: { select: { name: true, avatarKey: true } },
        },
      },
    },
  });
}

/** Sessions in a date window, used by the timetable page. */
export async function getCampusTimetable(
  organizationId: string,
  options: { from: Date; to: Date; branchId?: string | null },
): Promise<CampusSession[]> {
  const { from, to, branchId } = options;
  return db.classSession.findMany({
    where: {
      class: {
        organizationId,
        status: "active",
        ...(branchId ? { branchId } : {}),
      },
      scheduledAt: { gte: from, lte: to },
      status: { not: "cancelled" },
    },
    orderBy: { scheduledAt: "asc" },
    take: 120,
    select: {
      id: true,
      scheduledAt: true,
      duration: true,
      topic: true,
      status: true,
      class: {
        select: {
          id: true,
          name: true,
          coverKey: true,
          mode: true,
          branch: { select: { id: true, name: true } },
          teacher: { select: { name: true, avatarKey: true } },
        },
      },
    },
  });
}

export type WeeklyScheduleEntry = {
  classId: string;
  name: string;
  startTime: string;
  endTime: string;
  mode: string;
  branch: { id: string; name: string } | null;
  teacher: { name: string; avatarKey: string | null };
};

/** Regular weekly class times parsed from `Class.schedule` JSON. */
export async function getCampusWeeklySchedule(organizationId: string) {
  const classes = await db.class.findMany({
    where: { organizationId, status: "active", schedule: { not: null } },
    select: {
      id: true,
      name: true,
      schedule: true,
      mode: true,
      branch: { select: { id: true, name: true } },
      teacher: { select: { name: true, avatarKey: true } },
    },
    orderBy: { name: "asc" },
  });

  const byDay = new Map<string, WeeklyScheduleEntry[]>();
  for (const cls of classes) {
    if (!cls.schedule) continue;
    let parsed: { days?: unknown; startTime?: unknown; endTime?: unknown } | null = null;
    try {
      parsed = JSON.parse(cls.schedule) as {
        days?: unknown;
        startTime?: unknown;
        endTime?: unknown;
      };
    } catch {
      parsed = null;
    }
    if (!parsed) continue;
    const days = Array.isArray(parsed.days)
      ? parsed.days.filter((day): day is string => typeof day === "string")
      : [];
    const startTime = typeof parsed.startTime === "string" ? parsed.startTime : "";
    const endTime = typeof parsed.endTime === "string" ? parsed.endTime : "";
    for (const rawDay of days) {
      const key = rawDay.trim().toLowerCase().slice(0, 3);
      if (!(key in DAY_INDEX)) continue;
      const label = DAY_ORDER.find((day) => day.toLowerCase() === key);
      if (!label) continue;
      const list = byDay.get(label) ?? [];
      list.push({
        classId: cls.id,
        name: cls.name,
        startTime,
        endTime,
        mode: cls.mode,
        branch: cls.branch,
        teacher: cls.teacher,
      });
      byDay.set(label, list);
    }
  }

  return DAY_ORDER.filter((day) => (byDay.get(day)?.length ?? 0) > 0).map((day) => ({
    day,
    entries: (byDay.get(day) ?? []).sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }));
}

export type CampusLatestPost = {
  id: string;
  type: string;
  content: string | null;
  isPinned: boolean;
  isUrgent: boolean;
  publishedAt: Date | null;
  channel: { name: string; slug: string; avatarKey: string | null };
  author: { name: string; avatarKey: string | null };
  reactions: number;
};

/** Latest approved posts from every active channel owned by the campus. */
export async function getCampusLatestPosts(
  organizationId: string,
  take = 4,
): Promise<CampusLatestPost[]> {
  const rows = await db.channelPost.findMany({
    where: {
      channel: { organizationId, isActive: true },
      publishedAt: { not: null },
      moderationStatus: "approved",
    },
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
    take,
    select: {
      id: true,
      type: true,
      content: true,
      isPinned: true,
      isUrgent: true,
      publishedAt: true,
      channel: { select: { name: true, slug: true, avatarKey: true } },
      author: { select: { name: true, avatarKey: true } },
      _count: { select: { reactions: true } },
    },
  });

  return rows.map((row) => ({
    ...row,
    reactions: row._count.reactions,
  }));
}

export type CampusActivityItem = {
  id: string;
  action: string;
  createdAt: Date;
  actor: { name: string; avatarKey: string | null };
};

/** Recent audited actions that touched this campus. */
export async function getCampusActivity(
  organizationId: string,
  take = 8,
): Promise<CampusActivityItem[]> {
  return db.auditLog.findMany({
    where: {
      OR: [
        { targetRef: organizationId },
        { meta: { contains: `"organizationId":"${organizationId}"` } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      action: true,
      createdAt: true,
      actor: { select: { name: true, avatarKey: true } },
    },
  });
}

export type CampusInsights = Awaited<ReturnType<typeof getCampusInsights>>;

/** Aggregated operational metrics for owners, admins and managers. */
export async function getCampusInsights(organizationId: string) {
  const now = new Date();
  const start30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const trendStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    members,
    students,
    pendingEnrollments,
    classes,
    channels,
    upcomingSessions,
    sessions30,
    attendance,
    enrollmentsTrend,
    classRows,
    channelRows,
    branchRows,
  ] = await Promise.all([
    db.organizationMember.count({ where: { organizationId, status: "active" } }),
    db.classEnrollment.count({
      where: { class: { organizationId }, status: "active" },
    }),
    db.classEnrollment.count({
      where: { class: { organizationId }, status: "pending" },
    }),
    db.class.count({ where: { organizationId, status: "active" } }),
    db.channel.count({ where: { organizationId, isActive: true } }),
    db.classSession.count({
      where: {
        class: { organizationId, status: "active" },
        scheduledAt: { gte: now },
        status: "scheduled",
      },
    }),
    db.classSession.count({
      where: {
        class: { organizationId },
        scheduledAt: { gte: start30, lte: now },
        status: { in: ["scheduled", "in_progress", "completed"] },
      },
    }),
    db.attendance.findMany({
      where: {
        session: {
          class: { organizationId },
          scheduledAt: { gte: start30, lte: now },
        },
      },
      select: { status: true },
    }),
    db.classEnrollment.findMany({
      where: {
        class: { organizationId },
        enrolledAt: { gte: trendStart },
      },
      select: { enrolledAt: true },
    }),
    db.class.findMany({
      where: { organizationId, status: "active" },
      select: {
        id: true,
        name: true,
        coverKey: true,
        branch: { select: { id: true, name: true } },
        teacher: { select: { name: true } },
        _count: {
          select: {
            enrollments: { where: { status: "active" } },
            sessions: true,
          },
        },
      },
    }),
    db.channel.findMany({
      where: { organizationId, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        avatarKey: true,
        verifiedStatus: true,
        followerCount: true,
        _count: {
          select: {
            followers: true,
            posts: { where: { publishedAt: { not: null } } },
          },
        },
      },
      orderBy: [{ followerCount: "desc" }, { postCount: "desc" }],
      take: 20,
    }),
    db.organizationBranch.findMany({
      where: { organizationId },
      orderBy: [{ isMain: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        isMain: true,
        _count: {
          select: {
            members: { where: { status: "active" } },
            classes: { where: { status: "active" } },
          },
        },
      },
    }),
  ]);

  const present = attendance.filter((row) =>
    ["present", "late"].includes(row.status),
  ).length;
  const attendanceRate =
    attendance.length > 0 ? Math.round((present / attendance.length) * 100) : null;

  const trendMap = new Map<string, number>();
  for (const row of enrollmentsTrend) {
    const key = `${row.enrolledAt.getFullYear()}-${row.enrolledAt.getMonth()}`;
    trendMap.set(key, (trendMap.get(key) ?? 0) + 1);
  }
  const enrollmentTrend = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    return {
      key,
      label: new Intl.DateTimeFormat("en-GB", { month: "short" }).format(date),
      count: trendMap.get(key) ?? 0,
    };
  });

  const topClasses = [...classRows]
    .sort((a, b) => b._count.enrollments - a._count.enrollments)
    .slice(0, 5);

  const teacherMap = new Map<string, { name: string; classes: number; students: number }>();
  for (const cls of classRows) {
    const entry = teacherMap.get(cls.teacher.name) ?? {
      name: cls.teacher.name,
      classes: 0,
      students: 0,
    };
    entry.classes += 1;
    entry.students += cls._count.enrollments;
    teacherMap.set(cls.teacher.name, entry);
  }
  const topTeachers = [...teacherMap.values()]
    .sort((a, b) => b.students - a.students || b.classes - a.classes)
    .slice(0, 5);

  const followers = channelRows.reduce(
    (sum, channel) => sum + (channel._count.followers || channel.followerCount),
    0,
  );
  const posts = channelRows.reduce((sum, channel) => sum + channel._count.posts, 0);

  return {
    members,
    students,
    pendingEnrollments,
    classes,
    channels,
    upcomingSessions,
    sessions30,
    attendanceRate,
    attendanceSample: attendance.length,
    avgClassSize: classes > 0 ? Math.round((students / classes) * 10) / 10 : 0,
    enrollmentTrend,
    topClasses,
    channelRows,
    channelSummary: { followers, posts },
    topTeachers,
    branches: branchRows.map((branch) => ({
      id: branch.id,
      name: branch.name,
      isMain: branch.isMain,
      members: branch._count.members,
      classes: branch._count.classes,
    })),
  };
}
