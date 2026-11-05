"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "./ui";

/*
 * Grafice SVG fără bibliotecă externă, după aceleași reguli peste tot:
 * linie de 2px, puncte de 8px cu inel de 2px în culoarea fundalului, bare de cel mult 24px cu capăt rotunjit,
 * grilă din linii subțiri, textul în culorile textului (nu în culoarea seriei), tooltip la hover și la tastatură.
 * Culoarea seriei: --red (verificată pentru daltonism și contrast, în ambele teme); referința: --blue.
 */

/** Lățimea reală a containerului, ca textul din grafic să rămână la mărimea lui, pe orice ecran. */
function useWidth(fallback = 640) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setW(Math.max(260, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(".", ","));

export type LinePoint = { key: string; label: string; sub?: string; value: number; display?: string };

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: React.ReactNode }) {
  const left = Math.min(Math.max(x, 64), width - 64);
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl border border-line bg-card px-3 py-2 text-xs shadow-lift"
      style={{ left, top: y - 10 }}
    >
      {children}
    </div>
  );
}

export function LineChart({
  points,
  min,
  max,
  ticks,
  reference,
  height = 220,
  ariaLabel,
}: {
  points: LinePoint[];
  min: number;
  max: number;
  ticks: number[];
  reference?: { value: number; label: string };
  height?: number;
  ariaLabel: string;
}) {
  const [ref, W] = useWidth();
  const H = height;
  const pad = { l: 34, r: 48, t: 16, b: 30 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const [active, setActive] = useState<number | null>(null);
  const gid = useId().replace(/:/g, "");

  const xAt = (i: number) => pad.l + (points.length <= 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const yAt = (v: number) => pad.t + ih - ((v - min) / (max - min || 1)) * ih;
  const path = points.map((p, i) => `${i ? "L" : "M"}${xAt(i).toFixed(1)},${yAt(p.value).toFixed(1)}`).join(" ");
  const area = points.length > 1 ? `${path} L${xAt(points.length - 1)},${pad.t + ih} L${xAt(0)},${pad.t + ih} Z` : "";

  const pick = (clientX: number) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box || !points.length) return;
    const vx = ((clientX - box.left) / box.width) * W;
    let best = 0;
    points.forEach((_, i) => {
      if (Math.abs(xAt(i) - vx) < Math.abs(xAt(best) - vx)) best = i;
    });
    setActive(best);
  };

  const last = points[points.length - 1];
  const a = active !== null ? points[active] : null;

  return (
    <div ref={ref} className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="block h-auto max-w-full touch-pan-y select-none outline-none"
        role="img"
        aria-label={ariaLabel}
        tabIndex={0}
        onPointerMove={(e) => pick(e.clientX)}
        onPointerDown={(e) => pick(e.clientX)}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive(points.length - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setActive((i) => Math.max(0, (i ?? points.length) - 1));
          if (e.key === "ArrowRight") setActive((i) => Math.min(points.length - 1, (i ?? -1) + 1));
        }}
      >
        <defs>
          <linearGradient id={`wash-${gid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--red)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--red)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {ticks.map((tk) => (
          <g key={tk}>
            <line x1={pad.l} x2={W - pad.r} y1={yAt(tk)} y2={yAt(tk)} stroke="var(--line)" strokeWidth="1" />
            <text x={pad.l - 8} y={yAt(tk)} dy="0.32em" textAnchor="end" className="fill-ink-3 text-[11px] tabular-nums">
              {tk}
            </text>
          </g>
        ))}
        {reference ? (
          <g>
            <line x1={pad.l} x2={W - pad.r} y1={yAt(reference.value)} y2={yAt(reference.value)} stroke="var(--blue)" strokeWidth="1.5" strokeDasharray="5 5" />
          </g>
        ) : null}
        {area ? <path d={area} fill={`url(#wash-${gid})`} /> : null}
        {points.length > 1 ? <path d={path} fill="none" stroke="var(--red)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /> : null}
        {active !== null ? <line x1={xAt(active)} x2={xAt(active)} y1={pad.t} y2={pad.t + ih} stroke="var(--ink-3)" strokeWidth="1" /> : null}
        {points.map((p, i) => (
          <circle key={p.key} cx={xAt(i)} cy={yAt(p.value)} r={active === i ? 5.5 : 4} fill="var(--red)" stroke="var(--card)" strokeWidth="2" />
        ))}
        {last ? (
          <text x={xAt(points.length - 1) + 10} y={yAt(last.value)} dy="0.32em" className="fill-ink text-[13px] font-bold">
            {last.display ?? fmtNum(last.value)}
          </text>
        ) : null}
        {points.length ? (
          <>
            <text x={xAt(0)} y={H - 8} textAnchor="start" className="fill-ink-3 text-[11px]">
              {points[0].sub ?? points[0].label}
            </text>
            {points.length > 1 ? (
              <text x={xAt(points.length - 1)} y={H - 8} textAnchor="end" className="fill-ink-3 text-[11px]">
                {last.sub ?? last.label}
              </text>
            ) : null}
          </>
        ) : null}
      </svg>
      {reference ? (
        <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-ink-2">
          <svg width="22" height="6" aria-hidden>
            <line x1="0" x2="22" y1="3" y2="3" stroke="var(--blue)" strokeWidth="1.5" strokeDasharray="5 4" />
          </svg>
          {reference.label}
        </div>
      ) : null}
      {a && active !== null ? (
        <Tooltip x={xAt(active)} y={yAt(a.value)} width={W}>
          <div className="text-sm font-bold text-ink">{a.display ?? fmtNum(a.value)}</div>
          <div className="max-w-48 truncate text-ink-2">{a.label}</div>
          {a.sub ? <div className="text-ink-3">{a.sub}</div> : null}
        </Tooltip>
      ) : null}
    </div>
  );
}

export type Column = { key: string; label: string; value: number; tooltip: string };

/** Coloane (ex. câți elevi au primit fiecare notă). O singură serie, deci o singură culoare. */
export function ColumnChart({ columns, height = 170, ariaLabel }: { columns: Column[]; height?: number; ariaLabel: string }) {
  const [ref, W] = useWidth();
  const H = height;
  const pad = { l: 8, r: 8, t: 22, b: 26 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const band = iw / Math.max(columns.length, 1);
  const bw = Math.min(24, band * 0.6);
  const max = Math.max(1, ...columns.map((c) => c.value));
  const maxIndex = columns.findIndex((c) => c.value === max && c.value > 0);
  const [active, setActive] = useState<number | null>(null);

  const colPath = (x: number, y: number, w: number, h: number) => {
    const r = Math.min(4, h, w / 2);
    return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
  };

  return (
    <div ref={ref} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block h-auto max-w-full" role="img" aria-label={ariaLabel}>
        <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih} y2={pad.t + ih} stroke="var(--line)" strokeWidth="1" />
        {columns.map((c, i) => {
          const h = (c.value / max) * ih;
          const x = pad.l + i * band + (band - bw) / 2;
          const y = pad.t + ih - h;
          return (
            <g
              key={c.key}
              tabIndex={0}
              role="img"
              aria-label={c.tooltip}
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="outline-none"
            >
              <rect x={pad.l + i * band} y={pad.t} width={band} height={ih + pad.b} fill="transparent" />
              {c.value > 0 ? (
                <path d={colPath(x, y, bw, h)} fill="var(--red)" opacity={active === null || active === i ? 1 : 0.55} />
              ) : (
                <rect x={x} y={pad.t + ih - 2} width={bw} height={2} rx={1} fill="var(--line)" />
              )}
              {i === maxIndex ? (
                <text x={x + bw / 2} y={y - 6} textAnchor="middle" className="fill-ink text-[12px] font-bold">
                  {c.value}
                </text>
              ) : null}
              <text x={x + bw / 2} y={H - 8} textAnchor="middle" className="fill-ink-3 text-[11px] font-semibold">
                {c.label}
              </text>
            </g>
          );
        })}
      </svg>
      {active !== null ? (
        <Tooltip x={pad.l + active * band + band / 2} y={pad.t + ih - (columns[active].value / max) * ih} width={W}>
          <div className="text-sm font-bold text-ink">{columns[active].value}</div>
          <div className="text-ink-2">{columns[active].tooltip}</div>
        </Tooltip>
      ) : null}
    </div>
  );
}

export type BarRow = { key: string; label: string; sub?: string; value: number | null; display: string; href?: string };

/** Bare orizontale ordonate (ex. media fiecărui elev). Valoarea stă la capătul barei, în culoarea textului. */
export function BarList({ rows, max, emptyLabel }: { rows: BarRow[]; max: number; emptyLabel: string }) {
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const pct = r.value === null ? 0 : Math.max(2, (r.value / max) * 100);
        const inner = (
          <div className="grid grid-cols-[minmax(7rem,12rem)_1fr] items-center gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{r.label}</div>
              {r.sub ? <div className="truncate text-xs text-ink-3">{r.sub}</div> : null}
            </div>
            <div className="flex items-center gap-2">
              {r.value === null ? (
                <span className="text-xs text-ink-3">{emptyLabel}</span>
              ) : (
                <>
                  <div className="h-3 flex-1">
                    <div className="h-3 rounded-r-[4px] bg-red transition-[width] duration-700" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-10 shrink-0 text-right text-sm font-bold tabular-nums">{r.display}</span>
                </>
              )}
            </div>
          </div>
        );
        return (
          <li key={r.key}>
            {r.href ? (
              <Link href={r.href} className="block rounded-xl px-2 py-1.5 transition-colors hover:bg-paper-2">
                {inner}
              </Link>
            ) : (
              <div className="px-2 py-1.5">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Indicator: etichetă, valoare (cifre proporționale, aceeași familie ca textul) și, opțional, evoluția. */
export function StatTile({
  label,
  value,
  delta,
  hint,
  className,
}: {
  label: string;
  value: string;
  delta?: { value: number; label: string } | null;
  hint?: string;
  className?: string;
}) {
  const up = delta && delta.value > 0.005;
  const down = delta && delta.value < -0.005;
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  return (
    <div className={cn("rounded-3xl border border-line bg-card px-5 py-4 shadow-soft", className)}>
      <div className="text-sm font-semibold text-ink-3">{label}</div>
      <div className="mt-1 font-sans text-3xl font-extrabold tracking-tight">{value}</div>
      {delta ? (
        <div className={cn("mt-1 inline-flex items-center gap-1 text-xs font-bold", up ? "text-green" : down ? "text-red" : "text-ink-3")}>
          <Icon className="size-3.5" aria-hidden />
          {(delta.value > 0 ? "+" : "") + fmtNum(Math.round(delta.value * 100) / 100)} {delta.label}
        </div>
      ) : hint ? (
        <div className="mt-1 text-xs text-ink-3">{hint}</div>
      ) : null}
    </div>
  );
}
