import type { Dict } from "@/lib/i18n/ro";
import type { AnswerValue, QuestionData } from "./types";

export function formatAnswer(data: QuestionData, v: AnswerValue | undefined, t: Dict): string {
  if (v === undefined || v === null || v === "") return "—";
  if (data.type === "single" || data.type === "multiple") {
    const ids = Array.isArray(v) ? v : [String(v)];
    return data.options.filter((o) => ids.includes(o.id)).map((o) => o.text).join("; ") || "—";
  }
  if (data.type === "truefalse") return v ? t.editor.trueLabel : t.editor.falseLabel;
  return String(v);
}

export function correctAnswerText(data: QuestionData, t: Dict): string | null {
  switch (data.type) {
    case "single":
    case "multiple":
      return data.options.filter((o) => data.correctIds.includes(o.id)).map((o) => o.text).join("; ");
    case "truefalse":
      return data.correct ? t.editor.trueLabel : t.editor.falseLabel;
    case "short":
      return data.accepted.filter(Boolean).join(" / ");
    case "number":
      return data.tolerance ? `${data.value} ± ${data.tolerance}` : String(data.value);
    case "long":
      return null;
  }
}
