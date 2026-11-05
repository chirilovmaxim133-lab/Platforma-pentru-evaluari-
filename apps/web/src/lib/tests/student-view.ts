import type { Question } from "@/lib/db/schema";
import type { QuestionOption, QuestionType } from "./types";

/** Ce vede elevul despre o întrebare: niciodată răspunsurile corecte sau baremul. */
export type StudentQuestion = {
  id: string;
  type: QuestionType;
  prompt: string;
  imageUrl: string | null;
  points: number;
  options?: QuestionOption[];
  minWords?: number | null;
  maxWords?: number | null;
};

export function toStudentQuestion(q: Question, optionOrder?: string[]): StudentQuestion {
  const base: StudentQuestion = {
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    imageUrl: q.imageUrl,
    points: q.points,
  };
  const d = q.data;
  if (d.type === "single" || d.type === "multiple") {
    const byId = new Map(d.options.map((o) => [o.id, o]));
    const ordered = optionOrder?.map((id) => byId.get(id)).filter((o): o is QuestionOption => !!o);
    base.options = ordered && ordered.length === d.options.length ? ordered : d.options;
  }
  if (d.type === "long") {
    base.minWords = d.minWords;
    base.maxWords = d.maxWords;
  }
  return base;
}
