import type { Attempt, Question } from "@/lib/db/schema";
import { similarPairs } from "./similarity";

export type PeerMatch = { questionId: string; otherAttemptId: string; similarity: number };

/** Pentru fiecare lucrare: răspunsurile deschise care seamănă suspect de mult cu ale unui coleg. */
export function peerSimilarity(questions: Question[], attempts: Pick<Attempt, "id" | "answers">[]): Map<string, PeerMatch[]> {
  const out = new Map<string, PeerMatch[]>();
  for (const q of questions) {
    if (q.data.type !== "long") continue;
    const texts = attempts
      .map((a) => ({ id: a.id, text: typeof a.answers[q.id] === "string" ? (a.answers[q.id] as string) : "" }))
      .filter((x) => x.text);
    for (const p of similarPairs(texts)) {
      const sim = Math.round(p.similarity * 100);
      out.set(p.a, [...(out.get(p.a) ?? []), { questionId: q.id, otherAttemptId: p.b, similarity: sim }]);
      out.set(p.b, [...(out.get(p.b) ?? []), { questionId: q.id, otherAttemptId: p.a, similarity: sim }]);
    }
  }
  return out;
}
