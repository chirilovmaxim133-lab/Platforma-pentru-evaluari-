/**
 * Baremul ca o bară segmentată: fiecare notă ocupă intervalul ei de procente.
 * O singură culoare, segmente separate prin spații, cifra notei scrisă pe segment (nu depinde de culoare).
 */
export function GradeScaleBar({ thresholds, ariaLabel }: { thresholds: number[]; ariaLabel: string }) {
  const bounds = [0, ...thresholds, 100];
  const parts = bounds.slice(0, -1).map((from, i) => ({ grade: i + 1, from, to: bounds[i + 1] }));
  return (
    <div role="img" aria-label={ariaLabel} className="flex h-7 gap-[2px]">
      {parts.map((p) =>
        p.to - p.from > 0 ? (
          <div
            key={p.grade}
            className="grid min-w-0 place-items-center rounded-[4px] bg-red text-[11px] font-bold text-white transition-[flex-grow] duration-300"
            style={{ flexGrow: p.to - p.from, flexBasis: 0 }}
            title={`${p.grade}: ${p.from}–${p.to}%`}
          >
            {p.to - p.from >= 5 ? p.grade : ""}
          </div>
        ) : null,
      )}
    </div>
  );
}
