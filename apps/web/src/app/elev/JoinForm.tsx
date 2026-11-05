"use client";

import { useActionState, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { Button, cn } from "@/components/ui";
import { joinByCodeAction } from "./actions";

const LEN = 6;

/** Șase căsuțe pentru cod, ca pe tablă: „ABC 123”. Lipirea întregului cod funcționează. */
export function JoinForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(joinByCodeAction, undefined);
  const [chars, setChars] = useState<string[]>(Array(LEN).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const setFrom = (start: number, text: string) => {
    const clean = text.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, LEN - start);
    if (!clean) return;
    const next = [...chars];
    [...clean].forEach((c, i) => (next[start + i] = c));
    setChars(next);
    refs.current[Math.min(start + clean.length, LEN - 1)]?.focus();
  };

  return (
    <form action={action}>
      <input type="hidden" name="code" value={chars.join("")} />
      <div className="flex justify-center gap-2 sm:gap-3">
        {chars.map((c, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={c}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            aria-label={`${i + 1}`}
            maxLength={LEN}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) {
                const next = [...chars];
                next[i] = "";
                setChars(next);
              } else setFrom(i, v.length > 1 ? v : v);
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !chars[i] && i > 0) refs.current[i - 1]?.focus();
            }}
            onPaste={(e) => {
              e.preventDefault();
              setFrom(i, e.clipboardData.getData("text"));
            }}
            className={cn(
              "h-16 w-12 rounded-2xl border-2 border-line bg-card text-center font-display text-2xl font-bold uppercase focus:border-red focus:outline-none sm:h-20 sm:w-16 sm:text-3xl",
              i === 2 && "mr-2 sm:mr-4",
            )}
          />
        ))}
      </div>
      {state?.error ? <p className="mt-4 text-center text-sm font-semibold text-red">{state.error}</p> : null}
      <div className="mt-6 flex justify-center">
        <Button type="submit" variant="red" size="lg" disabled={pending || chars.join("").length < LEN}>
          {t.student.joinButton} <ArrowRight className="size-5" />
        </Button>
      </div>
    </form>
  );
}
