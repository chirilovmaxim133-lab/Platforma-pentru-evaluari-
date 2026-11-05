import { findTrapWords } from "./trap";
import type { AiReport, AiSignal, WritingTelemetry } from "./types";
import type { AnswerValue, QuestionType, TestSettings } from "@/lib/tests/types";

type Q = { id: string; type: QuestionType };
type Ev = { type: string; at: Date; counted: boolean };

export const LEAVE_EVENTS = new Set(["leave", "fullscreen_exit", "app_background"]);

/** Combină semnalele independente: 1 − Π(1 − wᵢ). Un singur semnal puternic contează mai mult decât multe slabe. */
export function combine(signals: AiSignal[]): number {
  const p = signals.reduce((acc, s) => acc * (1 - Math.min(Math.max(s.weight, 0), 99) / 100), 1);
  return Math.round((1 - p) * 100);
}

export function levelFor(score: number): AiReport["level"] {
  if (score >= 80) return "high";
  if (score >= 50) return "medium";
  if (score >= 20) return "low";
  return "none";
}

/**
 * Semnalele proprii ale platformei, calculate la predarea testului. Niciunul nu este o dovadă în sine:
 * profesorul vede de ce a apărut fiecare semnal și decide singur (de exemplu, printr-o întrebare orală).
 */
export function computeSignals(input: {
  questions: Q[];
  answers: Record<string, AnswerValue>;
  telemetry: Record<string, WritingTelemetry>;
  events: Ev[];
  startedAt: Date;
  canary: string | null;
  trap: TestSettings["aiTrap"];
}): AiSignal[] {
  const signals: AiSignal[] = [];
  const textQuestions = input.questions.filter((q) => q.type === "long" || q.type === "short");

  for (const q of textQuestions) {
    const answer = input.answers[q.id];
    if (typeof answer !== "string" || !answer.trim()) continue;

    if (input.trap.enabled) {
      if (input.trap.mode === "auto" && input.canary && findTrapWords(answer, [input.canary]).length) {
        signals.push({ code: "trap_canary", questionId: q.id, weight: 95, data: { word: input.canary } });
      }
      if (input.trap.keywords.length) {
        const found = findTrapWords(answer, input.trap.keywords);
        if (found.length) {
          signals.push({ code: "trap_keyword", questionId: q.id, weight: 85, data: { words: found.join(", ") } });
        }
      }
    }

    if (q.type !== "long") continue;
    const t = input.telemetry[q.id];
    if (!t) continue;
    const total = t.typedChars + t.pastedChars;

    if (t.pastedChars >= 80 && total > 0 && t.pastedChars / total >= 0.6) {
      signals.push({
        code: "paste_heavy",
        questionId: q.id,
        weight: 60,
        data: { percent: Math.round((t.pastedChars / total) * 100), chars: t.pastedChars },
      });
    }

    // Text lipit la scurt timp după ce elevul s-a întors în test: tiparul clasic „am ieșit, am întrebat AI-ul, am lipit”.
    const leaves = input.events
      .filter((e) => LEAVE_EVENTS.has(e.type))
      .map((e) => e.at.getTime() - input.startedAt.getTime());
    const suspiciousPaste = t.pasteAt.find((p) => leaves.some((l) => p >= l && p - l <= 120_000));
    if (suspiciousPaste !== undefined && t.largestPaste >= 80) {
      signals.push({ code: "paste_after_leave", questionId: q.id, weight: 80, data: { chars: t.largestPaste } });
    }

    // Blocuri mari apărute dintr-odată fără „lipire” (ex. sugestia de clipboard a tastaturii pe telefon).
    if (t.largestBurst >= 120) {
      signals.push({ code: "paste_heavy", questionId: q.id, weight: 55, data: { burst: t.largestBurst } });
    }

    const seconds = t.activeMs / 1000;
    if (t.typedChars >= 300 && seconds > 0 && t.typedChars / seconds > 12) {
      signals.push({
        code: "typing_too_fast",
        questionId: q.id,
        weight: 45,
        data: { cps: Math.round((t.typedChars / seconds) * 10) / 10 },
      });
    }
  }

  const blockedPastes = input.events.filter((e) => e.type === "paste_blocked").length;
  if (blockedPastes >= 3) signals.push({ code: "blocked_paste_attempts", weight: 30, data: { count: blockedPastes } });

  return signals;
}

export function buildReport(signals: AiSignal[], previous?: AiReport | null): AiReport {
  const score = combine(signals);
  return {
    level: levelFor(score),
    score,
    signals,
    llm: previous?.llm,
    llmStatus: previous?.llmStatus,
    analyzedAt: new Date().toISOString(),
  };
}
