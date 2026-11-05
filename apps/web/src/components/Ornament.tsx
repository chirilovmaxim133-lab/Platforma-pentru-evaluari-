import { cn } from "./ui";

/**
 * Motive de cusătură în cruce, desenate dintr-o grilă: „X” = roșu, „o” = galben, „b” = albastru.
 * Sunt inspirate din romburile și „cârligele” broderiilor tradiționale.
 */
export const MOTIFS = {
  star: [
    "......X......",
    ".....XoX.....",
    "....XX.XX....",
    "...XX.b.XX...",
    "..XX.bbb.XX..",
    ".XX.bb.bb.XX.",
    "XoX.b.o.b.XoX",
    ".XX.bb.bb.XX.",
    "..XX.bbb.XX..",
    "...XX.b.XX...",
    "....XX.XX....",
    ".....XoX.....",
    "......X......",
  ],
  small: [
    "..X..",
    ".XoX.",
    "XoboX",
    ".XoX.",
    "..X..",
  ],
  band: [
    "...X.......X....",
    "..XoX.....XoX...",
    ".XX.XX...XX.XX..",
    "XX.b.XX.XX.b.XX.",
    ".XX.XX...XX.XX..",
    "..XoX.....XoX...",
    "...X.......X....",
  ],
} as const;

const COLORS: Record<string, string> = { X: "var(--red)", o: "var(--sun)", b: "var(--blue)" };

export function cells(motif: readonly string[]) {
  const out: { x: number; y: number; c: string }[] = [];
  motif.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (COLORS[ch]) out.push({ x, y, c: COLORS[ch] });
    }),
  );
  return out;
}

export function Ornament({
  motif = "star",
  className,
  title,
}: {
  motif?: keyof typeof MOTIFS;
  className?: string;
  title?: string;
}) {
  const grid = MOTIFS[motif];
  const w = grid[0].length;
  const h = grid.length;
  return (
    <svg
      viewBox={`0 0 ${w * 10} ${h * 10}`}
      className={cn("block", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      {cells(grid).map(({ x, y, c }) => (
        <g key={`${x}-${y}`} transform={`translate(${x * 10 + 5} ${y * 10 + 5})`} stroke={c} strokeWidth="2.6" strokeLinecap="round">
          <line x1="-3.2" y1="-3.2" x2="3.2" y2="3.2" />
          <line x1="3.2" y1="-3.2" x2="-3.2" y2="3.2" />
        </g>
      ))}
    </svg>
  );
}
