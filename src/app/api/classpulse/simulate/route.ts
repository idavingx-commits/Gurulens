/**
 * ClassPulse API - Attendance simulation
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  simulateCardScan,
  simulateBulkAttendance,
  issueStudentCard,
  getStudentCard,
  getDeviceById,
} from "@/lib/classpulse";
import { checkPermission } from "@/lib/roles";
import { db } from "@/lib/db";
import { z } from "zod";

const scanCardSchema = z.object({
  deviceId: z.string(),
  cardNumber: z.string(),
  sessionId: z.string().optional(),
  eventType: z.enum(["check_in", "check_out"]).optional(),
});

const bulkSimulateSchema = z.object({
  deviceId: z.string(),
  sessionId: z.string(),
  studentIds: z.array(z.string()),
  presentRate: z.number().min(0).max(100).optional(),
});

const issueCardSchema = z.object({
  studentId: z.string(),
  expiresAt: z.string().datetime().optional(),
});

// POST: Simulate card scan or bulk attendance
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const body = await request.json();

    // Issue student card
    if (action === "issue-card") {
      const data = issueCardSchema.parse(body);

      // Verify student exists
      const student = await db.user.findUnique({
        where: { id: data.studentId },
        select: { role: true },
      });

      if (!student || student.role !== "student") {
        return NextResponse.json(
          { error: "Student not found" },
          { status: 404 }
        );
      }

      const card = await issueStudentCard(
        data.studentId,
        data.expiresAt ? new Date(data.expiresAt) : undefined
      );

      return NextResponse.json({ card }, { status: 201 });
    }

    // Bulk simulate attendance
    if (action === "bulk") {
      const data = bulkSimulateSchema.parse(body);

      // Verify device
      const device = await getDeviceById(data.deviceId);
      if (!device) {
        return NextResponse.json({ error: "Device not found" }, { status: 404 });
      }

      // Verify session
      const classSession = await db.classSession.findUnique({
        where: { id: data.sessionId },
        include: { class: { select: { id: true, teacherId: true, organizationId: true } } },
      });

      if (!classSession) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }

      // Check permission
      const canManage = await checkPermission(session.user.id, "class:manage_attendance", {
        classId: classSession.class.id,
      });
      if (!canManage) {
        return NextResponse.json({ error: "Permission denied" }, { status: 403 });
      }

      const result = await simulateBulkAttendance({
        deviceId: data.deviceId,
        sessionId: data.sessionId,
        studentIds: data.studentIds,
        presentRate: data.presentRate,
      });

      return NextResponse.json({
        result,
        message: `Simulated attendance for ${result.total} students (${result.present} present, ${result.late} late, ${result.absent} absent)`,
        isSimulated: true,
      });
    }

    // Single card scan
    const data = scanCardSchema.parse(body);

    // Verify device
    const device = await getDeviceById(data.deviceId);
    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    // If session provided, verify permission
    if (data.sessionId) {
      const classSession = await db.classSession.findUnique({
        where: { id: data.sessionId },
        include: { class: { select: { id: true } } },
      });

      if (classSession) {
        const canManage = await checkPermission(session.user.id, "class:manage_attendance", {
          classId: classSession.class.id,
        });
        if (!canManage) {
          return NextResponse.json({ error: "Permission denied" }, { status: 403 });
        }
      }
    }

    const result = await simulateCardScan({
      deviceId: data.deviceId,
      cardNumber: data.cardNumber,
      sessionId: data.sessionId,
      eventType: data.eventType,
    });

    return NextResponse.json({
      ...result,
      isSimulated: true,
      disclaimer: "This is a simulated card scan. Physical ClassPulse hardware is not connected.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", issues: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.error("Error in POST /api/classpulse/simulate:", error);
    return NextResponse.json(
      { error: "Failed to simulate attendance" },
      { status: 500 }
    );
  }
}

// GET: Get student card info
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json({ error: "Student ID required" }, { status: 400 });
    }

    const card = await getStudentCard(studentId);

    if (!card) {
      return NextResponse.json({ card: null, hasCard: false });
    }

    return NextResponse.json({
      card,
      hasCard: true,
      isActive: card.isActive,
      isExpired: card.expiresAt ? card.expiresAt < new Date() : false,
    });
  } catch (error) {
    console.error("Error in GET /api/classpulse/simulate:", error);
    return NextResponse.json(
      { error: "Failed to get student card" },
      { status: 500 }
    );
  }
}
