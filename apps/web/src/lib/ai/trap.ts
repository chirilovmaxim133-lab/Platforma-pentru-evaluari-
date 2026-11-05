import { foldText } from "@/lib/tests/normalize";
import { pick } from "@/lib/tests/random";
import type { Locale } from "@/lib/db/schema";
import { CANARY_WORDS } from "./trap-text";

export { hiddenTrapText } from "./trap-text";

export function pickCanary(locale: Locale): string {
  return pick(CANARY_WORDS[locale]);
}

/**
 * Cuvintele lungi se caută după rădăcină, ca să prindem și formele flexionate:
 * „clepsidră” se găsește în „clepsidrei”, „пеликан” în „пеликаном”.
 * Cuvintele scurte (sub 5 litere) și expresiile se caută întocmai, ca „far” să nu apară în „farfurie”.
 */
export function findTrapWords(text: string, words: string[]): string[] {
  const hay = ` ${foldText(text)} `;
  const found: string[] = [];
  for (const word of words) {
    const w = foldText(word);
    if (w.length < 3) continue;
    const needle =
      w.includes(" ") || w.length < 5 ? ` ${w} ` : ` ${w.slice(0, w.length - (w.length >= 6 ? 2 : 1))}`;
    if (hay.includes(needle)) found.push(word);
  }
  return found;
}
