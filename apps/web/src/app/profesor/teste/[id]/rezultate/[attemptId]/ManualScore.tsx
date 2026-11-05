"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { NumberInput } from "@/components/NumberInput";
import { Button } from "@/components/ui";
import { setManualScoreAction } from "@/app/profesor/actions";

export function ManualScore({
  testId,
  attemptId,
  questionId,
  max,
  current,
  suggested,
}: {
  testId: string;
  attemptId: string;
  questionId: string;
  max: number;
  current: number | null;
  suggested: number | null;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [value, setValue] = useState<number | null>(current);
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);

  const save = (v: number | null) =>
    start(async () => {
      await setManualScoreAction(testId, attemptId, questionId, v);
      setDone(true);
      router.refresh();
      setTimeout(() => setDone(false), 1500);
    });

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label>
        <span className="mb-1 block text-xs font-bold text-ink-3">{t.attempt.manualPoints}</span>
        <span className="flex items-center gap-2">
          <NumberInput value={value} allowEmpty min={0} max={max} onChange={setValue} className="h-10 w-20" />
          <span className="text-sm font-semibold text-ink-3">/ {max}</span>
        </span>
      </label>
      <Button size="sm" variant="primary" disabled={pending} onClick={() => save(value)}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : done ? <Check className="size-4" /> : null} {t.attempt.setPoints}
      </Button>
      {suggested !== null && suggested !== value ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => {
            setValue(suggested);
            save(suggested);
          }}
        >
          <Sparkles className="size-4 text-sun" /> {suggested}
        </Button>
      ) : null}
    </div>
  );
}
