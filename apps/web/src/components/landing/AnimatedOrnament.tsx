"use client";

import { motion, useReducedMotion } from "motion/react";
import { cells, MOTIFS } from "@/components/Ornament";

/** Motivul se „coase” cruce cu cruce, din centru spre margini. */
export function AnimatedOrnament({
  motif = "star",
  className,
  delay = 0,
  loop = false,
}: {
  motif?: keyof typeof MOTIFS;
  className?: string;
  delay?: number;
  loop?: boolean;
}) {
  const reduce = useReducedMotion();
  const grid = MOTIFS[motif];
  const w = grid[0].length;
  const h = grid.length;
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  return (
    <svg viewBox={`0 0 ${w * 10} ${h * 10}`} className={className} aria-hidden>
      {cells(grid).map(({ x, y, c }) => {
        const d = Math.abs(x - cx) + Math.abs(y - cy);
        return (
          <motion.g
            key={`${x}-${y}`}
            stroke={c}
            strokeWidth="2.6"
            strokeLinecap="round"
            initial={reduce ? false : { opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: delay + d * 0.06,
              duration: 0.35,
              ease: "backOut",
              ...(loop ? { repeat: Infinity, repeatType: "reverse" as const, repeatDelay: 2.5 } : {}),
            }}
            style={{ transformOrigin: `${x * 10 + 5}px ${y * 10 + 5}px` }}
          >
            <line x1={x * 10 + 1.8} y1={y * 10 + 1.8} x2={x * 10 + 8.2} y2={y * 10 + 8.2} />
            <line x1={x * 10 + 8.2} y1={y * 10 + 1.8} x2={x * 10 + 1.8} y2={y * 10 + 8.2} />
          </motion.g>
        );
      })}
    </svg>
  );
}
