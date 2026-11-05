import { foldText } from "@/lib/tests/normalize";

/** Fragmente de câte `size` cuvinte consecutive — două texte copiate unul după altul au multe în comun. */
export function shingles(text: string, size = 4): Set<string> {
  const words = foldText(text).split(" ").filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + size <= words.length; i++) out.add(words.slice(i, i + size).join(" "));
  return out;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  for (const s of small) if (big.has(s)) inter++;
  return inter / (a.size + b.size - inter);
}

export type SimilarPair = { a: string; b: string; similarity: number };

/** Perechi de răspunsuri suspect de asemănătoare la aceeași întrebare (ids = id-urile încercărilor). */
export function similarPairs(
  answers: { id: string; text: string }[],
  { minWords = 25, threshold = 0.35 } = {},
): SimilarPair[] {
  const prepared = answers
    .filter((x) => x.text.trim().split(/\s+/).length >= minWords)
    .map((x) => ({ id: x.id, set: shingles(x.text) }));
  const pairs: SimilarPair[] = [];
  for (let i = 0; i < prepared.length; i++) {
    for (let j = i + 1; j < prepared.length; j++) {
      const sim = jaccard(prepared[i].set, prepared[j].set);
      if (sim >= threshold) pairs.push({ a: prepared[i].id, b: prepared[j].id, similarity: sim });
    }
  }
  return pairs.sort((x, y) => y.similarity - x.similarity);
}
