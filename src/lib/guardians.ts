/**
 * Guardian-Student relationship management
 * Allows parents/guardians to link with and monitor their children's accounts
 */

import { db } from "./db";

export type GuardianRelationship = "parent" | "guardian" | "other";

// Register user as a guardian
export async function registerAsGuardian(userId: string, relationship: GuardianRelationship = "parent") {
  const existing = await db.guardian.findUnique({ where: { userId } });
  
  if (existing) {
    return existing;
  }

  return db.guardian.create({
    data: {
      userId,
      relationship,
    },
  });
}

// Get guardian profile
export async function getGuardianProfile(userId: string) {
  return db.guardian.findUnique({
    where: { userId },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatarKey: true },
      },
      children: {
        include: {
          student: {
            select: { id: true, name: true, email: true, avatarKey: true },
          },
        },
      },
    },
  });
}

// Link guardian to student
export async function linkGuardianToStudent(data: {
  guardianUserId: string;
  studentUserId: string;
  isPrimary?: boolean;
}) {
  // Verify guardian exists
  const guardian = await db.guardian.findUnique({
    where: { userId: data.guardianUserId },
  });

  if (!guardian) {
    throw new Error("Guardian profile not found. Please register as a guardian first.");
  }

  // Verify student exists and is a student role
  const student = await db.user.findUnique({
    where: { id: data.studentUserId },
  });

  if (!student) {
    throw new Error("Student not found");
  }

  if (student.role !== "student") {
    throw new Error("The specified user is not a student account");
  }

  // Check if already linked
  const existing = await db.guardianStudent.findUnique({
    where: {
      guardianId_studentId: {
        guardianId: guardian.id,
        studentId: data.studentUserId,
      },
    },
  });

  if (existing) {
    throw new Error("This student is already linked to your account");
  }

  // If setting as primary, unset other primary relationships for this guardian
  if (data.isPrimary) {
    await db.guardianStudent.updateMany({
      where: { guardianId: guardian.id, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  return db.guardianStudent.create({
    data: {
      guardianId: guardian.id,
      studentId: data.studentUserId,
      isPrimary: data.isPrimary ?? false,
    },
  });
}

// Unlink guardian from student
export async function unlinkGuardianFromStudent(guardianUserId: string, studentUserId: string) {
  const guardian = await db.guardian.findUnique({
    where: { userId: guardianUserId },
  });

  if (!guardian) {
    throw new Error("Guardian profile not found");
  }

  const link = await db.guardianStudent.findUnique({
    where: {
      guardianId_studentId: {
        guardianId: guardian.id,
        studentId: studentUserId,
      },
    },
  });

  if (!link) {
    throw new Error("No link found between this guardian and student");
  }

  return db.guardianStudent.delete({
    where: { id: link.id },
  });
}

// Get guardian's children
export async function getGuardianChildren(guardianUserId: string) {
  const guardian = await db.guardian.findUnique({
    where: { userId: guardianUserId },
    include: {
      children: {
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarKey: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  if (!guardian) {
    return [];
  }

  return guardian.children.map((c) => ({
    ...c.student,
    isPrimary: c.isPrimary,
    linkedAt: c.createdAt,
  }));
}

// Get student's guardians
export async function getStudentGuardians(studentUserId: string) {
  const links = await db.guardianStudent.findMany({
    where: { studentId: studentUserId },
    include: {
      guardian: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarKey: true,
            },
          },
        },
      },
    },
  });

  return links.map((link) => ({
    ...link.guardian.user,
    relationship: link.guardian.relationship,
    isPrimary: link.isPrimary,
    linkedAt: link.createdAt,
  }));
}

// Check if user is guardian of student
export async function isGuardianOf(guardianUserId: string, studentUserId: string): Promise<boolean> {
  const guardian = await db.guardian.findUnique({
    where: { userId: guardianUserId },
  });

  if (!guardian) return false;

  const link = await db.guardianStudent.findUnique({
    where: {
      guardianId_studentId: {
        guardianId: guardian.id,
        studentId: studentUserId,
      },
    },
  });

  return !!link;
}

// Get child's attendance summary (for parent dashboard)
export async function getChildAttendanceSummary(guardianUserId: string, childUserId: string) {
  // Verify guardian-child relationship
  const isGuardian = await isGuardianOf(guardianUserId, childUserId);
  if (!isGuardian) {
    throw new Error("You are not authorized to view this student's information");
  }

  // Get attendance data
  const attendance = await db.attendance.findMany({
    where: { studentId: childUserId },
    include: {
      session: {
        include: {
          class: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Calculate stats
  const total = attendance.length;
  const present = attendance.filter((a) => a.status === "present").length;
  const late = attendance.filter((a) => a.status === "late").length;
  const absent = attendance.filter((a) => a.status === "absent").length;
  const excused = attendance.filter((a) => a.status === "excused").length;

  return {
    summary: {
      total,
      present,
      late,
      absent,
      excused,
      attendanceRate: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
    },
    recent: attendance.slice(0, 10).map((a) => ({
      date: a.createdAt,
      status: a.status,
      className: a.session.class.name,
      checkedInAt: a.checkedInAt,
    })),
  };
}

// Get child's class enrollments (for parent dashboard)
export async function getChildEnrollments(guardianUserId: string, childUserId: string) {
  // Verify guardian-child relationship
  const isGuardian = await isGuardianOf(guardianUserId, childUserId);
  if (!isGuardian) {
    throw new Error("You are not authorized to view this student's information");
  }

  const enrollments = await db.classEnrollment.findMany({
    where: { studentId: childUserId, status: "active" },
    include: {
      class: {
        include: {
          teacher: {
            select: { id: true, name: true, avatarKey: true },
          },
          organization: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  return enrollments.map((e) => ({
    classId: e.class.id,
    className: e.class.name,
    teacher: e.class.teacher,
    organization: e.class.organization,
    mode: e.class.mode,
    schedule: e.class.schedule ? JSON.parse(e.class.schedule) : null,
    enrolledAt: e.enrolledAt,
  }));
}

// Get child's assignments (for parent dashboard)
export async function getChildAssignments(guardianUserId: string, childUserId: string) {
  // Verify guardian-child relationship
  const isGuardian = await isGuardianOf(guardianUserId, childUserId);
  if (!isGuardian) {
    throw new Error("You are not authorized to view this student's information");
  }

  // Get student's enrollments to find their classes
  const enrollments = await db.classEnrollment.findMany({
    where: { studentId: childUserId, status: "active" },
    select: { classId: true },
  });

  const classIds = enrollments.map((e) => e.classId);

  // Get assignments for those classes
  const assignments = await db.assignment.findMany({
    where: { classId: { in: classIds } },
    include: {
      class: {
        select: { id: true, name: true },
      },
      submissions: {
        where: { studentId: childUserId },
      },
    },
    orderBy: { dueAt: "asc" },
  });

  return assignments.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    className: a.class.name,
    dueAt: a.dueAt,
    maxScore: a.maxScore,
    submission: a.submissions[0]
      ? {
          status: a.submissions[0].status,
          score: a.submissions[0].score,
          submittedAt: a.submissions[0].submittedAt,
        }
      : null,
  }));
}

// Update guardian relationship type
export async function updateGuardianRelationship(userId: string, relationship: GuardianRelationship) {
  return db.guardian.update({
    where: { userId },
    data: { relationship },
  });
}

// Set primary guardian for student
export async function setPrimaryGuardian(guardianUserId: string, studentUserId: string) {
  const guardian = await db.guardian.findUnique({
    where: { userId: guardianUserId },
  });

  if (!guardian) {
    throw new Error("Guardian profile not found");
  }

  // Unset all primary flags for this student
  await db.guardianStudent.updateMany({
    where: { studentId: studentUserId },
    data: { isPrimary: false },
  });

  // Set this guardian as primary
  return db.guardianStudent.update({
    where: {
      guardianId_studentId: {
        guardianId: guardian.id,
        studentId: studentUserId,
      },
    },
    data: { isPrimary: true },
  });
}

// Get guardian dashboard overview
export async function getGuardianDashboard(guardianUserId: string) {
  const children = await getGuardianChildren(guardianUserId);

  if (children.length === 0) {
    return {
      children: [],
      summary: null,
    };
  }

  const childIds = children.map((c) => c.id);

  // Get aggregate stats
  const [totalClasses, pendingAssignments, recentAttendance] = await Promise.all([
    db.classEnrollment.count({
      where: { studentId: { in: childIds }, status: "active" },
    }),
    db.assignment.count({
      where: {
        class: { enrollments: { some: { studentId: { in: childIds }, status: "active" } } },
        dueAt: { gte: new Date() },
        submissions: { none: { studentId: { in: childIds } } },
      },
    }),
    db.attendance.findMany({
      where: { studentId: { in: childIds } },
      include: {
        student: { select: { id: true, name: true } },
        session: {
          include: { class: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return {
    children: children.map((c) => ({
      id: c.id,
      name: c.name,
      avatarKey: c.avatarKey,
      isPrimary: c.isPrimary,
    })),
    summary: {
      totalChildren: children.length,
      totalClasses,
      pendingAssignments,
    },
    recentAttendance: recentAttendance.map((a) => ({
      studentName: a.student.name,
      className: a.session.class.name,
      status: a.status,
      date: a.createdAt,
    })),
  };
}
