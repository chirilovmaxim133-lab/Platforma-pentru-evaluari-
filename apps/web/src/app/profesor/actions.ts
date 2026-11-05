"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { and, eq, notInArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { attempts, questions, tests } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { runLlmAnalysis } from "@/lib/ai/analyze";
import { defaultSettings } from "@/lib/tests/presets";
import { generateAccessCode } from "@/lib/tests/random";
import {
  finalizeAllInProgress,
  getOwnedTest,
  loadQuestions,
  recomputeTestGrades,
  recomputeTotals,
  validateForPublish,
  type PublishIssue,
} from "@/lib/tests/service";
import { editorPayloadSchema, type EditorPayload } from "@/lib/tests/types";

async function ownedOrThrow(testId: string) {
  const user = await requireUser("teacher");
  const test = await getOwnedTest(testId, user);
  if (!test) throw new Error("Test not found");
  return { user, test };
}

async function hasAttempts(testId: string): Promise<boolean> {
  const [row] = await db.select({ id: attempts.id }).from(attempts).where(eq(attempts.testId, testId)).limit(1);
  return !!row;
}

export async function createTestAction() {
  const user = await requireUser("teacher");
  const [test] = await db
    .insert(tests)
    .values({ ownerId: user.id, title: "", language: user.locale, settings: defaultSettings() })
    .returning({ id: tests.id });
  redirect(`/profesor/teste/${test.id}`);
}

export type SaveResult = { ok: true; savedAt: string; locked: boolean } | { ok: false };

export async function saveTestAction(testId: string, payload: EditorPayload): Promise<SaveResult> {
  const { test } = await ownedOrThrow(testId);
  const parsed = editorPayloadSchema.safeParse(payload);
  if (!parsed.success) return { ok: false };
  const data = parsed.data;
  const locked = await hasAttempts(testId);
  const gradingChanged = JSON.stringify(test.settings.grading) !== JSON.stringify(data.settings.grading);

  await db.transaction(async (tx) => {
    await tx
      .update(tests)
      .set({
        title: data.title,
        description: data.description,
        subject: data.subject,
        // După ce elevii au început, întrebările și limba rămân neschimbate, ca rezultatele să fie comparabile.
        language: locked ? test.language : data.language,
        settings: data.settings,
        updatedAt: new Date(),
      })
      .where(eq(tests.id, testId));

    if (locked) return;
    const ids = data.questions.map((q) => q.id);
    await tx
      .delete(questions)
      .where(ids.length ? and(eq(questions.testId, testId), notInArray(questions.id, ids)) : eq(questions.testId, testId));
    for (const [position, q] of data.questions.entries()) {
      const row = {
        testId,
        position,
        type: q.data.type,
        prompt: q.prompt,
        imageUrl: q.imageUrl,
        points: q.points,
        data: q.data,
      };
      await tx
        .insert(questions)
        .values({ id: q.id, ...row })
        .onConflictDoUpdate({ target: questions.id, set: row, setWhere: eq(questions.testId, testId) });
    }
  });

  if (locked && gradingChanged) await recomputeTestGrades(testId);
  return { ok: true, savedAt: new Date().toISOString(), locked };
}

export type PublishResult = { ok: true } | { ok: false; issues: PublishIssue[] };

export async function publishTestAction(testId: string): Promise<PublishResult> {
  const { test } = await ownedOrThrow(testId);
  const issues = validateForPublish(test, await loadQuestions(testId));
  if (issues.length) return { ok: false, issues };

  if (test.accessCode) {
    await db.update(tests).set({ status: "published", publishedAt: new Date(), closedAt: null }).where(eq(tests.id, testId));
    return { ok: true };
  }
  for (let i = 0; i < 8; i++) {
    try {
      await db
        .update(tests)
        .set({ status: "published", publishedAt: new Date(), closedAt: null, accessCode: generateAccessCode() })
        .where(eq(tests.id, testId));
      return { ok: true };
    } catch (err) {
      // Coliziune de cod (index unic) — încercăm alt cod.
      if (i === 7) throw err;
    }
  }
  return { ok: true };
}

export async function closeTestAction(testId: string) {
  await ownedOrThrow(testId);
  await db.update(tests).set({ status: "closed", closedAt: new Date() }).where(eq(tests.id, testId));
  const finalized = await finalizeAllInProgress(testId, "teacher");
  after(async () => {
    for (const id of finalized) await runLlmAnalysis(id);
  });
}

export async function reopenTestAction(testId: string) {
  await ownedOrThrow(testId);
  await db.update(tests).set({ status: "published", closedAt: null }).where(eq(tests.id, testId));
}

export async function duplicateTestAction(testId: string) {
  const { user, test } = await ownedOrThrow(testId);
  const qs = await loadQuestions(testId);
  const [copy] = await db
    .insert(tests)
    .values({
      ownerId: user.id,
      title: test.title ? `${test.title} (2)` : "",
      description: test.description,
      subject: test.subject,
      language: test.language,
      settings: test.settings,
    })
    .returning({ id: tests.id });
  if (qs.length) {
    await db.insert(questions).values(
      qs.map((q) => ({
        id: crypto.randomUUID(),
        testId: copy.id,
        position: q.position,
        type: q.type,
        prompt: q.prompt,
        imageUrl: q.imageUrl,
        points: q.points,
        data: q.data,
      })),
    );
  }
  redirect(`/profesor/teste/${copy.id}`);
}

export async function deleteTestAction(testId: string) {
  await ownedOrThrow(testId);
  await db.delete(tests).where(eq(tests.id, testId));
  redirect("/profesor");
}

export async function setManualScoreAction(testId: string, attemptId: string, questionId: string, points: number | null) {
  await ownedOrThrow(testId);
  const q = (await loadQuestions(testId)).find((x) => x.id === questionId);
  if (!q) return;
  const value = points === null || !Number.isFinite(points) ? null : Math.min(Math.max(points, 0), q.points);
  await db
    .update(attempts)
    .set({
      manualScores:
        value === null
          ? sql`${attempts.manualScores} - ${questionId}::text`
          : sql`${attempts.manualScores} || jsonb_build_object(${questionId}::text, ${value}::float8)`,
    })
    .where(and(eq(attempts.id, attemptId), eq(attempts.testId, testId)));
  await recomputeTotals(attemptId);
}

export async function rerunAiAnalysisAction(testId: string, attemptId: string) {
  await ownedOrThrow(testId);
  const [a] = await db
    .select({ id: attempts.id })
    .from(attempts)
    .where(and(eq(attempts.id, attemptId), eq(attempts.testId, testId)))
    .limit(1);
  if (!a) return;
  after(() => runLlmAnalysis(attemptId));
}
