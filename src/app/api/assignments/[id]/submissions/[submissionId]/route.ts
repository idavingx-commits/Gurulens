/**
 * ClassHub API - Grade a student submission
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { gradeSubmission } from "@/lib/classhub";
import { checkPermission } from "@/lib/roles";
import { db } from "@/lib/db";
import { z } from "zod";

const gradeSchema = z.object({
  score: z.number().int().min(0).max(1000),
  feedback: z.string().trim().max(4000).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, submissionId } = await params;
    const submission = await db.submission.findFirst({
      where: { id: submissionId, assignmentId: id },
      include: {
        assignment: {
          select: { maxScore: true, classId: true },
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const canGrade = await checkPermission(session.user.id, "class:manage_assignments", {
      classId: submission.assignment.classId,
    });
    if (!canGrade) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const body = await request.json();
    const data = gradeSchema.parse(body);

    if (submission.assignment.maxScore && data.score > submission.assignment.maxScore) {
      return NextResponse.json(
        { error: `Score cannot exceed ${submission.assignment.maxScore}` },
        { status: 400 },
      );
    }

    const graded = await gradeSubmission({
      submissionId,
      score: data.score,
      feedback: data.feedback,
    });

    return NextResponse.json({ ok: true, data: { submission: graded } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", issues: error.issues },
        { status: 400 },
      );
    }
    console.error("Error in PATCH /api/assignments/[id]/submissions/[submissionId]:", error);
    return NextResponse.json({ error: "Failed to grade submission" }, { status: 500 });
  }
}
