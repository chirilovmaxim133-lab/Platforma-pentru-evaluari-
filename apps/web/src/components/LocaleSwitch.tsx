"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocaleAction } from "@/lib/i18n/actions";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "./ui";

export function LocaleSwitch({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div
      role="group"
      aria-label={t.common.language}
      className={cn("inline-flex rounded-full border border-line bg-card p-0.5 text-xs font-bold", pending && "opacity-60", className)}
    >
      {(["ro", "ru"] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={locale === l}
          onClick={() =>
            start(async () => {
              await setLocaleAction(l);
              router.refresh();
            })
          }
          className={cn(
            "rounded-full px-3 py-1.5 uppercase transition-colors",
            locale === l ? "bg-ink text-paper" : "text-ink-2 hover:text-ink",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
