/**
 * ClassHub API - Class management
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  createClass,
  getTeacherClasses,
  getTeacherDashboard,
} from "@/lib/classhub";
import { db } from "@/lib/db";
import { checkPermission } from "@/lib/roles";
import { z } from "zod";

const createClassSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(1000).optional(),
  organizationId: z.string().optional(),
  branchId: z.string().optional(),
  subjectId: z.string().optional(),
  gradeId: z.string().optional(),
  mode: z.enum(["physical", "online", "both"]).optional(),
  schedule: z
    .object({
      days: z.array(z.string()),
      startTime: z.string(),
      endTime: z.string(),
      duration: z.number(),
    })
    .optional(),
  maxStudents: z.number().int().positive().optional(),
  feeAmount: z.number().int().nonnegative().optional(),
  feeCurrency: z.string().default("LKR"),
  feeFrequency: z.enum(["monthly", "per_session", "course"]).optional(),
  location: z.string().optional(),
  onlineLink: z.string().url().optional(),
  coverKey: z.string().trim().min(1).optional(),
});

// GET: List teacher's classes or dashboard
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is a teacher
    const canAccess = await checkPermission(session.user.id, "class:read");
    if (!canAccess) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "dashboard") {
      const dashboard = await getTeacherDashboard(session.user.id);
      return NextResponse.json({ dashboard });
    }

    const status = searchParams.get("status") as "active" | "archived" | "draft" | undefined;
    const classes = await getTeacherClasses(session.user.id, { status });

    return NextResponse.json({ ok: true, data: { classes } });
  } catch (error) {
    console.error("Error in GET /api/classes:", error);
    return NextResponse.json(
      { error: "Failed to fetch classes" },
      { status: 500 }
    );
  }
}

// POST: Create new class
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission
    const canCreate = await checkPermission(session.user.id, "class:create");
    if (!canCreate) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const body = await request.json();
    const data = createClassSchema.parse(body);

    if (data.coverKey) {
      const cover = await db.media.findFirst({
        where: { id: data.coverKey, ownerId: session.user.id, kind: "class_cover" },
        select: { id: true },
      });
      if (!cover) {
        return NextResponse.json(
          { error: "Invalid class cover image." },
          { status: 400 }
        );
      }
    }

    // If creating for organization, check org permission
    if (data.organizationId) {
      const hasOrgPermission = await checkPermission(
        session.user.id,
        "org:manage_classes",
        { organizationId: data.organizationId }
      );
      if (!hasOrgPermission) {
        return NextResponse.json(
          { error: "You don't have permission to create classes in this organization" },
          { status: 403 }
        );
      }
    }

    const cls = await createClass({
      teacherId: session.user.id,
      ...data,
    });

    return NextResponse.json({ ok: true, data: { class: cls } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", issues: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes("class limit")) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error("Error in POST /api/classes:", error);
    return NextResponse.json(
      { error: "Failed to create class" },
      { status: 500 }
    );
  }
}
