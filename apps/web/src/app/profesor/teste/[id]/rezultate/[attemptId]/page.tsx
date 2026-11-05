import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { ArrowLeft, Clock, MessageCircleQuestion, Monitor, ShieldAlert, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { attemptEvents, attempts, users } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { fmt, getDict } from "@/lib/i18n";
import { peerSimilarity } from "@/lib/ai/peer-similarity";
import type { AiSignal } from "@/lib/ai/types";
import { getOwnedTest, loadQuestions } from "@/lib/tests/service";
import { scoreQuestion } from "@/lib/tests/grading";
import { correctAnswerText, formatAnswer } from "@/lib/tests/display";
import { AutoRefresh } from "@/components/AutoRefresh";
import { MathText } from "@/components/MathText";
import { Badge, Card, cn } from "@/components/ui";
import { ManualScore } from "./ManualScore";

const mmss = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export default async function AttemptPage({ params }: PageProps<"/profesor/teste/[id]/rezultate/[attemptId]">) {
  const { id, attemptId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) notFound();
  const user = await requireUser("teacher");
  const test = await getOwnedTest(id, user);
  if (!test) notFound();
  const { t, locale } = await getDict();

  const [row] = await db
    .select({ a: attempts, firstName: users.firstName, lastName: users.lastName, className: users.className, schoolName: users.schoolName })
    .from(attempts)
    .innerJoin(users, eq(users.id, attempts.studentId))
    .where(and(eq(attempts.id, attemptId), eq(attempts.testId, id)))
    .limit(1);
  if (!row) notFound();
  const a = row.a;

  const [qs, events, peers] = await Promise.all([
    loadQuestions(id),
    db.select().from(attemptEvents).where(eq(attemptEvents.attemptId, attemptId)).orderBy(asc(attemptEvents.at)),
    db
      .select({ id: attempts.id, answers: attempts.answers, firstName: users.firstName, lastName: users.lastName })
      .from(attempts)
      .innerJoin(users, eq(users.id, attempts.studentId))
      .where(and(eq(attempts.testId, id), eq(attempts.status, "submitted"))),
  ]);
  const byId = new Map(qs.map((q) => [q.id, q]));
  const ordered = a.questionOrder.map((qid) => byId.get(qid)).filter((q) => !!q);
  const similar = (peerSimilarity(qs, peers).get(a.id) ?? []).map((m) => ({
    ...m,
    name: (() => {
      const p = peers.find((x) => x.id === m.otherAttemptId);
      return p ? `${p.lastName} ${p.firstName}` : "?";
    })(),
  }));

  const report = a.aiReport;
  const signals: AiSignal[] = report?.signals ?? [];
  const level = report?.level ?? "none";
  const isGrade = test.settings.grading.mode === "grade10";
  const timeFmt = new Intl.DateTimeFormat(locale === "ru" ? "ru-MD" : "ro-MD", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });
  const shownEvents = events.filter((e) => !["started", "submitted"].includes(e.type));
  const qNumber = (qid?: string) => (qid ? a.questionOrder.indexOf(qid) + 1 : 0);
  const signalText = (s: AiSignal) => fmt(t.aiSignals[s.code], (s.data ?? {}) as Record<string, string | number>);

  return (
    <div>
      <AutoRefresh enabled={a.status === "in_progress" || report?.llmStatus === "pending"} />
      <Link href={`/profesor/teste/${id}/rezultate`} className="inline-flex items-center gap-2 text-sm font-semibold text-ink-3 hover:text-ink">
        <ArrowLeft className="size-4" /> {t.attempt.back}
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {row.lastName} {row.firstName}
          </h1>
          <p className="mt-1 text-ink-2">{[row.className, row.schoolName].filter(Boolean).join(" · ")}</p>
        </div>
        {a.status === "submitted" ? (
          <div className="text-right">
            <div className="font-display text-5xl font-bold text-red">{isGrade ? a.grade : `${Math.round(a.percent ?? 0)}%`}</div>
            <div className="text-sm font-semibold text-ink-3">
              {a.score} / {a.maxScore} {t.common.pts}
              {!a.gradingComplete ? <Badge tone="sun" className="ml-2">{t.results.needsGrading}</Badge> : null}
            </div>
          </div>
        ) : (
          <Badge tone="blue">{t.results.statusLabel.in_progress}</Badge>
        )}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {[
          [Clock, t.attempt.started, timeFmt.format(a.startedAt)],
          [Clock, t.attempt.duration, a.submittedAt ? mmss(a.submittedAt.getTime() - a.startedAt.getTime()) : "…"],
          [
            ShieldAlert,
            t.attempt.exits,
            String(test.settings.security.allowLeave ? events.filter((e) => e.type === "leave" || e.type === "app_background").length : a.violationCount),
          ],
          [Monitor, "", t.attempt.client[a.client]],
        ].map(([Icon, label, value], i) => {
          const I = Icon as typeof Clock;
          return (
            <Card key={i} className="flex items-center gap-3 px-4 py-3">
              <I className="size-5 text-ink-3" />
              <div>
                {label ? <div className="text-xs font-semibold text-ink-3">{label as string}</div> : null}
                <div className="font-bold">{value as string}</div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className={cn("p-5 sm:p-6", level === "high" && "border-red/40", level === "medium" && "border-sun/60")}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              <Sparkles className="size-5 text-sun" /> {t.attempt.aiPanel}
            </h2>
            {level !== "none" ? (
              <Badge tone={level === "high" ? "red" : level === "medium" ? "sun" : "blue"}>
                {t.results.aiLevel[level]} · {report?.score}%
              </Badge>
            ) : null}
          </div>
          {signals.length === 0 && similar.length === 0 ? (
            <p className="mt-4 text-ink-3">{t.attempt.aiNone}</p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {signals.map((s, i) => (
                <li key={i} className="flex gap-3 rounded-2xl bg-paper-2 px-4 py-3 text-sm">
                  <span className={cn("mt-1 size-2 shrink-0 rounded-full", s.weight >= 80 ? "bg-red" : s.weight >= 50 ? "bg-sun" : "bg-blue")} />
                  <span>
                    {s.questionId ? <strong>{fmt(t.exam.question, { n: qNumber(s.questionId) })}: </strong> : null}
                    {signalText(s)}
                  </span>
                </li>
              ))}
              {similar.map((m, i) => (
                <li key={`sim-${i}`} className="flex gap-3 rounded-2xl bg-paper-2 px-4 py-3 text-sm">
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-sun" />
                  <span>
                    <strong>{fmt(t.exam.question, { n: qNumber(m.questionId) })}: </strong>
                    {fmt(t.attempt.similarTo, { n: m.similarity, name: m.name })}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {report?.llmStatus === "pending" ? <p className="mt-4 text-sm font-semibold text-ink-3">{t.attempt.llmPending}</p> : null}
          {report?.llmStatus === "error" ? <p className="mt-4 text-sm font-semibold text-red">{t.attempt.llmError}</p> : null}
          <p className="mt-4 text-xs leading-relaxed text-ink-3">{t.attempt.aiDisclaimer}</p>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold">{t.attempt.timeline}</h2>
          {shownEvents.length === 0 ? (
            <p className="mt-4 text-ink-3">{t.attempt.timelineEmpty}</p>
          ) : (
            <ol className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
              {shownEvents.map((e) => (
                <li key={e.id} className="flex items-center gap-3 text-sm">
                  <span className="w-12 shrink-0 font-mono text-xs text-ink-3">{mmss(e.at.getTime() - a.startedAt.getTime())}</span>
                  <span className={cn("size-2 shrink-0 rounded-full", e.counted ? "bg-red" : e.type === "return" ? "bg-green" : "bg-ink-3")} />
                  <span className={cn(e.counted && "font-bold text-red")}>{t.events[e.type as keyof typeof t.events] ?? e.type}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <ol className="mt-8 space-y-4">
        {ordered.map((q, i) => {
          const v = a.answers[q.id];
          const auto = scoreQuestion(q, v);
          const manual = a.manualScores[q.id];
          const correct = correctAnswerText(q.data, t);
          const tm = a.telemetry[q.id];
          const llm = report?.llm?.[q.id];
          return (
            <li key={q.id}>
              <Card className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold leading-relaxed">
                    <span className="mr-2 inline-grid size-7 place-items-center rounded-lg bg-ink text-xs font-bold text-paper">{i + 1}</span>
                    <MathText text={q.prompt} />
                  </p>
                  <Badge tone={typeof manual === "number" || auto !== null ? ((manual ?? auto ?? 0) >= q.points ? "green" : (manual ?? auto ?? 0) > 0 ? "sun" : "red") : "sun"}>
                    {typeof manual === "number" ? manual : auto ?? "…"} / {q.points}
                  </Badge>
                </div>
                <p className="mt-4 text-xs font-bold uppercase tracking-wide text-ink-3">{t.attempt.answer}</p>
                <div className="mt-1 whitespace-pre-wrap rounded-2xl bg-paper-2 px-4 py-3">
                  {v === undefined || v === null || v === "" ? <span className="text-ink-3">{t.attempt.noAnswer}</span> : <MathText text={formatAnswer(q.data, v, t)} />}
                </div>
                {correct ? (
                  <p className="mt-3 text-sm">
                    <span className="font-bold text-ink-3">{t.attempt.correct}: </span>
                    <span className="font-semibold text-green">
                      <MathText text={correct} />
                    </span>
                  </p>
                ) : null}
                {tm && (q.type === "long" || q.type === "short") ? (
                  <p className="mt-3 text-xs text-ink-3">
                    {t.attempt.writing}: {tm.typedChars} {t.attempt.typed} · {tm.pastedChars} {t.attempt.pasted} ({tm.pasteCount} {t.attempt.pastes}) · {mmss(tm.activeMs)} {t.attempt.activeTime}
                  </p>
                ) : null}
                {llm ? (
                  <div className="mt-4 rounded-2xl border border-sun/50 bg-sun-soft/50 p-4 text-sm">
                    <p className="flex items-center gap-2 font-bold">
                      <Sparkles className="size-4 text-sun" /> {t.attempt.llmTitle} — {fmt(t.attempt.llmLikelihood, { n: llm.likelihood })}
                    </p>
                    {llm.reasons.length ? (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-2">
                        {llm.reasons.map((r, j) => (
                          <li key={j}>{r}</li>
                        ))}
                      </ul>
                    ) : null}
                    {llm.feedback ? <p className="mt-2 text-ink-2">{llm.feedback}</p> : null}
                    <p className="mt-3 flex items-start gap-2 font-semibold">
                      <MessageCircleQuestion className="mt-0.5 size-4 shrink-0 text-blue" />
                      <span>
                        {t.attempt.llmFollowUp}: <span className="font-normal">{llm.followUpQuestion}</span>
                      </span>
                    </p>
                    {llm.suggestedPoints !== null ? <p className="mt-2 text-ink-2">{fmt(t.attempt.llmSuggested, { n: llm.suggestedPoints })}</p> : null}
                  </div>
                ) : null}
                {a.status === "submitted" ? (
                  <div className="mt-4 border-t border-line pt-4">
                    <ManualScore
                      testId={id}
                      attemptId={a.id}
                      questionId={q.id}
                      max={q.points}
                      current={typeof manual === "number" ? manual : auto}
                      suggested={llm?.suggestedPoints ?? null}
                    />
                  </div>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
