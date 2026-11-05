import { normalizeAnswer, parseNumberAnswer } from "./normalize";
import type { AnswerValue, QuestionData, TestSettings } from "./types";

type GradableQuestion = { id: string; points: number; data: QuestionData };

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Punctajul automat pentru o întrebare. `null` înseamnă că întrebarea trebuie corectată de profesor
 * (răspuns deschis, completat).
 */
export function scoreQuestion(q: GradableQuestion, answer: AnswerValue | undefined): number | null {
  const d = q.data;
  switch (d.type) {
    case "single":
      return typeof answer === "string" && d.correctIds[0] === answer ? q.points : 0;
    case "multiple": {
      if (!Array.isArray(answer) || answer.length === 0) return 0;
      const correct = new Set(d.correctIds);
      const chosen = new Set(answer);
      const hits = [...chosen].filter((id) => correct.has(id)).length;
      const misses = chosen.size - hits;
      if (!d.partialCredit) return hits === correct.size && misses === 0 ? q.points : 0;
      if (correct.size === 0) return 0;
      return round2(Math.max(0, (hits - misses) / correct.size) * q.points);
    }
    case "truefalse":
      return typeof answer === "boolean" && answer === d.correct ? q.points : 0;
    case "short": {
      if (typeof answer !== "string" || !answer.trim()) return 0;
      const opts = { caseSensitive: d.caseSensitive, ignoreDiacritics: d.ignoreDiacritics };
      const given = normalizeAnswer(answer, opts);
      return d.accepted.some((a) => a.trim() && normalizeAnswer(a, opts) === given) ? q.points : 0;
    }
    case "number": {
      if (typeof answer !== "string") return 0;
      const n = parseNumberAnswer(answer);
      if (n === null) return 0;
      return Math.abs(n - d.value) <= d.tolerance + 1e-9 ? q.points : 0;
    }
    case "long":
      return typeof answer === "string" && answer.trim() ? null : 0;
  }
}

export function gradeFromPercent(percent: number, thresholds: number[]): number {
  let grade = 1;
  thresholds.forEach((min, i) => {
    if (percent >= min) grade = i + 2;
  });
  return grade;
}

export type Totals = {
  score: number;
  maxScore: number;
  percent: number;
  grade: number | null;
  complete: boolean;
};

/** Punctajul final: corectarea manuală a profesorului are prioritate față de cea automată. */
export function computeTotals(
  questions: GradableQuestion[],
  autoScores: Record<string, number | null>,
  manualScores: Record<string, number>,
  grading: TestSettings["grading"],
): Totals {
  let score = 0;
  let maxScore = 0;
  let complete = true;
  for (const q of questions) {
    maxScore += q.points;
    const manual = manualScores[q.id];
    const auto = autoScores[q.id];
    if (typeof manual === "number") score += Math.min(Math.max(manual, 0), q.points);
    else if (typeof auto === "number") score += auto;
    else complete = false;
  }
  score = round2(score);
  const percent = maxScore > 0 ? round2((score / maxScore) * 100) : 0;
  return {
    score,
    maxScore: round2(maxScore),
    percent,
    grade: grading.mode === "grade10" ? gradeFromPercent(percent, grading.thresholds) : null,
    complete,
  };
}

export function scoreAll(questions: GradableQuestion[], answers: Record<string, AnswerValue>) {
  const auto: Record<string, number | null> = {};
  for (const q of questions) auto[q.id] = scoreQuestion(q, answers[q.id]);
  return auto;
}
