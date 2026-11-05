import { cn } from "./ui";

/**
 * Motive tradiționale de cusătură în cruce, desenate dintr-o grilă:
 * „X” = roșu de ie, „K” = negru de cusătură, „o” = ocru (galben de spic).
 * Roșul și negrul pe pânză albă sunt culorile cele mai caracteristice iei din Basarabia.
 */
export const MOTIFS = {
  /** Steaua în opt colțuri — lumina, călăuza. */
  star: [
    "........X........",
    ".......XoX.......",
    "......XX.XX......",
    "...XXXX...XXXX...",
    "...XK...K...KX...",
    "...X.KKKKKKK.X...",
    "..XX.K.....K.XX..",
    ".XX..K.ooo.K..XX.",
    "Xo..KK.oXo.KK..oX",
    ".XX..K.ooo.K..XX.",
    "..XX.K.....K.XX..",
    "...X.KKKKKKK.X...",
    "...XK...K...KX...",
    "...XXXX...XXXX...",
    "......XX.XX......",
    ".......XoX.......",
    "........X........",
  ],
  /** Rombul cu coarne — semn de ocrotire. */
  rhombus: [
    ".....KK...KK.....",
    ".......KXK.......",
    "........X........",
    ".......X.X.......",
    "......X.K.X......",
    "K....X.K.K.X....K",
    "K...X.K.o.K.X...K",
    ".K.X.K.o.o.K.X.K.",
    ".XX.K.o.X.o.K.XX.",
    ".K.X.K.o.o.K.X.K.",
    "K...X.K.o.K.X...K",
    "K....X.K.K.X....K",
    "......X.K.X......",
    ".......X.X.......",
    "........X........",
    ".......KXK.......",
    ".....KK...KK.....",
  ],
  /** Pomul vieții — creșterea, legătura dintre generații. */
  tree: [
    "......o......",
    ".....XoX.....",
    "......X......",
    "..o...K...o..",
    ".XoX..K..XoX.",
    "..X.X.K.X.X..",
    ".....XKX.....",
    "..o...K...o..",
    ".XoX..K..XoX.",
    "..X.X.K.X.X..",
    ".....XKX.....",
    "......K......",
    "....XXKXX....",
    "...X.....X...",
    "..XXXXXXXXX..",
  ],
  /** Spicul — rodul muncii. */
  wheat: [
    "...o...",
    "..o.o..",
    ".o.K.o.",
    "..oKo..",
    ".o.K.o.",
    "..oKo..",
    ".o.K.o.",
    "..oKo..",
    "...K...",
    "...K...",
    "..K.K..",
    ".K...K.",
  ],
  small: ["..X..", ".XoX.", "XoXoX", ".XoX.", "..X.."],
  /** Bandă îngustă de romburi, pentru antet și separatoare subțiri. */
  bandSmall: [
    "...X....",
    "..X.X...",
    ".X.o.X..",
    "X.oKo.XK",
    ".X.o.X..",
    "..X.X...",
    "...X....",
  ],
  /** O perioadă din altiță — banda brodată de pe umărul iei; se repetă pe orizontală. */
  band: [
    "K.K.K.K.K.K.",
    ".X..X..X..X.",
    "............",
    "......X.....",
    ".....X.X....",
    "....X.K.X...",
    "K..X.K.K.X..",
    "XKX.K.o.K.XK",
    "K..X.K.K.X..",
    "....X.K.X...",
    ".....X.X....",
    "......X.....",
    "............",
    ".X..X..X..X.",
    "K.K.K.K.K.K.",
  ],
} as const;

export type MotifName = keyof typeof MOTIFS;
/** „light” — pe pânză deschisă; „dark” — pe fond întunecat (covor), unde firul negru devine alb de in. */
export type StitchTone = "light" | "dark" | "mono";

export function stitchColor(ch: string, tone: StitchTone): string | null {
  if (ch === ".") return null;
  if (tone === "mono") return "currentColor";
  if (ch === "X") return "var(--red)";
  if (ch === "o") return "var(--sun)";
  if (ch === "K") return tone === "dark" ? "var(--night-ink)" : "var(--ink)";
  return null;
}

export function cells(motif: readonly string[], tone: StitchTone = "light") {
  const out: { x: number; y: number; c: string }[] = [];
  motif.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const c = stitchColor(ch, tone);
      if (c) out.push({ x, y, c });
    }),
  );
  return out;
}

/** O cruciuliță de cusătură în celula (x, y) a unei grile de 10 unități. */
export function Stitch({ x, y, c }: { x: number; y: number; c: string }) {
  return (
    <g stroke={c} strokeWidth="2.8" strokeLinecap="round">
      <line x1={x * 10 + 2} y1={y * 10 + 2} x2={x * 10 + 8} y2={y * 10 + 8} />
      <line x1={x * 10 + 8} y1={y * 10 + 2} x2={x * 10 + 2} y2={y * 10 + 8} />
    </g>
  );
}

export function Ornament({
  motif = "star",
  tone = "light",
  className,
  title,
}: {
  motif?: MotifName;
  tone?: StitchTone;
  className?: string;
  title?: string;
}) {
  const grid = MOTIFS[motif];
  return (
    <svg
      viewBox={`0 0 ${grid[0].length * 10} ${grid.length * 10}`}
      className={cn("block", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      {cells(grid, tone).map((s) => (
        <Stitch key={`${s.x}-${s.y}`} {...s} />
      ))}
    </svg>
  );
}

/**
 * Altița: banda brodată care se repetă pe toată lățimea (model SVG, oricât de lat e ecranul).
 */
export function EmbroideryBand({
  tone = "light",
  height = 30,
  className,
  id = "altita",
  variant = height < 24 ? "small" : "wide",
}: {
  tone?: StitchTone;
  height?: number;
  className?: string;
  id?: string;
  variant?: "small" | "wide";
}) {
  const grid = variant === "small" ? MOTIFS.bandSmall : MOTIFS.band;
  const w = grid[0].length * 10;
  const h = grid.length * 10;
  const scale = height / h;
  const patternId = `${id}-${tone}`;
  return (
    <svg aria-hidden className={cn("block w-full", className)} style={{ height }} preserveAspectRatio="none">
      <defs>
        <pattern id={patternId} width={w * scale} height={height} patternUnits="userSpaceOnUse">
          <g transform={`scale(${scale})`}>
            {cells(grid, tone).map((s) => (
              <Stitch key={`${s.x}-${s.y}`} {...s} />
            ))}
          </g>
        </pattern>
      </defs>
      <rect width="100%" height={height} fill={`url(#${patternId})`} />
    </svg>
  );
}
