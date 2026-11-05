"use client";

import { useI18n } from "@/lib/i18n/client";
import { LineChart, StatTile } from "@/components/charts";

/** Exemplu ilustrativ (date demonstrative) al contului unui elev: media, media clasei și evoluția notelor. */
export function ClassesDemo() {
  const { t } = useI18n();
  const grades = [7, 8, 7, 9, 9, 10];
  const points = t.landing.classesDemoTests.map((label, i) => ({ key: String(i), label, value: grades[i], display: String(grades[i]) }));
  const avg = grades.reduce((a, b) => a + b, 0) / grades.length;
  return (
    <div className="rounded-[2rem] border border-line bg-card p-5 shadow-lift sm:p-7">
      <p className="text-sm font-bold text-ink-3">{t.landing.classesDemoName}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatTile label={t.landing.classesDemoYour} value={avg.toFixed(2).replace(".", ",")} className="shadow-none" />
        <StatTile label={t.landing.classesDemoClass} value="8,10" className="shadow-none" />
      </div>
      <p className="mt-6 text-sm font-bold">{t.landing.classesDemoChart}</p>
      <div className="mt-2">
        <LineChart
          points={points}
          min={1}
          max={10}
          ticks={[2, 4, 6, 8, 10]}
          reference={{ value: 8.1, label: `${t.landing.classesDemoClass}: 8,10` }}
          ariaLabel={t.landing.classesDemoChart}
          height={200}
        />
      </div>
    </div>
  );
}
