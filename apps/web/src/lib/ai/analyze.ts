import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { attempts, tests } from "@/lib/db/schema";
import { loadQuestions } from "@/lib/tests/service";
import { buildReport, combine, levelFor } from "./heuristics";
import { analyzeLongAnswer, llmConfigured } from "./llm";
import type { AiReport, AiSignal, LlmVerdict } from "./types";

/**
 * Rulează după predare (în fundal): trimite fiecare răspuns deschis la analiza AI
 * și adaugă rezultatul în raportul încercării.
 */
export async function runLlmAnalysis(attemptId: string): Promise<void> {
  const [attempt] = await db.select().from(attempts).where(eq(attempts.id, attemptId)).limit(1);
  if (!attempt || attempt.status !== "submitted") return;
  const [test] = await db.select().from(tests).where(eq(tests.id, attempt.testId)).limit(1);
  const base = attempt.aiReport ?? buildReport([]);

  const longOnes = (await loadQuestions(test.id)).filter((q) => {
    const a = attempt.answers[q.id];
    return q.data.type === "long" && typeof a === "string" && a.trim().split(/\s+/).length >= 20;
  });

  if (!test.settings.aiAnalysis.enabled || !llmConfigured() || longOnes.length === 0) {
    await saveReport(attemptId, { ...base, llmStatus: "skipped" });
    return;
  }
  await saveReport(attemptId, { ...base, llmStatus: "pending" });

  const llm: Record<string, LlmVerdict> = { ...(base.llm ?? {}) };
  let failed = false;
  for (const q of longOnes) {
    if (llm[q.id]) continue;
    const t = attempt.telemetry[q.id];
    try {
      const verdict = await analyzeLongAnswer({
        locale: test.language,
        question: q.prompt,
        rubric: q.data.type === "long" ? q.data.rubric : "",
        maxPoints: q.points,
        answer: String(attempt.answers[q.id]),
        telemetry: t
          ? { typedChars: t.typedChars, pastedChars: t.pastedChars, pasteCount: t.pasteCount, activeSeconds: Math.round(t.activeMs / 1000) }
          : null,
      });
      if (verdict) llm[q.id] = verdict;
      else failed = true;
    } catch (err) {
      console.error("AI analysis failed", { attemptId, questionId: q.id, err });
      failed = true;
    }
  }

  const signals: AiSignal[] = base.signals.filter((s) => s.code !== "llm_likely_ai");
  for (const [questionId, v] of Object.entries(llm)) {
    if (v.likelihood >= 70) {
      signals.push({ code: "llm_likely_ai", questionId, weight: Math.round(v.likelihood * 0.6), data: { n: v.likelihood } });
    }
  }
  const score = combine(signals);
  await saveReport(attemptId, {
    ...base,
    signals,
    score,
    level: levelFor(score),
    llm,
    llmStatus: failed && Object.keys(llm).length === 0 ? "error" : "done",
    analyzedAt: new Date().toISOString(),
  });
}

async function saveReport(attemptId: string, report: AiReport) {
  await db.update(attempts).set({ aiReport: report }).where(eq(attempts.id, attemptId));
}
