import { cache } from "react";
import { cookies, headers } from "next/headers";
import type { Locale } from "@/lib/db/schema";
import { ro, type Dict } from "./ro";
import { ru } from "./ru";

export type { Dict };
export const DICTS: Record<Locale, Dict> = { ro, ru };
export const LOCALE_COOKIE = "lang";

export function isLocale(v: unknown): v is Locale {
  return v === "ro" || v === "ru";
}

/** Limba interfeței: alegerea explicită (cookie) → limba browserului → română. */
export const getLocale = cache(async (): Promise<Locale> => {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const accept = (await headers()).get("accept-language") ?? "";
  const first = accept.split(",")[0]?.trim().slice(0, 2).toLowerCase();
  return first === "ru" ? "ru" : "ro";
});

export async function getDict(): Promise<{ locale: Locale; t: Dict }> {
  const locale = await getLocale();
  return { locale, t: DICTS[locale] };
}

export { fmt } from "./fmt";

/**
 * Secțiunile care descriu metodele de verificare (capcana AI, semnalele, analiza) nu ajung în paginile
 * văzute de elevi: dicționarul trimis browserului le are goale pentru oricine nu este profesor.
 */
const TEACHER_ONLY = ["settings", "presets", "aiSignals", "attempt", "editor", "results", "share", "teacher"] as const;

function blank<T>(v: T): T {
  if (typeof v === "string") return "" as T;
  if (Array.isArray(v)) return v.map(blank) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, blank(x)])) as T;
  return v;
}

export function clientDict(t: Dict, role: string | null | undefined): Dict {
  if (role === "teacher" || role === "admin") return t;
  const copy = { ...t };
  for (const k of TEACHER_ONLY) (copy as Record<string, unknown>)[k] = blank(t[k]);
  return copy;
}
