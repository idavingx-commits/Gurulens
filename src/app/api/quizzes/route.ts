import { type NextRequest } from "next/server";

import { ApiError, ok, parseBody, requireAuth, route } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { quizSchema } from "@/lib/validation";

export const POST = route(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth.user.role !== "teacher" && auth.user.role !== "admin") {
    throw new ApiError(403, "Only teachers can create quizzes.", "forbidden");
  }

  const rl = rateLimit(`quiz:create:${auth.user.id}`, 20, 60 * 60 * 1000);
  if (!rl.ok) {
    throw new ApiError(429, "Too many quizzes created. Please try again later.", "rate_limited");
  }

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

  const quiz = await db.quiz.create({
    data: {
      teacherId: auth.user.id,
      title: body.title,
      description: body.description ?? null,
      subjectId: body.subjectId ?? null,
      gradeId: body.gradeId ?? null,
      timeLimitMin: body.timeLimitMin ?? null,
      published: body.published,
      questions: {
        create: body.questions.map((q, i) => ({
          order: i,
          text: q.text,
          options: JSON.stringify(q.options),
          correctIndex: q.correctIndex,
          explanation: q.explanation ?? null,
        })),
      },
    },
    select: { id: true, title: true, published: true },
  });

  await writeAudit(auth.user.id, "quiz.create", quiz.id, { questions: body.questions.length });
  return ok({ quiz }, { status: 201 });
});
