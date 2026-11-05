/**
 * Normalizarea răspunsurilor scurte, astfel încât „Ştefan”, „Ștefan ” și „ștefan.” să fie același răspuns.
 * Pe tastaturile vechi „ş/ţ” (cu sedilă) apar în loc de „ș/ț” (cu virgulă) — le unificăm mereu.
 */
export function normalizeAnswer(
  input: string,
  opts: { caseSensitive?: boolean; ignoreDiacritics?: boolean } = {},
): string {
  let s = input
    .normalize("NFC")
    .replace(/ş/g, "ș")
    .replace(/Ş/g, "Ș")
    .replace(/ţ/g, "ț")
    .replace(/Ţ/g, "Ț")
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„«»]/g, '"')
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?…]+$/u, "")
    .trim();

  if (!opts.caseSensitive) s = s.toLocaleLowerCase("ro");

  if (opts.ignoreDiacritics) {
    // ё → е pentru rusă; la literele latine eliminăm semnele diacritice (ă, â, î, ș, ț).
    // Literele chirilice precum „й” rămân neatinse.
    s = s
      .replace(/ё/g, "е")
      .replace(/Ё/g, "Е")
      .normalize("NFD")
      .replace(/([A-Za-z])\p{M}+/gu, "$1")
      .normalize("NFC");
  }
  return s;
}

/** Acceptă atât „3,14” cât și „3.14”, plus spații ca separator de mii. */
export function parseNumberAnswer(input: string): number | null {
  const cleaned = input.trim().replace(/\s+/g, "").replace(",", ".");
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Text simplificat pentru comparații (capcane AI, similaritate): fără diacritice, fără punctuație. */
export function foldText(input: string): string {
  return normalizeAnswer(input, { ignoreDiacritics: true })
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function countWords(input: string): number {
  const t = input.trim();
  return t ? t.split(/\s+/u).length : 0;
}
