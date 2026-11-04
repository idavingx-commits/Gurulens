"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button, buttonClass } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/interactive";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError } from "@/lib/client";
import { cn } from "@/lib/format";

type AttemptResult = {
  attemptId: string;
  score: number;
  total: number;
  results: Array<{
    questionId: string;
    chosen: number;
    correctIndex: number;
    correct: boolean;
    explanation: string | null;
  }>;
};

export function QuizRunner({
  quizId,
  questions,
  timeLimitMin,
  canAttempt,
  loginHref,
  bestScore,
}: {
  quizId: string;
  questions: Array<{ id: string; text: string; options: string[] }>;
  timeLimitMin: number | null;
  canAttempt: boolean;
  loginHref: string;
  bestScore: { score: number; total: number } | null;
}) {
  const toast = useToast();
  const [answers, setAnswers] = useState<Array<number | null>>(questions.map(() => null));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(
    timeLimitMin ? timeLimitMin * 60 : null,
  );
  const submittedRef = useRef(false);

  const allAnswered = answers.every((a) => a !== null);

  useEffect(() => {
    if (!canAttempt || result || secondsLeft === null) return;
    if (secondsLeft <= 0) {
      void submit(true);
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, canAttempt, result]);

  async function submit(auto = false) {
    if (!canAttempt || busy || submittedRef.current) return;
    if (!auto && !allAnswered) {
      toast.error("Please answer every question before submitting.");
      return;
    }
    submittedRef.current = true;
    setBusy(true);
    try {
      const res = await apiFetch<AttemptResult>(`/api/quizzes/${quizId}/attempts`, {
        method: "POST",
        body: { answers: answers.map((a) => a ?? -1) },
      });
      setResult(res);
      toast.success(`You scored ${res.score}/${res.total}.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      submittedRef.current = false;
      toast.error(err instanceof ClientApiError ? err.message : "Could not submit your answers.");
    } finally {
      setBusy(false);
    }
  }

  function retake() {
    setAnswers(questions.map(() => null));
    setResult(null);
    submittedRef.current = false;
    if (timeLimitMin) setSecondsLeft(timeLimitMin * 60);
  }

  const pct = result ? Math.round((result.score / Math.max(1, result.total)) * 100) : 0;

  return (
    <div className="space-y-4">
      {!canAttempt ? (
        <div className="glass flex flex-col items-center gap-2 rounded-card p-5 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-3">
            <Icon name="lock" size={18} className="text-ink-400" />
            <p className="text-[13.5px] font-semibold text-ink-600">
              Log in to take this quiz and get instant results.
            </p>
          </div>
          <Link href={loginHref} className={buttonClass("primary", "sm")}>
            Log in
          </Link>
        </div>
      ) : null}

      {result ? (
        <div className="card overflow-hidden">
          <div
            className={cn(
              "flex flex-col items-center gap-2 px-5 py-6 text-center",
              pct >= 70 ? "bg-success-100/60" : pct >= 40 ? "bg-warn-100/60" : "bg-danger-100/50",
            )}
          >
            <span className="text-[12px] font-bold tracking-wide text-ink-500 uppercase">
              Your result
            </span>
            <div className="text-5xl font-extrabold text-ink-900 tabular-nums">
              {result.score}
              <span className="text-2xl text-ink-400">/{result.total}</span>
            </div>
            <p className="text-[13.5px] font-semibold text-ink-600">
              {pct >= 70
                ? "Excellent work! 🎉"
                : pct >= 40
                  ? "Good effort — review the answers below."
                  : "Keep practising — the explanations below will help."}
            </p>
            <Button variant="outline" size="sm" onClick={retake} className="mt-1">
              <Icon name="refresh" size={14} />
              Try again
            </Button>
          </div>
        </div>
      ) : null}

      {bestScore && !result ? (
        <p className="text-center text-[12.5px] font-semibold text-ink-500">
          Your best score so far: {bestScore.score}/{bestScore.total}
        </p>
      ) : null}

      {questions.map((q, qi) => {
        const r = result?.results[qi];
        return (
          <div key={q.id} className="card p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-7 flex-none items-center justify-center rounded-lg bg-ink-100 text-[12px] font-extrabold text-ink-600 tabular-nums">
                {qi + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] leading-relaxed font-bold text-ink-900">{q.text}</p>
                <div className="mt-3 space-y-2">
                  {q.options.map((opt, oi) => {
                    const selected = answers[qi] === oi;
                    const isCorrect = r?.correctIndex === oi;
                    const isChosen = r ? r.chosen === oi : selected;
                    return (
                      <button
                        key={oi}
                        type="button"
                        disabled={!canAttempt || !!result || busy}
                        onClick={() =>
                          setAnswers((prev) => prev.map((a, i) => (i === qi ? oi : a)))
                        }
                        className={cn(
                          "flex w-full items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left text-[13.5px] font-medium transition-all",
                          result
                            ? isCorrect
                              ? "border-success-500/60 bg-success-100/70 text-ink-900"
                              : isChosen
                                ? "border-danger-500/50 bg-danger-100/60 text-ink-900"
                                : "border-ink-100 bg-white/60 text-ink-500"
                            : selected
                              ? "border-brand-500 bg-brand-50 text-ink-900 shadow-soft"
                              : "border-ink-100 bg-white/70 text-ink-700 enabled:hover:border-brand-300 enabled:hover:bg-brand-50/50",
                          (!canAttempt || result) && "cursor-default",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-5 flex-none items-center justify-center rounded-full border text-[11px] font-extrabold",
                            result
                              ? isCorrect
                                ? "border-success-600 bg-success-500 text-white"
                                : isChosen
                                  ? "border-danger-600 bg-danger-500 text-white"
                                  : "border-ink-200 text-ink-400"
                              : selected
                                ? "border-brand-600 bg-brand-500 text-white"
                                : "border-ink-200 text-ink-400",
                          )}
                        >
                          {String.fromCharCode(65 + oi)}
                        </span>
                        <span className="min-w-0 flex-1">{opt}</span>
                        {result && isCorrect ? (
                          <Icon name="check" size={15} className="flex-none text-success-600" />
                        ) : null}
                        {result && isChosen && !isCorrect ? (
                          <Icon name="x" size={15} className="flex-none text-danger-600" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                {r && r.explanation ? (
                  <div className="mt-3 rounded-2xl border-l-2 border-brand-400 bg-brand-50/60 p-3 text-[13px] leading-relaxed text-ink-700">
                    <span className="font-bold text-brand-700">Why: </span>
                    {r.explanation}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}

      {!result ? (
        <div className="glass sticky bottom-4 z-10 flex items-center justify-between gap-4 rounded-card px-5 py-4">
          <div className="text-[12.5px] font-semibold text-ink-500">
            {answers.filter((a) => a !== null).length}/{questions.length} answered
            {secondsLeft !== null && canAttempt ? (
              <span
                className={cn(
                  "ml-3 inline-flex items-center gap-1 font-bold tabular-nums",
                  secondsLeft <= 30 ? "text-danger-600" : "text-ink-700",
                )}
              >
                <Icon name="clock" size={13} />
                {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:
                {String(secondsLeft % 60).padStart(2, "0")}
              </span>
            ) : null}
          </div>
          <Button
            onClick={() => submit(false)}
            disabled={!canAttempt || busy || !allAnswered}
            type="button"
          >
            {busy ? <Spinner size={16} /> : <Icon name="send" size={15} />}
            Submit answers
          </Button>
        </div>
      ) : null}
    </div>
  );
}
