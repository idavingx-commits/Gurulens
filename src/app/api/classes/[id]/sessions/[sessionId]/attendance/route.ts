/**
 * ClassHub API - Session attendance management
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getSessionAttendance,
  markAttendance,
  bulkMarkAttendance,
  updateSessionStatus,
} from "@/lib/classhub";
import { checkPermission } from "@/lib/roles";
import { db } from "@/lib/db";
import { z } from "zod";

const markAttendanceSchema = z.object({
  studentId: z.string(),
  status: z.enum(["present", "absent", "late", "excused"]),
  method: z.enum(["manual", "device", "virtual"]).optional(),
  deviceId: z.string().optional(),
  notes: z.string().optional(),
});

const bulkAttendanceSchema = z.object({
  attendance: z.array(
    z.object({
      studentId: z.string(),
      status: z.enum(["present", "absent", "late", "excused"]),
      notes: z.string().optional(),
    })
  ),
});

const updateSessionSchema = z.object({
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
});

// GET: Get session attendance
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, sessionId } = await params;

    // Check permission
    const canView = await checkPermission(session.user.id, "class:read", {
      classId: id,
    });
    if (!canView) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Get session details
    const classSession = await db.classSession.findUnique({
      where: { id: sessionId },
      include: {
        class: {
          select: { id: true, name: true },
        },
      },
    });

    if (!classSession || classSession.classId !== id) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const attendance = await getSessionAttendance(sessionId);

    // Get enrolled students who don't have attendance marked
    const enrolledStudents = await db.classEnrollment.findMany({
      where: { classId: id, status: "active" },
      include: {
        student: {
          select: { id: true, name: true, email: true, avatarKey: true },
        },
      },
    });

    const attendanceStudentIds = new Set(attendance.map((a) => a.studentId));
    const unmarkedStudents = enrolledStudents
      .filter((e) => !attendanceStudentIds.has(e.studentId))
      .map((e) => e.student);

    return NextResponse.json({
      session: classSession,
      attendance,
      unmarkedStudents,
      summary: {
        total: enrolledStudents.length,
        marked: attendance.length,
        present: attendance.filter((a) => a.status === "present").length,
        late: attendance.filter((a) => a.status === "late").length,
        absent: attendance.filter((a) => a.status === "absent").length,
        excused: attendance.filter((a) => a.status === "excused").length,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/classes/[id]/sessions/[sessionId]/attendance:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance" },
      { status: 500 }
    );
  }
}

// POST: Mark attendance (single or bulk)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, sessionId } = await params;

    // Check permission
    const canManage = await checkPermission(session.user.id, "class:manage_attendance", {
      classId: id,
    });
    if (!canManage) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Verify session belongs to class
    const classSession = await db.classSession.findUnique({
      where: { id: sessionId },
    });

    if (!classSession || classSession.classId !== id) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const body = await request.json();

    // Check if bulk or single
    if (body.attendance && Array.isArray(body.attendance)) {
      // Bulk attendance
      const data = bulkAttendanceSchema.parse(body);
      const result = await bulkMarkAttendance(sessionId, data.attendance);
      return NextResponse.json({ attendance: result });
    } else {
      // Single attendance
      const data = markAttendanceSchema.parse(body);
      const attendance = await markAttendance({
        sessionId,
        studentId: data.studentId,
        status: data.status,
        method: data.method,
        deviceId: data.deviceId,
        notes: data.notes,
      });
      return NextResponse.json({ attendance });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("Error in POST /api/classes/[id]/sessions/[sessionId]/attendance:", error);
    return NextResponse.json(
      { error: "Failed to mark attendance" },
      { status: 500 }
    );
  }
}

// PATCH: Update session status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, sessionId } = await params;

    // Check permission
    const canManage = await checkPermission(session.user.id, "class:manage_sessions", {
      classId: id,
    });
    if (!canManage) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const body = await request.json();
    const data = updateSessionSchema.parse(body);

    const updated = await updateSessionStatus(sessionId, data.status);

    return NextResponse.json({ session: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("Error in PATCH /api/classes/[id]/sessions/[sessionId]/attendance:", error);
    return NextResponse.json(
      { error: "Failed to update session" },
      { status: 500 }
    );
  }
}
