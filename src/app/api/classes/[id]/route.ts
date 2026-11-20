/**
 * ClassHub API - Single class operations
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getClassById,
  updateClass,
  archiveClass,
  getClassStats,
} from "@/lib/classhub";
import { checkPermission } from "@/lib/roles";
import { z } from "zod";

const updateClassSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(1000).optional(),
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
  location: z.string().optional(),
  onlineLink: z.string().url().optional(),
  status: z.enum(["active", "archived", "draft"]).optional(),
});

// GET: Get class details
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
    const cls = await getClassById(id);

    if (!cls) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Check permission
    const canView = await checkPermission(session.user.id, "class:read", {
      classId: id,
    });
    if (!canView) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get("stats") === "true";

    let stats = null;
    if (includeStats) {
      stats = await getClassStats(id);
    }

    return NextResponse.json({ class: cls, stats });
  } catch (error) {
    console.error("Error in GET /api/classes/[id]:", error);
    return NextResponse.json(
      { error: "Failed to fetch class" },
      { status: 500 }
    );
  }
}

// PATCH: Update class
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const cls = await getClassById(id);

    if (!cls) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Check permission
    const canUpdate = await checkPermission(session.user.id, "class:update", {
      classId: id,
    });
    if (!canUpdate) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const body = await request.json();
    const data = updateClassSchema.parse(body);

    const updated = await updateClass(id, {
      ...data,
      schedule: data.schedule ? JSON.stringify(data.schedule) : undefined,
    });

    return NextResponse.json({ class: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("Error in PATCH /api/classes/[id]:", error);
    return NextResponse.json(
      { error: "Failed to update class" },
      { status: 500 }
    );
  }
}

// DELETE: Archive class
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
    const cls = await getClassById(id);

    if (!cls) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // Check permission
    const canDelete = await checkPermission(session.user.id, "class:delete", {
      classId: id,
    });
    if (!canDelete) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    await archiveClass(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/classes/[id]:", error);
    return NextResponse.json(
      { error: "Failed to archive class" },
      { status: 500 }
    );
  }
}
