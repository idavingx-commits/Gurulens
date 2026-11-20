/**
 * ClassHub API - Student enrollments
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { enrollStudent, withdrawStudent } from "@/lib/classhub";
import { checkPermission } from "@/lib/roles";
import { db } from "@/lib/db";
import { z } from "zod";

const enrollSchema = z.object({
  studentId: z.string(),
  notes: z.string().optional(),
});

// GET: List class enrollments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check permission
    const canView = await checkPermission(session.user.id, "class:read", {
      classId: id,
    });
    if (!canView) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "active";

    const enrollments = await db.classEnrollment.findMany({
      where: {
        classId: id,
        ...(status !== "all" && { status }),
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarKey: true,
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    });

    return NextResponse.json({ ok: true, data: { enrollments } });
  } catch (error) {
    console.error("Error in GET /api/classes/[id]/enrollments:", error);
    return NextResponse.json(
      { error: "Failed to fetch enrollments" },
      { status: 500 }
    );
  }
}

// POST: Enroll student
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const body = await request.json();
    const data = enrollSchema.parse(body);

    // A student may enroll themselves; teachers and admins can enroll anyone.
    const isSelf = data.studentId === session.user.id;
    if (isSelf) {
      const cls = await db.class.findUnique({
        where: { id },
        select: { status: true, teacherId: true },
      });
      if (!cls || cls.status !== "active") {
        return NextResponse.json({ error: "This class is not open for enrollment" }, { status: 400 });
      }
      if (cls.teacherId === session.user.id) {
        return NextResponse.json({ error: "You cannot enroll in your own class" }, { status: 400 });
      }
    } else {
      const canManage = await checkPermission(session.user.id, "class:manage_students", {
        classId: id,
      });
      if (!canManage) {
        return NextResponse.json({ error: "Permission denied" }, { status: 403 });
      }
    }

    const enrollment = await enrollStudent(id, data.studentId, data.notes);

    return NextResponse.json({ ok: true, data: { enrollment } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", issues: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message.includes("already enrolled")) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      if (error.message.includes("maximum capacity")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    console.error("Error in POST /api/classes/[id]/enrollments:", error);
    return NextResponse.json(
      { error: "Failed to enroll student" },
      { status: 500 }
    );
  }
}

// DELETE: Withdraw student
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    // Students can leave a class themselves; staff can remove anyone.
    if (studentId !== session.user.id) {
      const canManage = await checkPermission(session.user.id, "class:manage_students", {
        classId: id,
      });
      if (!canManage) {
        return NextResponse.json({ error: "Permission denied" }, { status: 403 });
      }
    }

    await withdrawStudent(id, studentId);

    return NextResponse.json({ ok: true, data: { success: true } });
  } catch (error) {
    console.error("Error in DELETE /api/classes/[id]/enrollments:", error);
    return NextResponse.json(
      { error: "Failed to withdraw student" },
      { status: 500 }
    );
  }
}
