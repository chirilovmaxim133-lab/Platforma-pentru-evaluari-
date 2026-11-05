/** Calculele pentru medii și progres. Funcții pure, ușor de testat. */

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function mean(xs: number[]): number | null {
  return xs.length ? round2(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
}

/** Media cu două zecimale și virgulă, ca în catalog: 8,45. */
export function fmtAvg(n: number | null, locale: "ro" | "ru"): string {
  if (n === null) return "—";
  return n.toLocaleString(locale === "ru" ? "ru-MD" : "ro-MD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export type Result = {
  attemptId: string;
  testId: string;
  classId: string | null;
  title: string;
  subject: string;
  at: Date;
  status: "in_progress" | "submitted";
  /** Corectat complet (inclusiv răspunsurile deschise). */
  complete: boolean;
  /** Profesorul permite elevului să-și vadă rezultatul. */
  visible: boolean;
  grade: number | null;
  percent: number | null;
};

/** Notele care intră în medii: lucrări predate, corectate complet, cu notă de la 1 la 10. */
export function gradedOnly<T extends Pick<Result, "status" | "complete" | "grade">>(results: T[]): (T & { grade: number })[] {
  return results.filter((r): r is T & { grade: number } => r.status === "submitted" && r.complete && r.grade !== null);
}

export type Summary = { average: number | null; best: number | null; last: number | null; trend: number | null; graded: number };

/** Rezumatul unui elev. Tendința: media ultimelor 3 note față de media celor 3 dinaintea lor. */
export function summarize(results: Result[]): Summary {
  const graded = gradedOnly(results).sort((a, b) => a.at.getTime() - b.at.getTime());
  const grades = graded.map((r) => r.grade);
  const trend = grades.length >= 4 ? round2(mean(grades.slice(-3))! - mean(grades.slice(-6, -3))!) : null;
  return {
    average: mean(grades),
    best: grades.length ? Math.max(...grades) : null,
    last: grades.length ? grades[grades.length - 1] : null,
    trend,
    graded: grades.length,
  };
}

/** Media clasei = media mediilor elevilor (fiecare elev cântărește la fel, indiferent câte teste a dat). */
export function classAverage(gradesByStudent: Map<string, number[]>): number | null {
  const perStudent = [...gradesByStudent.values()].map(mean).filter((m): m is number => m !== null);
  return mean(perStudent);
}

export function groupBy<T, K>(items: T[], key: (t: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const it of items) {
    const k = key(it);
    out.set(k, [...(out.get(k) ?? []), it]);
  }
  return out;
}

export function averagesBy<T extends { grade: number }>(items: T[], key: (t: T) => string): Map<string, number> {
  const out = new Map<string, number>();
  for (const [k, group] of groupBy(items, key)) {
    const m = mean(group.map((g) => g.grade));
    if (m !== null) out.set(k, m);
  }
  return out;
}
