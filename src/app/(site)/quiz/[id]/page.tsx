import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { QuizRunner } from "@/components/quiz/QuizRunner";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icons";
import { VerifiedTick } from "@/components/ui/primitives";
import { getCurrentUser } from "@/lib/auth";
import { getTaxonomy } from "@/lib/data";
import { db } from "@/lib/db";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const quiz = await db.quiz.findUnique({ where: { id }, select: { title: true, description: true } });
  if (!quiz) return { title: "Quiz not found" };
  return {
    title: `${quiz.title} — Quiz`,
    description: quiz.description ?? "Test yourself with this self-check quiz on GuruLens.",
  };
}

export default async function QuizPage({ params }: { params: Params }) {
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);

  const quiz = await db.quiz.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      subjectId: true,
      gradeId: true,
      timeLimitMin: true,
      published: true,
      moderationStatus: true,
      teacherId: true,
      createdAt: true,
      questions: {
        orderBy: { order: "asc" },
        select: { id: true, text: true, options: true },
      },
      _count: { select: { attempts: true } },
    },
  });

  if (!quiz) notFound();
  const isOwner = user?.id === quiz.teacherId;
  const isAdmin = user?.role === "admin";
  if (quiz.moderationStatus !== "approved" && !isOwner && !isAdmin) notFound();
  if (!quiz.published && !isOwner && !isAdmin) notFound();

  const [teacher, taxonomy] = await Promise.all([
    db.user.findUnique({
      where: { id: quiz.teacherId },
      select: {
        id: true,
        name: true,
        avatarKey: true,
        teacherProfile: { select: { handle: true, verifiedStatus: true } },
      },
    }),
    getTaxonomy(),
  ]);

  const subjectName = quiz.subjectId
    ? (taxonomy.subjects.find((s) => s.id === quiz.subjectId)?.name ?? null)
    : null;
  const gradeName = quiz.gradeId
    ? (taxonomy.grades.find((g) => g.id === quiz.gradeId)?.name ?? null)
    : null;

  const best = user
    ? await db.quizAttempt.findFirst({
        where: { quizId: quiz.id, studentId: user.id },
        orderBy: [{ score: "desc" }, { completedAt: "desc" }],
        select: { score: true, total: true },
      })
    : null;

  const questions = quiz.questions.map((q) => ({
    id: q.id,
    text: q.text,
    options: JSON.parse(q.options) as string[],
  }));

  return (
    <div className="relative isolate mx-auto w-full max-w-3xl px-4 pt-6 pb-16 sm:px-6">
      {/* Background blob */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10">
        <div className="animate-float-slow absolute -top-40 -right-28 size-[26rem] rounded-full bg-accent-500/10 blur-3xl" />
      </div>

      <Link
        href={teacher?.teacherProfile ? `/teacher/${teacher.teacherProfile.handle}?tab=quizzes` : "/explore"}
        className="animate-fade-up mb-4 inline-flex items-center gap-1.5 rounded-chip px-2.5 py-1.5 text-[13px] font-bold text-ink-400 transition-colors hover:bg-ink-100/70 hover:text-ink-700"
      >
        <Icon name="chevron-left" size={14} strokeWidth={2.4} />
        Back
      </Link>

      <div className="animate-fade-up card mb-5 p-5 sm:p-6" style={{ animationDelay: "50ms" }}>
        <div className="flex items-start gap-4">
          <span className="flex size-12 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500 to-brand-500 text-white">
            <Icon name="target" size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl">
              {quiz.title}
            </h1>
            {quiz.description ? (
              <p className="mt-1 text-[13.5px] leading-relaxed text-ink-500">{quiz.description}</p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {subjectName ? (
                <span className="rounded-chip bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700">
                  {subjectName}
                </span>
              ) : null}
              {gradeName ? (
                <span className="rounded-chip bg-ink-100 px-2.5 py-1 text-[11px] font-bold text-ink-500">
                  {gradeName}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5 rounded-chip bg-ink-100 px-2.5 py-1 text-[11px] font-bold text-ink-500">
                <Icon name="help" size={11} />
                {quiz.questions.length} questions
              </span>
              {quiz.timeLimitMin ? (
                <span className="inline-flex items-center gap-1.5 rounded-chip bg-warn-100 px-2.5 py-1 text-[11px] font-bold text-warn-600">
                  <Icon name="clock" size={11} />
                  {quiz.timeLimitMin} min
                </span>
              ) : null}
              {!quiz.published ? (
                <span className="rounded-chip bg-danger-100 px-2.5 py-1 text-[11px] font-bold text-danger-600">
                  Draft — only you can see this
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {teacher ? (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-ink-100 pt-4">
            <Link
              href={teacher.teacherProfile ? `/teacher/${teacher.teacherProfile.handle}` : "/explore"}
              className="flex min-w-0 items-center gap-2.5"
            >
              <Avatar
                name={teacher.name}
                src={teacher.avatarKey ? `/api/media/${teacher.avatarKey}` : null}
                size="sm"
              />
              <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-bold text-ink-800 hover:text-brand-700">
                <span className="truncate">{teacher.name}</span>
                {teacher.teacherProfile?.verifiedStatus === "verified" ? <VerifiedTick /> : null}
              </span>
            </Link>
            <span className="text-[12px] font-semibold text-ink-400">
              {quiz._count.attempts} attempt{quiz._count.attempts === 1 ? "" : "s"}
            </span>
          </div>
        ) : null}
      </div>

      <div className="reveal">
        <QuizRunner
        quizId={quiz.id}
        questions={questions}
        timeLimitMin={quiz.timeLimitMin}
        canAttempt={user !== null}
        loginHref={`/login?next=${encodeURIComponent(`/quiz/${quiz.id}`)}`}
        bestScore={best}
      />
      </div>
    </div>
  );
}
