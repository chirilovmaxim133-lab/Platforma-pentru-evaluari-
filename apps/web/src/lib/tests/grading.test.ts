import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTotals, gradeFromPercent, scoreQuestion } from "./grading";
import { normalizeAnswer, parseNumberAnswer } from "./normalize";
import { DEFAULT_THRESHOLDS } from "./presets";

const q = (data: Parameters<typeof scoreQuestion>[0]["data"], points = 2) => ({ id: "q", points, data });

test("single choice", () => {
  const qq = q({ type: "single", options: [{ id: "a", text: "" }, { id: "b", text: "" }], correctIds: ["b"] });
  assert.equal(scoreQuestion(qq, "b"), 2);
  assert.equal(scoreQuestion(qq, "a"), 0);
  assert.equal(scoreQuestion(qq, undefined), 0);
});

test("multiple choice: all-or-nothing and partial credit", () => {
  const options = ["a", "b", "c", "d"].map((id) => ({ id, text: "" }));
  const strict = q({ type: "multiple", options, correctIds: ["a", "c"], partialCredit: false }, 4);
  assert.equal(scoreQuestion(strict, ["a", "c"]), 4);
  assert.equal(scoreQuestion(strict, ["a"]), 0);
  const partial = q({ type: "multiple", options, correctIds: ["a", "c"], partialCredit: true }, 4);
  assert.equal(scoreQuestion(partial, ["a"]), 2);
  // un răspuns corect și unul greșit se anulează
  assert.equal(scoreQuestion(partial, ["a", "b"]), 0);
  assert.equal(scoreQuestion(partial, ["a", "b", "c", "d"]), 0);
});

test("short answers tolerate Romanian diacritics variants and punctuation", () => {
  const qq = q({ type: "short", accepted: ["Ștefan cel Mare"], caseSensitive: false, ignoreDiacritics: false });
  assert.equal(scoreQuestion(qq, "ştefan cel mare."), 2); // sedilă în loc de virgulă
  assert.equal(scoreQuestion(qq, "  Ștefan   cel Mare "), 2);
  assert.equal(scoreQuestion(qq, "Stefan cel Mare"), 0);
  const loose = q({ type: "short", accepted: ["Ștefan cel Mare"], caseSensitive: false, ignoreDiacritics: true });
  assert.equal(scoreQuestion(loose, "Stefan cel Mare"), 2);
});

test("Russian: ignoreDiacritics maps ё→е but keeps й", () => {
  assert.equal(normalizeAnswer("Ёжик", { ignoreDiacritics: true }), "ежик");
  assert.equal(normalizeAnswer("йод", { ignoreDiacritics: true }), "йод");
});

test("numbers accept decimal comma", () => {
  assert.equal(parseNumberAnswer("3,14"), 3.14);
  assert.equal(parseNumberAnswer(" 1 000 "), 1000);
  assert.equal(parseNumberAnswer("abc"), null);
  const qq = q({ type: "number", value: 1.25, tolerance: 0 });
  assert.equal(scoreQuestion(qq, "1,25"), 2);
  assert.equal(scoreQuestion(qq, "1.3"), 0);
});

test("long answers need manual grading unless empty", () => {
  const qq = q({ type: "long", minWords: null, maxWords: null, rubric: "" }, 5);
  assert.equal(scoreQuestion(qq, "Un text"), null);
  assert.equal(scoreQuestion(qq, "   "), 0);
});

test("grade scale 1–10", () => {
  assert.equal(gradeFromPercent(0, DEFAULT_THRESHOLDS), 1);
  assert.equal(gradeFromPercent(14.99, DEFAULT_THRESHOLDS), 1);
  assert.equal(gradeFromPercent(15, DEFAULT_THRESHOLDS), 2);
  assert.equal(gradeFromPercent(54, DEFAULT_THRESHOLDS), 5);
  assert.equal(gradeFromPercent(95, DEFAULT_THRESHOLDS), 10);
  assert.equal(gradeFromPercent(100, DEFAULT_THRESHOLDS), 10);
});

test("totals: manual scores override and pending long answers", () => {
  const qs = [
    { id: "a", points: 2, data: { type: "truefalse" as const, correct: true } },
    { id: "b", points: 8, data: { type: "long" as const, minWords: null, maxWords: null, rubric: "" } },
  ];
  const grading = { mode: "grade10" as const, thresholds: DEFAULT_THRESHOLDS };
  const pending = computeTotals(qs, { a: 2, b: null }, {}, grading);
  assert.equal(pending.complete, false);
  assert.equal(pending.score, 2);
  const graded = computeTotals(qs, { a: 2, b: null }, { b: 7.5 }, grading);
  assert.equal(graded.complete, true);
  assert.equal(graded.score, 9.5);
  assert.equal(graded.percent, 95);
  assert.equal(graded.grade, 10);
  // punctajul manual nu poate depăși maximul întrebării
  assert.equal(computeTotals(qs, { a: 2, b: null }, { b: 100 }, grading).score, 10);
});
