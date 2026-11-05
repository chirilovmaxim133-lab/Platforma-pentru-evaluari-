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
