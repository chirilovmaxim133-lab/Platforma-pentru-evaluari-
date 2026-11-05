"use client";

import { motion, useReducedMotion } from "motion/react";
import { cells, MOTIFS, type MotifName, type StitchTone } from "@/components/Ornament";

/** Motivul se „coase” cruciuliță cu cruciuliță, din centru spre margini. */
export function AnimatedOrnament({
  motif = "star",
  tone = "light",
  className,
  delay = 0,
  step = 0.05,
}: {
  motif?: MotifName;
  tone?: StitchTone;
  className?: string;
  delay?: number;
  step?: number;
}) {
  const reduce = useReducedMotion();
  const grid = MOTIFS[motif];
  const w = grid[0].length;
  const h = grid.length;
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  return (
    <svg viewBox={`0 0 ${w * 10} ${h * 10}`} className={className} aria-hidden>
      {cells(grid, tone).map(({ x, y, c }) => {
        const d = Math.abs(x - cx) + Math.abs(y - cy);
        return (
          <motion.g
            key={`${x}-${y}`}
            stroke={c}
            strokeWidth="2.8"
            strokeLinecap="round"
            initial={reduce ? false : { opacity: 0, scale: 0.2 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: delay + d * step, duration: 0.35, ease: "backOut" }}
            style={{ transformOrigin: `${x * 10 + 5}px ${y * 10 + 5}px` }}
          >
            <line x1={x * 10 + 2} y1={y * 10 + 2} x2={x * 10 + 8} y2={y * 10 + 8} />
            <line x1={x * 10 + 8} y1={y * 10 + 2} x2={x * 10 + 2} y2={y * 10 + 8} />
          </motion.g>
        );
      })}
    </svg>
  );
}
