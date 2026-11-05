import { test } from "node:test";
import assert from "node:assert/strict";
import { averagesBy, classAverage, fmtAvg, mean, summarize, type Result } from "./stats";

const r = (grade: number | null, day: number, extra: Partial<Result> = {}): Result => ({
  attemptId: `a${day}`,
  testId: `t${day}`,
  classId: "c1",
  title: `Test ${day}`,
  subject: "Matematică",
  at: new Date(2026, 8, day),
  status: "submitted",
  complete: true,
  visible: true,
  grade,
  percent: grade === null ? 50 : grade * 10,
  ...extra,
});

test("mean rounds to two decimals", () => {
  assert.equal(mean([7, 8, 8]), 7.67);
  assert.equal(mean([]), null);
});

test("averages are formatted like in the class register", () => {
  assert.equal(fmtAvg(8.5, "ro"), "8,50");
  assert.equal(fmtAvg(null, "ro"), "—");
});

test("summary ignores ungraded, unfinished and percent-only results", () => {
  const s = summarize([
    r(6, 1),
    r(7, 2),
    r(null, 3), // test în procente
    r(9, 4, { complete: false }), // eseu necorectat încă
    r(8, 5, { status: "in_progress" }),
    r(9, 6),
    r(10, 7),
  ]);
  assert.equal(s.graded, 4);
  assert.equal(s.average, 8);
  assert.equal(s.best, 10);
  assert.equal(s.last, 10);
});

test("trend compares the last three grades with the three before", () => {
  const s = summarize([r(5, 1), r(6, 2), r(7, 3), r(8, 4), r(9, 5), r(10, 6)]);
  assert.equal(s.trend, 3);
  assert.equal(summarize([r(5, 1), r(6, 2), r(7, 3)]).trend, null);
});

test("class average is the mean of student averages", () => {
  // Ana are 3 teste (media 10), Ion are un test (nota 6): media clasei 8, nu 9.
  const avg = classAverage(new Map([["ana", [10, 10, 10]], ["ion", [6]], ["nou", []]]));
  assert.equal(avg, 8);
  assert.equal(classAverage(new Map()), null);
});

test("averages grouped by subject", () => {
  const m = averagesBy(
    [
      { grade: 8, subject: "Matematică" },
      { grade: 10, subject: "Matematică" },
      { grade: 7, subject: "Istorie" },
    ],
    (x) => x.subject,
  );
  assert.equal(m.get("Matematică"), 9);
  assert.equal(m.get("Istorie"), 7);
});
