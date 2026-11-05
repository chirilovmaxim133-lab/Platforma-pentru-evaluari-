/** Cum a fost scris un răspuns text: cât a fost tastat și cât a fost lipit. Colectat de pagina de examen. */
export type WritingTelemetry = {
  typedChars: number;
  pastedChars: number;
  pasteCount: number;
  largestPaste: number;
  /** Cel mai mare bloc de text apărut dintr-odată fără lipire (ex. dictare, sugestii de tastatură). */
  largestBurst: number;
  deletedChars: number;
  /** Timpul activ de scriere, în milisecunde. */
  activeMs: number;
  /** Momentele (ms de la începutul testului) când s-a lipit text — pentru corelarea cu ieșirile din test. */
  pasteAt: number[];
};

export const AI_SIGNAL_CODES = [
  "trap_canary",
  "trap_keyword",
  "paste_heavy",
  "paste_after_leave",
  "typing_too_fast",
  "similar_to_peer",
  "llm_likely_ai",
  "blocked_paste_attempts",
] as const;
export type AiSignalCode = (typeof AI_SIGNAL_CODES)[number];

export type AiSignal = {
  code: AiSignalCode;
  questionId?: string;
  /** Cât de puternic este semnalul, 0–100. */
  weight: number;
  data?: Record<string, string | number>;
};

export type LlmVerdict = {
  likelihood: number;
  reasons: string[];
  followUpQuestion: string;
  suggestedPoints: number | null;
  feedback: string;
  model: string;
};

export type AiReport = {
  level: "none" | "low" | "medium" | "high";
  score: number;
  signals: AiSignal[];
  llm?: Record<string, LlmVerdict>;
  llmStatus?: "pending" | "done" | "skipped" | "error";
  analyzedAt: string;
};

export function emptyTelemetry(): WritingTelemetry {
  return {
    typedChars: 0,
    pastedChars: 0,
    pasteCount: 0,
    largestPaste: 0,
    largestBurst: 0,
    deletedChars: 0,
    activeMs: 0,
    pasteAt: [],
  };
}
