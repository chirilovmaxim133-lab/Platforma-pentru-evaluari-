import "server-only";
import { and, asc, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  attemptEvents,
  attempts,
  classMembers,
  questions as questionsTable,
  tests,
  type Attempt,
  type Question,
  type Test,
  type User,
} from "@/lib/db/schema";
import { buildReport, computeSignals } from "@/lib/ai/heuristics";
import { emptyTelemetry, type WritingTelemetry } from "@/lib/ai/types";
import { pickCanary } from "@/lib/ai/trap";
import { computeTotals, scoreAll } from "./grading";
import { shuffled } from "./random";
import type { AnswerValue } from "./types";

/** Câteva secunde de toleranță pentru rețelele lente, după expirarea timpului. */
export const DEADLINE_GRACE_MS = 45_000;

export async function loadQuestions(testId: string): Promise<Question[]> {
  return db.select().from(questionsTable).where(eq(questionsTable.testId, testId)).orderBy(asc(questionsTable.position));
}

export async function getOwnedTest(testId: string, user: User): Promise<Test | null> {
  if (!/^[0-9a-f-]{36}$/i.test(testId)) return null;
  const [test] = await db.select().from(tests).where(eq(tests.id, testId)).limit(1);
  if (!test) return null;
  return test.ownerId === user.id || user.role === "admin" ? test : null;
}

export type PublishIssue = { key: "noTitle" | "noQuestions" | "emptyPrompt" | "emptyOption" | "noCorrect" | "noAccepted" | "zeroPoints"; n?: number };

export function validateForPublish(test: Pick<Test, "title">, qs: Pick<Question, "prompt" | "points" | "data">[]): PublishIssue[] {
  const issues: PublishIssue[] = [];
  if (!test.title.trim()) issues.push({ key: "noTitle" });
  if (qs.length === 0) issues.push({ key: "noQuestions" });
  qs.forEach((q, i) => {
    const n = i + 1;
    if (!q.prompt.trim()) issues.push({ key: "emptyPrompt", n });
    if (q.points <= 0) issues.push({ key: "zeroPoints", n });
    const d = q.data;
    if (d.type === "single" || d.type === "multiple") {
      if (d.options.some((o) => !o.text.trim())) issues.push({ key: "emptyOption", n });
      const ids = new Set(d.options.map((o) => o.id));
      if (!d.correctIds.some((id) => ids.has(id))) issues.push({ key: "noCorrect", n });
    }
    if (d.type === "short" && !d.accepted.some((a) => a.trim())) issues.push({ key: "noAccepted", n });
  });
  return issues;
}

// ---------------------------------------------------------------- începerea testului

export type StartResult =
  | { ok: true; attemptId: string }
  | { ok: false; reason: "closed" | "notPublished" | "appOnly" | "notStudent" | "notInClass" };

export async function startAttempt(test: Test, student: User, client: "web" | "app"): Promise<StartResult> {
  const [existing] = await db
    .select({ id: attempts.id })
    .from(attempts)
    .where(and(eq(attempts.testId, test.id), eq(attempts.studentId, student.id)))
    .limit(1);
  if (existing) return { ok: true, attemptId: existing.id };

  if (student.role !== "student") return { ok: false, reason: "notStudent" };
  if (test.status === "closed") return { ok: false, reason: "closed" };
  if (test.status !== "published") return { ok: false, reason: "notPublished" };
  if (client === "web" && !test.settings.security.allowWebBrowser) return { ok: false, reason: "appOnly" };
  if (test.classId) {
    const [member] = await db
      .select({ id: classMembers.classId })
      .from(classMembers)
      .where(and(eq(classMembers.classId, test.classId), eq(classMembers.studentId, student.id)))
      .limit(1);
    if (!member) return { ok: false, reason: "notInClass" };
  }

  const qs = await loadQuestions(test.id);
  const order = test.settings.shuffleQuestions ? shuffled(qs) : qs;
  const optionOrder: Record<string, string[]> = {};
  for (const q of qs) {
    if (q.data.type === "single" || q.data.type === "multiple") {
      const ids = q.data.options.map((o) => o.id);
      optionOrder[q.id] = test.settings.shuffleOptions ? shuffled(ids) : ids;
    }
  }
  const now = new Date();
  const [created] = await db
    .insert(attempts)
    .values({
      testId: test.id,
      studentId: student.id,
      client,
      startedAt: now,
      lastSeenAt: now,
      deadlineAt: test.settings.timeLimitMinutes ? new Date(now.getTime() + test.settings.timeLimitMinutes * 60_000) : null,
      questionOrder: order.map((q) => q.id),
      optionOrder,
      canary: test.settings.aiTrap.enabled && test.settings.aiTrap.mode === "auto" ? pickCanary(test.language) : null,
    })
    // Două clicuri simultane pe „Încep testul” nu creează două încercări.
    .onConflictDoNothing({ target: [attempts.testId, attempts.studentId] })
    .returning({ id: attempts.id });

  if (created) {
    await db.insert(attemptEvents).values({ attemptId: created.id, type: "started" });
    return { ok: true, attemptId: created.id };
  }
  const [again] = await db
    .select({ id: attempts.id })
    .from(attempts)
    .where(and(eq(attempts.testId, test.id), eq(attempts.studentId, student.id)))
    .limit(1);
  return { ok: true, attemptId: again.id };
}

// ---------------------------------------------------------------- validarea răspunsurilor

const MAX_LONG = 20_000;
const MAX_SHORT = 300;

/** Păstrează doar răspunsurile valide pentru întrebările acestui test. */
export function sanitizeAnswers(qs: Question[], raw: unknown): Record<string, AnswerValue> {
  if (!raw || typeof raw !== "object") return {};
  const input = raw as Record<string, unknown>;
  const out: Record<string, AnswerValue> = {};
  for (const q of qs) {
    const v = input[q.id];
    if (v === undefined || v === null) continue;
    const d = q.data;
    switch (d.type) {
      case "single":
        if (typeof v === "string" && d.options.some((o) => o.id === v)) out[q.id] = v;
        break;
      case "multiple":
        if (Array.isArray(v)) {
          const ids = new Set(d.options.map((o) => o.id));
          out[q.id] = [...new Set(v.filter((x): x is string => typeof x === "string" && ids.has(x)))];
        }
        break;
      case "truefalse":
        if (typeof v === "boolean") out[q.id] = v;
        break;
      case "short":
      case "number":
        if (typeof v === "string") out[q.id] = v.slice(0, MAX_SHORT);
        break;
      case "long":
        if (typeof v === "string") out[q.id] = v.slice(0, MAX_LONG);
        break;
    }
  }
  return out;
}

const clampInt = (v: unknown, max: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(Math.max(Math.round(v), 0), max) : 0;

export function sanitizeTelemetry(qs: Question[], raw: unknown): Record<string, WritingTelemetry> {
  if (!raw || typeof raw !== "object") return {};
  const input = raw as Record<string, Partial<WritingTelemetry>>;
  const out: Record<string, WritingTelemetry> = {};
  for (const q of qs) {
    if (q.type !== "long" && q.type !== "short") continue;
    const t = input[q.id];
    if (!t || typeof t !== "object") continue;
    const base = emptyTelemetry();
    out[q.id] = {
      typedChars: clampInt(t.typedChars, 1_000_000),
      pastedChars: clampInt(t.pastedChars, 1_000_000),
      pasteCount: clampInt(t.pasteCount, 10_000),
      largestPaste: clampInt(t.largestPaste, 1_000_000),
      largestBurst: clampInt(t.largestBurst, 1_000_000),
      deletedChars: clampInt(t.deletedChars, 1_000_000),
      activeMs: clampInt(t.activeMs, 24 * 3600 * 1000),
      pasteAt: Array.isArray(t.pasteAt) ? t.pasteAt.slice(-50).map((x) => clampInt(x, 24 * 3600 * 1000)) : base.pasteAt,
    };
  }
  return out;
}

// ---------------------------------------------------------------- predarea și notarea

type SubmitReason = NonNullable<Attempt["submitReason"]>;

/** Predă și notează o încercare. Idempotent: o încercare deja predată rămâne neschimbată. */
export async function finalizeAttempt(
  attemptId: string,
  reason: SubmitReason,
  final?: { answers?: Record<string, AnswerValue>; telemetry?: Record<string, WritingTelemetry> },
): Promise<Attempt | null> {
  return db.transaction(async (tx) => {
    const [attempt] = await tx.select().from(attempts).where(eq(attempts.id, attemptId)).for("update").limit(1);
    if (!attempt) return null;
    if (attempt.status === "submitted") return attempt;

    const [test] = await tx.select().from(tests).where(eq(tests.id, attempt.testId)).limit(1);
    const qs = await tx.select().from(questionsTable).where(eq(questionsTable.testId, attempt.testId));
    const answers = final?.answers ?? attempt.answers;
    const telemetry = final?.telemetry ? { ...attempt.telemetry, ...final.telemetry } : attempt.telemetry;

    const auto = scoreAll(qs, answers);
    const autoScores = Object.fromEntries(Object.entries(auto).filter((e): e is [string, number] => e[1] !== null));
    const totals = computeTotals(qs, auto, attempt.manualScores, test.settings.grading);

    const events = await tx
      .select({ type: attemptEvents.type, at: attemptEvents.at, counted: attemptEvents.counted })
      .from(attemptEvents)
      .where(eq(attemptEvents.attemptId, attemptId));
    const signals = computeSignals({
      questions: qs,
      answers,
      telemetry,
      events,
      startedAt: attempt.startedAt,
      canary: attempt.canary,
      trap: test.settings.aiTrap,
    });

    const [updated] = await tx
      .update(attempts)
      .set({
        status: "submitted",
        submitReason: reason,
        submittedAt: new Date(),
        answers,
        telemetry,
        autoScores,
        score: totals.score,
        maxScore: totals.maxScore,
        percent: totals.percent,
        grade: totals.grade,
        gradingComplete: totals.complete,
        aiReport: buildReport(signals, attempt.aiReport),
      })
      .where(eq(attempts.id, attemptId))
      .returning();
    await tx.insert(attemptEvents).values({ attemptId, type: "submitted", detail: { reason } });
    return updated;
  });
}

/** Recalculează punctajul după o corectare manuală sau după schimbarea baremului. */
export async function recomputeTotals(attemptId: string): Promise<void> {
  const [attempt] = await db.select().from(attempts).where(eq(attempts.id, attemptId)).limit(1);
  if (!attempt || attempt.status !== "submitted") return;
  const [test] = await db.select().from(tests).where(eq(tests.id, attempt.testId)).limit(1);
  const qs = await loadQuestions(attempt.testId);
  const auto = scoreAll(qs, attempt.answers);
  const totals = computeTotals(qs, auto, attempt.manualScores, test.settings.grading);
  await db
    .update(attempts)
    .set({
      score: totals.score,
      maxScore: totals.maxScore,
      percent: totals.percent,
      grade: totals.grade,
      gradingComplete: totals.complete,
    })
    .where(eq(attempts.id, attemptId));
}

export async function recomputeTestGrades(testId: string): Promise<void> {
  const rows = await db
    .select({ id: attempts.id })
    .from(attempts)
    .where(and(eq(attempts.testId, testId), eq(attempts.status, "submitted")));
  for (const r of rows) await recomputeTotals(r.id);
}

/** Predă automat lucrările al căror timp a expirat (de ex. elevul a închis telefonul). */
export async function finalizeOverdue(testId: string): Promise<string[]> {
  const overdue = await db
    .select({ id: attempts.id })
    .from(attempts)
    .where(
      and(
        eq(attempts.testId, testId),
        eq(attempts.status, "in_progress"),
        lt(attempts.deadlineAt, new Date(Date.now() - DEADLINE_GRACE_MS)),
      ),
    );
  for (const a of overdue) await finalizeAttempt(a.id, "timeout");
  return overdue.map((a) => a.id);
}

export async function finalizeAllInProgress(testId: string, reason: SubmitReason): Promise<string[]> {
  const open = await db
    .select({ id: attempts.id })
    .from(attempts)
    .where(and(eq(attempts.testId, testId), eq(attempts.status, "in_progress")));
  for (const a of open) await finalizeAttempt(a.id, reason);
  return open.map((a) => a.id);
}

// ---------------------------------------------------------------- evenimente (ieșiri din test etc.)

export const CLIENT_EVENT_TYPES = new Set([
  "leave",
  "return",
  "fullscreen_exit",
  "app_background",
  "copy",
  "copy_blocked",
  "paste_blocked",
  "screenshot_key",
  "screenshot_taken",
  "print_blocked",
  "contextmenu_blocked",
]);

const LEAVE_TYPES = new Set(["leave", "fullscreen_exit", "app_background"]);
const SCREENSHOT_TYPES = new Set(["screenshot_key", "screenshot_taken"]);
const MAX_EVENTS_PER_ATTEMPT = 400;

export type EventOutcome = { violationCount: number; counted: boolean; status: Attempt["status"] };

export async function recordEvent(
  attempt: Attempt,
  test: Test,
  type: string,
  detail: Record<string, unknown> | null,
): Promise<EventOutcome> {
  const s = test.settings.security;
  const countable = (!s.allowLeave && LEAVE_TYPES.has(type)) || (!s.allowScreenshots && SCREENSHOT_TYPES.has(type));

  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(attemptEvents)
    .where(eq(attemptEvents.attemptId, attempt.id));
  if (n >= MAX_EVENTS_PER_ATTEMPT) return { violationCount: attempt.violationCount, counted: false, status: attempt.status };

  let counted = false;
  if (countable) {
    // O singură ieșire produce adesea mai multe evenimente (blur + tab ascuns + ieșire din ecran complet).
    const [recent] = await db
      .select({ at: attemptEvents.at })
      .from(attemptEvents)
      .where(and(eq(attemptEvents.attemptId, attempt.id), eq(attemptEvents.counted, true)))
      .orderBy(sql`${attemptEvents.at} desc`)
      .limit(1);
    counted = !recent || Date.now() - recent.at.getTime() > 3000;
  }

  await db.insert(attemptEvents).values({ attemptId: attempt.id, type, counted, detail });
  let violationCount = attempt.violationCount;
  if (counted) {
    const [row] = await db
      .update(attempts)
      .set({ violationCount: sql`${attempts.violationCount} + 1`, lastSeenAt: new Date() })
      .where(eq(attempts.id, attempt.id))
      .returning({ violationCount: attempts.violationCount });
    violationCount = row.violationCount;
    if (violationCount >= s.maxViolations && s.onViolationLimit === "submit") {
      await finalizeAttempt(attempt.id, "violations");
      return { violationCount, counted, status: "submitted" };
    }
  }
  return { violationCount, counted, status: attempt.status };
}

export async function attemptsCountByTest(testIds: string[]) {
  if (testIds.length === 0) return new Map<string, { total: number; submitted: number }>();
  const rows = await db
    .select({
      testId: attempts.testId,
      total: sql<number>`count(*)::int`,
      submitted: sql<number>`count(*) filter (where ${attempts.status} = 'submitted')::int`,
    })
    .from(attempts)
    .where(inArray(attempts.testId, testIds))
    .groupBy(attempts.testId);
  return new Map(rows.map((r) => [r.testId, { total: r.total, submitted: r.submitted }]));
}
