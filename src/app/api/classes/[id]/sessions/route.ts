/**
 * ClassHub API - Class sessions and attendance
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createClassSession, getClassSessions } from "@/lib/classhub";
import { checkPermission } from "@/lib/roles";
import { z } from "zod";

const createSessionSchema = z.object({
  scheduledAt: z.string().datetime(),
  duration: z.number().int().positive(),
  topic: z.string().optional(),
  notes: z.string().optional(),
});

// GET: List class sessions
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
    const status = searchParams.get("status") as "scheduled" | "in_progress" | "completed" | "cancelled" | undefined;
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const sessions = await getClassSessions(id, {
      status,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });

    return NextResponse.json({ ok: true, data: { sessions } });
  } catch (error) {
    console.error("Error in GET /api/classes/[id]/sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

// POST: Create new session
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

    // Check permission
    const canManage = await checkPermission(session.user.id, "class:manage_sessions", {
      classId: id,
    });
    if (!canManage) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const body = await request.json();
    const data = createSessionSchema.parse(body);

    const classSession = await createClassSession({
      classId: id,
      scheduledAt: new Date(data.scheduledAt),
      duration: data.duration,
      topic: data.topic,
      notes: data.notes,
    });

    return NextResponse.json({ ok: true, data: { session: classSession } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("Error in POST /api/classes/[id]/sessions:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
