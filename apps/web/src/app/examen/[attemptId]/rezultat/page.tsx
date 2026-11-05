import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { attempts, tests } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { DICTS, fmt } from "@/lib/i18n";
import { loadQuestions } from "@/lib/tests/service";
import { scoreQuestion } from "@/lib/tests/grading";
import { correctAnswerText, formatAnswer } from "@/lib/tests/display";
import { MathText } from "@/components/MathText";
import { Ornament } from "@/components/Ornament";
import { btn, Card, cn } from "@/components/ui";
import { ResultHero } from "./ResultHero";

export default async function ResultPage({ params, searchParams }: PageProps<"/examen/[attemptId]/rezultat">) {
  const [{ attemptId }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) notFound();
  const user = await requireUser("student", `/examen/${attemptId}/rezultat`);
  const [row] = await db
    .select({ attempt: attempts, test: tests })
    .from(attempts)
    .innerJoin(tests, eq(tests.id, attempts.testId))
    .where(eq(attempts.id, attemptId))
    .limit(1);
  if (!row || row.attempt.studentId !== user.id) notFound();
  const { attempt, test } = row;
  if (attempt.status !== "submitted") redirect(`/examen/${attemptId}`);

  const t = DICTS[test.language];
  const { showScore, showCorrectAnswers } = test.settings.results;
  const reasonText =
    attempt.submitReason === "timeout"
      ? t.result.reasonTimeout
      : attempt.submitReason === "violations"
        ? t.result.reasonViolations
        : attempt.submitReason === "teacher"
          ? t.result.reasonTeacher
          : sp.auto
            ? t.exam.autoSubmitted
            : null;

  const qs = showCorrectAnswers ? await loadQuestions(test.id) : [];
  const ordered = showCorrectAnswers
    ? attempt.questionOrder.map((id) => qs.find((q) => q.id === id)).filter((q) => !!q)
    : [];

  return (
    <main lang={test.language} className="mx-auto max-w-2xl px-4 py-10">
      <Card className="relative overflow-hidden px-6 py-12 text-center sm:px-10">
        <Ornament motif="band" className="absolute -left-10 top-6 hidden w-48 opacity-20 sm:block" />
        <Ornament motif="band" className="absolute -right-10 bottom-6 hidden w-48 opacity-20 sm:block" />
        <p className="text-sm font-bold uppercase tracking-wider text-ink-3">{test.title}</p>
        <h1 className="mt-2 font-display text-3xl font-bold">{t.result.title}</h1>
        {reasonText ? <p className="mx-auto mt-3 max-w-sm rounded-2xl bg-sun-soft px-4 py-2 text-sm font-semibold">{reasonText}</p> : null}
        {showScore && attempt.gradingComplete ? (
          <ResultHero
            mode={test.settings.grading.mode}
            grade={attempt.grade}
            percent={attempt.percent ?? 0}
            label={test.settings.grading.mode === "grade10" ? t.result.grade : t.result.percent}
            points={fmt(t.result.points, { score: attempt.score ?? 0, max: attempt.maxScore ?? 0 })}
          />
        ) : showScore ? (
          <div className="mt-8">
            <p className="font-display text-2xl font-bold">{fmt(t.result.points, { score: attempt.score ?? 0, max: attempt.maxScore ?? 0 })}</p>
            <p className="mx-auto mt-3 max-w-sm text-ink-2">{t.result.pendingManual}</p>
          </div>
        ) : (
          <p className="mt-8 text-ink-2">{t.result.hidden}</p>
        )}
      </Card>

      {ordered.length ? (
        <section className="mt-10">
          <h2 className="font-display text-xl font-bold">{t.result.review}</h2>
          <ol className="mt-4 space-y-3">
            {ordered.map((q, i) => {
              const v = attempt.answers[q.id];
              const manual = attempt.manualScores[q.id];
              const earned = typeof manual === "number" ? manual : scoreQuestion(q, v);
              const correct = correctAnswerText(q.data, t);
              return (
                <li key={q.id}>
                  <Card className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold">
                        {i + 1}. <MathText text={q.prompt} />
                      </p>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold",
                          earned === null ? "bg-sun-soft" : earned >= q.points ? "bg-green-soft text-green" : earned > 0 ? "bg-sun-soft" : "bg-red-soft text-red",
                        )}
                      >
                        {earned === null ? "…" : earned}/{q.points}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-ink-3">{t.result.yourAnswer}</p>
                    <p className="whitespace-pre-wrap">
                      <MathText text={formatAnswer(q.data, v, t)} />
                    </p>
                    {correct ? (
                      <>
                        <p className="mt-2 text-sm text-ink-3">{t.result.correctAnswer}</p>
                        <p className="font-semibold text-green">
                          <MathText text={correct} />
                        </p>
                      </>
                    ) : null}
                  </Card>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      <div className="mt-10 text-center">
        <Link href="/elev" className={btn("outline", "lg")}>
          {t.result.backHome}
        </Link>
      </div>
    </main>
  );
}
