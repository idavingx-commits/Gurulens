import { type NextRequest } from "next/server";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { notify } from "@/lib/audit";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { quizAttemptSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (req: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(req);
  const { id } = await ctx.params;

  const rl = rateLimit(`quiz:attempt:${auth.user.id}`, 30, 60 * 60 * 1000);
  if (!rl.ok) {
    throw new ApiError(429, "Too many attempts. Please try again later.", "rate_limited");
  }

  const quiz = await db.quiz.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      teacherId: true,
      published: true,
      moderationStatus: true,
      questions: {
        orderBy: { order: "asc" },
        select: { id: true, correctIndex: true, explanation: true },
      },
    },
  });
  if (!quiz) throw new ApiError(404, "Quiz not found.", "not_found");
  if (
    (quiz.moderationStatus !== "approved" || !quiz.published) &&
    quiz.teacherId !== auth.user.id &&
    auth.user.role !== "admin"
  ) {
    throw new ApiError(404, "Quiz not found.", "not_found");
  }

  const body = await parseBody(req, quizAttemptSchema);
  if (body.answers.length !== quiz.questions.length) {
    throw new ApiError(400, "Please answer every question before submitting.", "bad_answers");
  }

  let score = 0;
  const results = quiz.questions.map((q, i) => {
    const chosen = body.answers[i] ?? -1;
    const correct = chosen === q.correctIndex;
    if (correct) score += 1;
    return {
      questionId: q.id,
      chosen,
      correctIndex: q.correctIndex,
      correct,
      explanation: q.explanation,
    };
  });

  const attempt = await db.quizAttempt.create({
    data: {
      quizId: quiz.id,
      studentId: auth.user.id,
      answers: JSON.stringify(body.answers),
      score,
      total: quiz.questions.length,
    },
    select: { id: true, completedAt: true },
  });

  if (quiz.teacherId !== auth.user.id) {
    const profile = await db.teacherProfile.findUnique({
      where: { userId: quiz.teacherId },
      select: { handle: true },
    });
    await notify(
      quiz.teacherId,
      "quiz_attempt",
      `${auth.user.name} scored ${score}/${quiz.questions.length} on "${quiz.title}"`,
      null,
      profile ? `/teacher/${profile.handle}?tab=quizzes` : null,
    );
  }

  return ok(
    {
      attemptId: attempt.id,
      completedAt: attempt.completedAt,
      score,
      total: quiz.questions.length,
      results,
    },
    { status: 201 },
  );
});
