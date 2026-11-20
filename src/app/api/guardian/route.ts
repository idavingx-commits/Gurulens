/**
 * Guardian API - Parent/Guardian relationship management
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  registerAsGuardian,
  getGuardianProfile,
  linkGuardianToStudent,
  unlinkGuardianFromStudent,
  getGuardianChildren,
  getGuardianDashboard,
  getChildAttendanceSummary,
  getChildEnrollments,
  getChildAssignments,
} from "@/lib/guardians";
import { z } from "zod";

const registerSchema = z.object({
  relationship: z.enum(["parent", "guardian", "other"]).optional(),
});

const linkSchema = z.object({
  studentUserId: z.string(),
  isPrimary: z.boolean().optional(),
});

// GET: Get guardian profile, children, or dashboard
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const childId = searchParams.get("childId");

    // Get guardian dashboard
    if (action === "dashboard") {
      const dashboard = await getGuardianDashboard(session.user.id);
      return NextResponse.json({ dashboard });
    }

    // Get child's attendance
    if (action === "attendance" && childId) {
      const attendance = await getChildAttendanceSummary(session.user.id, childId);
      return NextResponse.json({ attendance });
    }

    // Get child's enrollments
    if (action === "enrollments" && childId) {
      const enrollments = await getChildEnrollments(session.user.id, childId);
      return NextResponse.json({ enrollments });
    }

    // Get child's assignments
    if (action === "assignments" && childId) {
      const assignments = await getChildAssignments(session.user.id, childId);
      return NextResponse.json({ assignments });
    }

    // Get guardian profile
    if (action === "profile") {
      const profile = await getGuardianProfile(session.user.id);
      return NextResponse.json({ profile });
    }

    // Get children list
    if (action === "children") {
      const children = await getGuardianChildren(session.user.id);
      return NextResponse.json({ children });
    }

    // Default: return profile and children
    const [profile, children] = await Promise.all([
      getGuardianProfile(session.user.id),
      getGuardianChildren(session.user.id),
    ]);

    return NextResponse.json({ profile, children });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not authorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("Error in GET /api/guardian:", error);
    return NextResponse.json(
      { error: "Failed to fetch guardian data" },
      { status: 500 }
    );
  }
}

// POST: Register as guardian or link to child
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const body = await request.json();

    // Register as guardian
    if (action === "register") {
      const data = registerSchema.parse(body);
      const guardian = await registerAsGuardian(session.user.id, data.relationship);
      return NextResponse.json({
        guardian,
        message: "You are now registered as a guardian",
      }, { status: 201 });
    }

    // Link to child
    if (action === "link") {
      const data = linkSchema.parse(body);
      
      // First ensure user is registered as guardian
      const guardian = await getGuardianProfile(session.user.id);
      if (!guardian) {
        await registerAsGuardian(session.user.id);
      }

      const link = await linkGuardianToStudent({
        guardianUserId: session.user.id,
        studentUserId: data.studentUserId,
        isPrimary: data.isPrimary,
      });

      return NextResponse.json({
        link,
        message: "Child linked successfully",
      }, { status: 201 });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
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

    console.error("Error in POST /api/guardian:", error);
    return NextResponse.json(
      { error: "Failed to process guardian request" },
      { status: 500 }
    );
  }
}

// DELETE: Unlink child
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get("childId");

    if (!childId) {
      return NextResponse.json(
        { error: "Child ID is required" },
        { status: 400 }
      );
    }

    await unlinkGuardianFromStudent(session.user.id, childId);

    return NextResponse.json({
      success: true,
      message: "Child unlinked successfully",
    });
  } catch (error) {
    console.error("Error in DELETE /api/guardian:", error);
    return NextResponse.json(
      { error: "Failed to unlink child" },
      { status: 500 }
    );
  }
}
