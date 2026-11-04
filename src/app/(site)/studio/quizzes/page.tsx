import { QuizManager, type ManagedQuiz } from "@/components/studio/QuizManager";
import { getCurrentUser } from "@/lib/auth";
import { getTaxonomy } from "@/lib/data";
import { db } from "@/lib/db";

export default async function StudioQuizzesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [taxonomy, quizzes] = await Promise.all([
    getTaxonomy(),
    db.quiz.findMany({
      where: { teacherId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        published: true,
        timeLimitMin: true,
        createdAt: true,
        subjectId: true,
        gradeId: true,
        _count: { select: { questions: true, attempts: true } },
      },
    }),
  ]);

  const managed: ManagedQuiz[] = quizzes.map((q) => ({
    id: q.id,
    title: q.title,
    published: q.published,
    timeLimitMin: q.timeLimitMin,
    createdAt: q.createdAt.toISOString(),
    subjectId: q.subjectId,
    gradeId: q.gradeId,
    questionCount: q._count.questions,
    attemptCount: q._count.attempts,
  }));

  return (
    <QuizManager
      quizzes={managed}
      subjects={taxonomy.subjects.map((s) => ({ id: s.id, name: s.name }))}
      grades={taxonomy.grades.map((g) => ({ id: g.id, name: g.name }))}
    />
  );
}
