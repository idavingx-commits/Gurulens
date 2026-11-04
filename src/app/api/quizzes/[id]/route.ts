import { type NextRequest } from "next/server";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { quizSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (req: NextRequest, ctx: Ctx) => {
  const auth = await requireAuth(req);
  const { id } = await ctx.params;

  const quiz = await db.quiz.findUnique({
    where: { id },
    select: {
      id: true,
      teacherId: true,
      title: true,
      description: true,
      subjectId: true,
      gradeId: true,
      timeLimitMin: true,
      published: true,
      questions: {
        orderBy: { order: "asc" },
        select: { text: true, options: true, correctIndex: true, explanation: true },
      },
    },
  });
  if (!quiz) throw new ApiError(404, "Quiz not found.", "not_found");
  if (quiz.teacherId !== auth.user.id && auth.user.role !== "admin") {
    throw new ApiError(403, "You can only edit your own quizzes.", "forbidden");
  }

  return ok({
    quiz: {
      ...quiz,
      questions: quiz.questions.map((q) => ({
        ...q,
        options: JSON.parse(q.options) as string[],
      })),
    },
  });
});

async function requireQuizOwner(req: NextRequest, id: string) {
  const auth = await requireAuth(req);
  const quiz = await db.quiz.findUnique({
    where: { id },
    select: { id: true, teacherId: true },
  });
  if (!quiz) throw new ApiError(404, "Quiz not found.", "not_found");
  if (quiz.teacherId !== auth.user.id && auth.user.role !== "admin") {
    throw new ApiError(403, "You can only manage your own quizzes.", "forbidden");
  }
  return auth;
}

export const PATCH = route(async (req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const auth = await requireQuizOwner(req, id);
  const body = await parseBody(req, quizSchema);

  const [subject, grade] = await Promise.all([
    body.subjectId
      ? db.subject.findUnique({ where: { id: body.subjectId }, select: { id: true } })
      : Promise.resolve(null),
    body.gradeId
      ? db.grade.findUnique({ where: { id: body.gradeId }, select: { id: true } })
      : Promise.resolve(null),
  ]);
  if (body.subjectId && !subject) throw new ApiError(400, "Unknown subject.", "bad_subject");
  if (body.gradeId && !grade) throw new ApiError(400, "Unknown grade.", "bad_grade");

  await db.$transaction(async (tx) => {
    await tx.quiz.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description ?? null,
        subjectId: body.subjectId ?? null,
        gradeId: body.gradeId ?? null,
        timeLimitMin: body.timeLimitMin ?? null,
        published: body.published,
      },
    });
    await tx.quizQuestion.deleteMany({ where: { quizId: id } });
    await tx.quizQuestion.createMany({
      data: body.questions.map((q, i) => ({
        quizId: id,
        order: i,
        text: q.text,
        options: JSON.stringify(q.options),
        correctIndex: q.correctIndex,
        explanation: q.explanation ?? null,
      })),
    });
  });

  await writeAudit(auth.user.id, "quiz.update", id, { questions: body.questions.length });
  return ok({ updated: true });
});

export const DELETE = route(async (req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const auth = await requireQuizOwner(req, id);

  await db.quiz.delete({ where: { id } });
  await writeAudit(auth.user.id, "quiz.delete", id);
  return ok({ deleted: true });
});
