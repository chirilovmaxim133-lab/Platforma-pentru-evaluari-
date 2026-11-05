import type { EditorQuestion, QuestionData, QuestionType } from "./types";

const uid = () => crypto.randomUUID();
const optionId = () => Math.random().toString(36).slice(2, 10);

export function emptyData(type: QuestionType): QuestionData {
  switch (type) {
    case "single":
      return { type, options: [{ id: optionId(), text: "" }, { id: optionId(), text: "" }, { id: optionId(), text: "" }], correctIds: [] };
    case "multiple":
      return { type, options: [{ id: optionId(), text: "" }, { id: optionId(), text: "" }, { id: optionId(), text: "" }], correctIds: [], partialCredit: true };
    case "truefalse":
      return { type, correct: true };
    case "short":
      return { type, accepted: [""], caseSensitive: false, ignoreDiacritics: true };
    case "number":
      return { type, value: 0, tolerance: 0 };
    case "long":
      return { type, minWords: null, maxWords: null, rubric: "" };
  }
}

export function newQuestion(type: QuestionType): EditorQuestion {
  return { id: uid(), prompt: "", imageUrl: null, points: type === "long" ? 5 : 1, data: emptyData(type) };
}

/** Schimbă tipul păstrând cât se poate din conținut (enunț, variante). */
export function convertQuestion(q: EditorQuestion, type: QuestionType): EditorQuestion {
  if (q.data.type === type) return q;
  const next = emptyData(type);
  const from = q.data;
  if ((from.type === "single" || from.type === "multiple") && (next.type === "single" || next.type === "multiple")) {
    next.options = from.options;
    next.correctIds = next.type === "single" ? from.correctIds.slice(0, 1) : from.correctIds;
  }
  return { ...q, data: next, points: type === "long" && q.points < 2 ? 5 : q.points };
}

export function newOptionId(): string {
  return optionId();
}
