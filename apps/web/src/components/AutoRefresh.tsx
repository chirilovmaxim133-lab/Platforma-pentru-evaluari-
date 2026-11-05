"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Reîmprospătează datele paginii la câteva secunde (doar cât timp fila este vizibilă). */
export function AutoRefresh({ everyMs = 5000, enabled = true }: { everyMs?: number; enabled?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!enabled) return;
    const h = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, everyMs);
    return () => clearInterval(h);
  }, [router, everyMs, enabled]);
  return null;
}
