/**
 * ClassHub API - Student assignment submission
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { submitAssignment } from "@/lib/classhub";
import { db } from "@/lib/db";
import { z } from "zod";

const submitSchema = z.object({
  content: z.string().trim().max(20000).optional(),
  attachments: z.array(z.string()).max(5).optional(),
});

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
    const assignment = await db.assignment.findUnique({
      where: { id },
      include: { class: { select: { id: true, teacherId: true, status: true } } },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }
    if (assignment.class.teacherId === session.user.id) {
      return NextResponse.json(
        { error: "Teachers cannot submit their own assignments" },
        { status: 403 },
      );
    }

    const enrollment = await db.classEnrollment.findUnique({
      where: {
        classId_studentId: {
          classId: assignment.class.id,
          studentId: session.user.id,
        },
      },
      select: { status: true },
    });
    if (!enrollment || enrollment.status !== "active") {
      return NextResponse.json(
        { error: "Join this class before submitting work" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const data = submitSchema.parse(body);

    if (!data.content && (!data.attachments || data.attachments.length === 0)) {
      return NextResponse.json(
        { error: "Add your answer or attach a file before submitting" },
        { status: 400 },
      );
    }

    const attachmentIds = [...new Set(data.attachments ?? [])];
    if (attachmentIds.length > 0) {
      const owned = await db.media.findMany({
        where: {
          id: { in: attachmentIds },
          ownerId: session.user.id,
          kind: { in: ["post_file", "post_image", "doc"] },
        },
        select: { id: true },
      });
      if (owned.length !== attachmentIds.length) {
        return NextResponse.json(
          { error: "One or more attachments are invalid" },
          { status: 400 },
        );
      }
    }

    const submission = await submitAssignment({
      assignmentId: id,
      studentId: session.user.id,
      content: data.content,
      attachments: attachmentIds.length > 0 ? attachmentIds : undefined,
    });

    return NextResponse.json({ ok: true, data: { submission } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", issues: error.issues },
        { status: 400 },
      );
    }
    console.error("Error in POST /api/assignments/[id]/submit:", error);
    return NextResponse.json({ error: "Failed to submit assignment" }, { status: 500 });
  }
}
