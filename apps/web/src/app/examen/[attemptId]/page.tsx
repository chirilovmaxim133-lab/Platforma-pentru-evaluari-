import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { attempts, tests } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { DICTS } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/client";
import { hiddenTrapText } from "@/lib/ai/trap";
import { DEADLINE_GRACE_MS, finalizeAttempt, loadQuestions } from "@/lib/tests/service";
import { toStudentQuestion } from "@/lib/tests/student-view";
import { ExamRunner } from "./ExamRunner";

export const metadata = { robots: { index: false } };

export default async function ExamPage({ params }: PageProps<"/examen/[attemptId]">) {
  const { attemptId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) notFound();
  const user = await requireUser("student", `/examen/${attemptId}`);
  const [row] = await db
    .select({ attempt: attempts, test: tests })
    .from(attempts)
    .innerJoin(tests, eq(tests.id, attempts.testId))
    .where(eq(attempts.id, attemptId))
    .limit(1);
  if (!row || row.attempt.studentId !== user.id) notFound();
  const { attempt, test } = row;

  if (attempt.status === "submitted") redirect(`/examen/${attemptId}/rezultat`);
  if (attempt.deadlineAt && Date.now() > attempt.deadlineAt.getTime() + DEADLINE_GRACE_MS) {
    await finalizeAttempt(attempt.id, "timeout");
    redirect(`/examen/${attemptId}/rezultat`);
  }

  const qs = await loadQuestions(test.id);
  const byId = new Map(qs.map((q) => [q.id, q]));
  const ordered = attempt.questionOrder.map((id) => byId.get(id)).filter((q) => !!q);
  const studentQuestions = ordered.map((q) => toStudentQuestion(q, attempt.optionOrder[q.id]));
  const locale = test.language;

  return (
    <I18nProvider locale={locale} t={DICTS[locale]}>
      <div lang={locale}>
        <ExamRunner
          attemptId={attempt.id}
          testTitle={test.title}
          watermarkText={`${user.firstName} ${user.lastName}${user.className ? ` · ${user.className}` : ""}`}
          questions={studentQuestions}
          initialAnswers={attempt.answers}
          initialTelemetry={attempt.telemetry}
          startedAt={attempt.startedAt.getTime()}
          deadlineAt={attempt.deadlineAt?.getTime() ?? null}
          serverNow={Date.now()}
          violationCount={attempt.violationCount}
          security={test.settings.security}
          allowBack={test.settings.allowBackNavigation}
          trapText={hiddenTrapText(test.settings.aiTrap, locale, attempt.canary)}
        />
      </div>
    </I18nProvider>
  );
}
