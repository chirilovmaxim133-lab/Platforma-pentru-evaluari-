"use client";

import { useEffect, useState } from "react";
import { cn } from "./ui";

/**
 * Câmp numeric care permite scrierea liberă („0,” → „0,5”) și acceptă virgula zecimală.
 * Valoarea se transmite doar când textul este un număr valid.
 */
export function NumberInput({
  value,
  onChange,
  min,
  max,
  allowEmpty,
  className,
  ...rest
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  allowEmpty?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState(value === null ? "" : String(value));

  useEffect(() => {
    const parsed = Number(text.replace(",", "."));
    if (value === null ? text !== "" : parsed !== value) setText(value === null ? "" : String(value));
    // Sincronizăm doar când valoarea vine din exterior (ex. resetare).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      {...rest}
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        if (raw.trim() === "") {
          if (allowEmpty) onChange(null);
          return;
        }
        const n = Number(raw.replace(",", "."));
        if (Number.isFinite(n)) onChange(Math.min(Math.max(n, min ?? -Infinity), max ?? Infinity));
      }}
      onBlur={() => setText(value === null ? "" : String(value))}
      className={cn(
        "h-11 rounded-xl border border-line bg-card px-3 text-center font-semibold tabular-nums focus:border-blue focus:outline-none focus:ring-4 focus:ring-blue/15",
        className,
      )}
    />
  );
}
