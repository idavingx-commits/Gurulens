import Link from "next/link";

import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/format";

export function QuizCard({
  quiz,
  className,
}: {
  quiz: {
    id: string;
    title: string;
    description?: string | null;
    timeLimitMin?: number | null;
    subject?: { name: string } | null;
    grade?: { name: string } | null;
    _count: { questions: number; attempts: number };
  };
  className?: string;
}) {
  return (
    <Link
      href={`/quiz/${quiz.id}`}
      className={cn(
        "card group flex flex-col gap-3 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-accent-100 text-accent-700">
          <Icon name="target" size={19} />
        </span>
        <div className="flex flex-wrap justify-end gap-1.5">
          {quiz.subject ? (
            <span className="rounded-chip bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700">
              {quiz.subject.name}
            </span>
          ) : null}
          {quiz.grade ? (
            <span className="rounded-chip bg-ink-100 px-2.5 py-1 text-[11px] font-bold text-ink-500">
              {quiz.grade.name}
            </span>
          ) : null}
        </div>
      </div>

      <div>
        <h3 className="text-[15px] font-extrabold text-ink-900 group-hover:text-brand-700">
          {quiz.title}
        </h3>
        {quiz.description ? (
          <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-500">
            {quiz.description}
          </p>
        ) : null}
      </div>

      <div className="mt-auto flex items-center gap-4 border-t border-ink-100 pt-3 text-[12px] font-semibold text-ink-400">
        <span className="inline-flex items-center gap-1.5">
          <Icon name="help" size={13} />
          {quiz._count.questions} question{quiz._count.questions === 1 ? "" : "s"}
        </span>
        {quiz.timeLimitMin ? (
          <span className="inline-flex items-center gap-1.5">
            <Icon name="clock" size={13} />
            {quiz.timeLimitMin} min
          </span>
        ) : null}
        <span className="ml-auto inline-flex items-center gap-1.5 text-brand-600">
          Start
          <Icon name="arrow-right" size={13} strokeWidth={2.4} />
        </span>
      </div>
    </Link>
  );
}
