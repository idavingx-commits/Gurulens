/**
 * ClassHub API - Assignments
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAssignment, getClassAssignments } from "@/lib/classhub";
import { checkPermission } from "@/lib/roles";
import { z } from "zod";

const createAssignmentSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(4000).optional(),
  dueAt: z.string().datetime().optional(),
  maxScore: z.number().int().min(1).max(1000).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const canRead = await checkPermission(session.user.id, "class:read", { classId: id });
    if (!canRead) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const assignments = await getClassAssignments(id);
    return NextResponse.json({ ok: true, data: { assignments } });
  } catch (error) {
    console.error("Error in GET /api/classes/[id]/assignments:", error);
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const canManage = await checkPermission(session.user.id, "class:manage_assignments", {
      classId: id,
    });
    if (!canManage) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const body = await request.json();
    const data = createAssignmentSchema.parse(body);

    const assignment = await createAssignment({
      classId: id,
      title: data.title,
      description: data.description,
      dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
      maxScore: data.maxScore,
    });

    return NextResponse.json({ ok: true, data: { assignment } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", issues: error.issues },
        { status: 400 },
      );
    }
    console.error("Error in POST /api/classes/[id]/assignments:", error);
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
  }
}
