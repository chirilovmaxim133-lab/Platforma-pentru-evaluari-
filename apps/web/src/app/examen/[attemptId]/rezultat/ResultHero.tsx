"use client";

import { useEffect, useState } from "react";
import { animate, motion } from "motion/react";

const PALETTE = ["#c8283c", "#f2b32a", "#1f4fd8", "#1f8a5b"];

/** Nota „se numără” până la valoarea finală; pentru notele mari apar romburi ca niște confetti. */
export function ResultHero({
  mode,
  grade,
  percent,
  label,
  points,
}: {
  mode: "grade10" | "percent";
  grade: number | null;
  percent: number;
  label: string;
  points: string;
}) {
  const target = mode === "grade10" ? (grade ?? 1) : Math.round(percent);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const c = animate(0, target, { duration: 1.4, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setShown(Math.round(v)) });
    return () => c.stop();
  }, [target]);
  const great = mode === "grade10" ? target >= 9 : target >= 85;

  return (
    <div className="relative mt-8">
      {great
        ? Array.from({ length: 18 }).map((_, i) => (
            <motion.span
              key={i}
              aria-hidden
              className="absolute left-1/2 top-1/2 size-3 rotate-45"
              style={{ background: PALETTE[i % PALETTE.length] }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
              animate={{
                x: Math.cos((i / 18) * Math.PI * 2) * (120 + (i % 3) * 30),
                y: Math.sin((i / 18) * Math.PI * 2) * (90 + (i % 4) * 20),
                opacity: 0,
                scale: 1,
              }}
              transition={{ duration: 1.6, delay: 1.1, ease: "easeOut" }}
            />
          ))
        : null}
      <p className="text-sm font-bold uppercase tracking-wider text-ink-3">{label}</p>
      <motion.p
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 140, damping: 12 }}
        className="font-display text-[7rem] font-bold leading-none tracking-tight text-red sm:text-[9rem]"
      >
        {shown}
        {mode === "percent" ? <span className="text-5xl">%</span> : null}
      </motion.p>
      <p className="mt-2 font-semibold text-ink-2">{points}</p>
    </div>
  );
}
