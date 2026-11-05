import { test } from "node:test";
import assert from "node:assert/strict";
import { findTrapWords } from "./trap";
import { similarPairs } from "./similarity";
import { combine, computeSignals, levelFor } from "./heuristics";
import { emptyTelemetry } from "./types";

test("trap words are found in inflected forms", () => {
  assert.deepEqual(findTrapWords("Asemenea unei clepsidre, frunza…", ["clepsidră"]), ["clepsidră"]);
  assert.deepEqual(findTrapWords("Словно пеликаном…", ["пеликан"]), ["пеликан"]);
  assert.deepEqual(findTrapWords("O farfurie mare", ["far"]), []);
  assert.deepEqual(findTrapWords("Lumina farului", ["far"]), []);
  assert.deepEqual(findTrapWords("Un far luminos", ["far"]), ["far"]);
});

test("similar answers between classmates are detected", () => {
  const base =
    "Cercul apare peste tot în viața de zi cu zi: roțile mașinilor, ceasurile de perete, farfuriile și monedele au formă de cerc pentru că această formă se rostogolește ușor și distribuie uniform forța.";
  const pairs = similarPairs([
    { id: "a", text: base },
    { id: "b", text: base.replace("ceasurile de perete", "ceasurile") },
    { id: "c", text: "Eu am văzut cercuri la stadion, pe terenul de baschet și în parc, unde fântâna are o formă rotundă care arată foarte frumos vara când se joacă copiii." },
  ], { minWords: 10 });
  assert.equal(pairs.length, 1);
  assert.deepEqual([pairs[0].a, pairs[0].b].sort(), ["a", "b"]);
});

test("signals: canary, paste after leaving, combined level", () => {
  const startedAt = new Date(0);
  const tm = { ...emptyTelemetry(), typedChars: 10, pastedChars: 600, pasteCount: 1, largestPaste: 600, pasteAt: [65_000] };
  const signals = computeSignals({
    questions: [{ id: "q1", type: "long" }],
    answers: { q1: "Textul conține cuvântul clepsidra undeva." },
    telemetry: { q1: tm },
    events: [{ type: "leave", at: new Date(30_000), counted: true }],
    startedAt,
    canary: "clepsidră",
    trap: { enabled: true, mode: "auto", hiddenText: "", keywords: [] },
  });
  const codes = signals.map((s) => s.code).sort();
  assert.deepEqual(codes, ["paste_after_leave", "paste_heavy", "trap_canary"]);
  assert.equal(levelFor(combine(signals)), "high");
  assert.equal(levelFor(combine([])), "none");
});
