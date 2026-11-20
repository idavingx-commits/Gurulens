/**
 * ClassHub - Class management for teachers and institutes
 * Supports classes, enrollments, attendance, assignments, and submissions
 */

import { db } from "./db";
import type { Prisma } from "@prisma/client";

export type ClassMode = "physical" | "online" | "both";
export type ClassStatus = "active" | "archived" | "draft";
export type EnrollmentStatus = "active" | "completed" | "withdrawn" | "pending";
export type AttendanceStatus = "present" | "absent" | "late" | "excused";
export type SessionStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
export type SubmissionStatus = "submitted" | "graded" | "late" | "resubmit";

// Create a new class
export async function createClass(data: {
  teacherId: string;
  organizationId?: string;
  branchId?: string;
  name: string;
  description?: string;
  subjectId?: string;
  gradeId?: string;
  mode?: ClassMode;
  schedule?: {
    days: string[];
    startTime: string;
    endTime: string;
    duration: number;
  };
  maxStudents?: number;
  feeAmount?: number;
  feeCurrency?: string;
  feeFrequency?: string;
  location?: string;
  onlineLink?: string;
}) {
  // Check teacher's class limit
  const canCreate = await canCreateClass(data.teacherId, data.organizationId);
  if (!canCreate.allowed) {
    throw new Error(canCreate.reason);
  }

  return db.class.create({
    data: {
      teacherId: data.teacherId,
      organizationId: data.organizationId,
      branchId: data.branchId,
      name: data.name,
      description: data.description,
      subjectId: data.subjectId,
      gradeId: data.gradeId,
      mode: data.mode ?? "both",
      schedule: data.schedule ? JSON.stringify(data.schedule) : null,
      maxStudents: data.maxStudents,
      feeAmount: data.feeAmount,
      feeCurrency: data.feeCurrency ?? "LKR",
      feeFrequency: data.feeFrequency ?? "monthly",
      location: data.location,
      onlineLink: data.onlineLink,
      status: "active",
    },
  });
}

// Check if user can create more classes
async function canCreateClass(
  userId: string,
  organizationId?: string
): Promise<{ allowed: boolean; reason?: string; current: number; limit: number }> {
  // Count user's classes (personal or in organization)
  const classCount = await db.class.count({
    where: {
      teacherId: userId,
      ...(organizationId ? { organizationId } : { organizationId: null }),
      status: { not: "archived" },
    },
  });

  // Check subscription
  const subscription = await db.userSubscription.findFirst({
    where: {
      userId,
      status: { in: ["active", "trial"] },
    },
    include: { plan: true },
  });

  let classLimit = 5; // Free plan default

  if (subscription?.plan) {
    const limits = JSON.parse(subscription.plan.limits || "{}");
    classLimit = limits.classes ?? 5;

    if (classLimit === -1) {
      return { allowed: true, current: classCount, limit: -1 };
    }
  }

  if (classCount >= classLimit) {
    return {
      allowed: false,
      reason: `You have reached your class limit (${classLimit}). Upgrade your plan to create more classes.`,
      current: classCount,
      limit: classLimit,
    };
  }

  return { allowed: true, current: classCount, limit: classLimit };
}

// Get teacher's classes
export async function getTeacherClasses(teacherId: string, options: { status?: ClassStatus } = {}) {
  return db.class.findMany({
    where: {
      teacherId,
      ...(options.status && { status: options.status }),
    },
    include: {
      organization: {
        select: { id: true, name: true, slug: true },
      },
      _count: {
        select: {
          enrollments: { where: { status: "active" } },
          sessions: true,
          assignments: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Get organization's classes
export async function getOrganizationClasses(organizationId: string, options: { branchId?: string; status?: ClassStatus } = {}) {
  return db.class.findMany({
    where: {
      organizationId,
      ...(options.branchId && { branchId: options.branchId }),
      ...(options.status && { status: options.status }),
    },
    include: {
      teacher: {
        select: { id: true, name: true, avatarKey: true },
      },
      branch: {
        select: { id: true, name: true },
      },
      _count: {
        select: {
          enrollments: { where: { status: "active" } },
          sessions: true,
          assignments: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Get class by ID
export async function getClassById(classId: string) {
  return db.class.findUnique({
    where: { id: classId },
    include: {
      teacher: {
        select: { id: true, name: true, avatarKey: true, email: true },
      },
      organization: {
        select: { id: true, name: true, slug: true },
      },
      branch: {
        select: { id: true, name: true },
      },
      enrollments: {
        where: { status: "active" },
        include: {
          student: {
            select: { id: true, name: true, avatarKey: true, email: true },
          },
        },
      },
      _count: {
        select: {
          enrollments: { where: { status: "active" } },
          sessions: true,
          assignments: true,
        },
      },
    },
  });
}

// Update class
export async function updateClass(classId: string, data: Prisma.ClassUpdateInput) {
  return db.class.update({
    where: { id: classId },
    data,
  });
}

// Archive class
export async function archiveClass(classId: string) {
  return db.class.update({
    where: { id: classId },
    data: { status: "archived" },
  });
}

// Enroll student in class
export async function enrollStudent(classId: string, studentId: string, notes?: string) {
  // Check if already enrolled
  const existing = await db.classEnrollment.findUnique({
    where: { classId_studentId: { classId, studentId } },
  });

  if (existing) {
    if (existing.status === "active") {
      throw new Error("Student is already enrolled in this class");
    }
    // Re-enroll if previously withdrawn
    return db.classEnrollment.update({
      where: { id: existing.id },
      data: { status: "active", enrolledAt: new Date() },
    });
  }

  // Check class capacity
  const cls = await db.class.findUnique({
    where: { id: classId },
    include: { _count: { select: { enrollments: { where: { status: "active" } } } } },
  });

  if (cls?.maxStudents && cls._count.enrollments >= cls.maxStudents) {
    throw new Error("This class has reached its maximum capacity");
  }

  return db.classEnrollment.create({
    data: {
      classId,
      studentId,
      status: "active",
      notes,
    },
  });
}

// Withdraw student from class
export async function withdrawStudent(classId: string, studentId: string) {
  const enrollment = await db.classEnrollment.findUnique({
    where: { classId_studentId: { classId, studentId } },
  });

  if (!enrollment) {
    throw new Error("Student is not enrolled in this class");
  }

  return db.classEnrollment.update({
    where: { id: enrollment.id },
    data: { status: "withdrawn" },
  });
}

// Get student's enrollments
export async function getStudentEnrollments(studentId: string, options: { status?: EnrollmentStatus } = {}) {
  return db.classEnrollment.findMany({
    where: {
      studentId,
      ...(options.status && { status: options.status }),
    },
    include: {
      class: {
        include: {
          teacher: {
            select: { id: true, name: true, avatarKey: true },
          },
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });
}

// Create class session
export async function createClassSession(data: {
  classId: string;
  scheduledAt: Date;
  duration: number;
  topic?: string;
  notes?: string;
}) {
  return db.classSession.create({
    data: {
      classId: data.classId,
      scheduledAt: data.scheduledAt,
      duration: data.duration,
      topic: data.topic,
      notes: data.notes,
      status: "scheduled",
    },
  });
}

// Get class sessions
export async function getClassSessions(
  classId: string,
  options: { status?: SessionStatus; from?: Date; to?: Date } = {}
) {
  return db.classSession.findMany({
    where: {
      classId,
      ...(options.status && { status: options.status }),
      ...(options.from && { scheduledAt: { gte: options.from } }),
      ...(options.to && { scheduledAt: { lte: options.to } }),
    },
    include: {
      _count: {
        select: { attendance: true },
      },
    },
    orderBy: { scheduledAt: "desc" },
  });
}

// Update session status
export async function updateSessionStatus(sessionId: string, status: SessionStatus) {
  return db.classSession.update({
    where: { id: sessionId },
    data: { status },
  });
}

// Mark attendance
export async function markAttendance(data: {
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  method?: "manual" | "device" | "virtual";
  deviceId?: string;
  notes?: string;
}) {
  const existing = await db.attendance.findUnique({
    where: { sessionId_studentId: { sessionId: data.sessionId, studentId: data.studentId } },
  });

  if (existing) {
    return db.attendance.update({
      where: { id: existing.id },
      data: {
        status: data.status,
        method: data.method ?? "manual",
        deviceId: data.deviceId,
        notes: data.notes,
      },
    });
  }

  return db.attendance.create({
    data: {
      sessionId: data.sessionId,
      studentId: data.studentId,
      status: data.status,
      method: data.method ?? "manual",
      checkedInAt: data.status === "present" || data.status === "late" ? new Date() : null,
      deviceId: data.deviceId,
      notes: data.notes,
    },
  });
}

// Bulk mark attendance
export async function bulkMarkAttendance(
  sessionId: string,
  attendanceList: Array<{ studentId: string; status: AttendanceStatus; notes?: string }>
) {
  const results = await Promise.all(
    attendanceList.map((item) =>
      markAttendance({
        sessionId,
        studentId: item.studentId,
        status: item.status,
        method: "manual",
        notes: item.notes,
      })
    )
  );
  return results;
}

// Get session attendance
export async function getSessionAttendance(sessionId: string) {
  return db.attendance.findMany({
    where: { sessionId },
    include: {
      student: {
        select: { id: true, name: true, avatarKey: true, email: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

// Get student's attendance summary
export async function getStudentAttendanceSummary(studentId: string, classId?: string) {
  const whereClause: Prisma.AttendanceWhereInput = {
    studentId,
    ...(classId && { session: { classId } }),
  };

  const [present, absent, late, excused, total] = await Promise.all([
    db.attendance.count({ where: { ...whereClause, status: "present" } }),
    db.attendance.count({ where: { ...whereClause, status: "absent" } }),
    db.attendance.count({ where: { ...whereClause, status: "late" } }),
    db.attendance.count({ where: { ...whereClause, status: "excused" } }),
    db.attendance.count({ where: whereClause }),
  ]);

  return {
    present,
    absent,
    late,
    excused,
    total,
    attendanceRate: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
  };
}

// Create assignment
export async function createAssignment(data: {
  classId: string;
  title: string;
  description?: string;
  dueAt?: Date;
  maxScore?: number;
  attachments?: string[];
}) {
  return db.assignment.create({
    data: {
      classId: data.classId,
      title: data.title,
      description: data.description,
      dueAt: data.dueAt,
      maxScore: data.maxScore,
      attachments: data.attachments ? JSON.stringify(data.attachments) : null,
    },
  });
}

// Get class assignments
export async function getClassAssignments(classId: string) {
  return db.assignment.findMany({
    where: { classId },
    include: {
      _count: {
        select: { submissions: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Get assignment by ID
export async function getAssignmentById(assignmentId: string) {
  return db.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      class: {
        include: {
          teacher: {
            select: { id: true, name: true },
          },
        },
      },
      submissions: {
        include: {
          student: {
            select: { id: true, name: true, avatarKey: true },
          },
        },
      },
    },
  });
}

// Submit assignment
export async function submitAssignment(data: {
  assignmentId: string;
  studentId: string;
  content?: string;
  attachments?: string[];
}) {
  const assignment = await db.assignment.findUnique({
    where: { id: data.assignmentId },
  });

  if (!assignment) {
    throw new Error("Assignment not found");
  }

  const isLate = assignment.dueAt && assignment.dueAt < new Date();

  const existing = await db.submission.findUnique({
    where: { assignmentId_studentId: { assignmentId: data.assignmentId, studentId: data.studentId } },
  });

  if (existing) {
    return db.submission.update({
      where: { id: existing.id },
      data: {
        content: data.content,
        attachments: data.attachments ? JSON.stringify(data.attachments) : null,
        status: isLate ? "late" : "submitted",
        submittedAt: new Date(),
        // A resubmission must be reviewed again, so clear the previous grade.
        score: null,
        feedback: null,
        gradedAt: null,
      },
    });
  }

  return db.submission.create({
    data: {
      assignmentId: data.assignmentId,
      studentId: data.studentId,
      content: data.content,
      attachments: data.attachments ? JSON.stringify(data.attachments) : null,
      status: isLate ? "late" : "submitted",
    },
  });
}

// Grade submission
export async function gradeSubmission(data: {
  submissionId: string;
  score: number;
  feedback?: string;
}) {
  return db.submission.update({
    where: { id: data.submissionId },
    data: {
      score: data.score,
      feedback: data.feedback,
      status: "graded",
      gradedAt: new Date(),
    },
  });
}

// Get student submissions
export async function getStudentSubmissions(studentId: string, classId?: string) {
  return db.submission.findMany({
    where: {
      studentId,
      ...(classId && { assignment: { classId } }),
    },
    include: {
      assignment: {
        include: {
          class: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  });
}

// Get class dashboard stats
export async function getClassStats(classId: string) {
  const [enrollments, sessions, assignments, avgAttendance] = await Promise.all([
    db.classEnrollment.count({ where: { classId, status: "active" } }),
    db.classSession.count({ where: { classId } }),
    db.assignment.count({ where: { classId } }),
    db.attendance.groupBy({
      by: ["status"],
      where: { session: { classId } },
      _count: true,
    }),
  ]);

  const totalAttendance = avgAttendance.reduce((sum, a) => sum + a._count, 0);
  const presentCount = avgAttendance.find((a) => a.status === "present")?._count ?? 0;
  const lateCount = avgAttendance.find((a) => a.status === "late")?._count ?? 0;

  return {
    students: enrollments,
    sessions,
    assignments,
    attendanceRate: totalAttendance > 0 
      ? Math.round(((presentCount + lateCount) / totalAttendance) * 100) 
      : 0,
  };
}

// Get teacher's dashboard overview
export async function getTeacherDashboard(teacherId: string) {  const [classes, totalStudents, upcomingSessions, pendingSubmissions] = await Promise.all([
    db.class.count({ where: { teacherId, status: "active" } }),
    db.classEnrollment.count({
      where: { class: { teacherId }, status: "active" },
    }),
    db.classSession.findMany({
      where: {
        class: { teacherId },
        scheduledAt: { gte: new Date() },
        status: "scheduled",
      },
      include: {
        class: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    }),
    db.submission.count({
      where: {
        assignment: { class: { teacherId } },
        status: "submitted",
      },
    }),
  ]);

  return {
    classes,
    totalStudents,
    upcomingSessions,
    pendingSubmissions,
  };
}

// Browse classes that are open for enrollment
export async function getOpenClasses(options: { query?: string; viewerId?: string | null } = {}) {
  const query = options.query?.trim();
  const where: Prisma.ClassWhereInput = {
    status: "active",
    teacher: { status: "active" },
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { teacher: { name: { contains: query, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [classes, enrollments] = await Promise.all([
    db.class.findMany({
      where,
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            avatarKey: true,
            teacherProfile: { select: { handle: true, verifiedStatus: true } },
          },
        },
        organization: { select: { id: true, name: true, slug: true } },
        _count: {
          select: {
            enrollments: { where: { status: "active" } },
            assignments: true,
            sessions: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    options.viewerId
      ? db.classEnrollment.findMany({
          where: { studentId: options.viewerId, status: "active" },
          select: { classId: true },
        })
      : Promise.resolve([]),
  ]);

  return {
    classes,
    enrolledClassIds: new Set(enrollments.map((enrollment) => enrollment.classId)),
  };
}
