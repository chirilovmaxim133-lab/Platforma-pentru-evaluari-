import Link from "next/link";
import { ArrowRight, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { fmt, getDict } from "@/lib/i18n";
import { studentClasses, studentResults } from "@/lib/classes/service";
import { averagesBy, fmtAvg, gradedOnly, summarize } from "@/lib/stats";
import { BarList, LineChart, StatTile } from "@/components/charts";
import { AnimatedOrnament } from "@/components/landing/AnimatedOrnament";
import { Ornament } from "@/components/Ornament";
import { Badge, btn, Card } from "@/components/ui";
import { JoinForm } from "./JoinForm";

export default async function StudentHome() {
  const user = await requireUser("student");
  const { t, locale } = await getDict();
  const [results, myClasses] = await Promise.all([studentResults(user.id), studentClasses(user.id)]);

  const summary = summarize(results);
  const submitted = results.filter((r) => r.status === "submitted").length;
  const graded = gradedOnly(results).sort((a, b) => a.at.getTime() - b.at.getTime());
  const dateFmt = new Intl.DateTimeFormat(locale === "ru" ? "ru-MD" : "ro-MD", { day: "numeric", month: "short" });
  const points = graded.slice(-20).map((r) => ({
    key: r.attemptId,
    label: r.title,
    sub: dateFmt.format(r.at),
    value: r.grade,
    display: String(r.grade),
  }));
  const subjects = [...averagesBy(graded, (r) => r.subject || "—")].sort((a, b) => b[1] - a[1]);
  const hasPercentOnly = results.some((r) => r.gradeMode === "percent" && r.status === "submitted");

  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{fmt(t.student.hello, { name: user.firstName })}</h1>
          <p className="mt-2 text-ink-2">{t.stats.subtitle}</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <StatTile
              label={t.stats.overall}
              value={fmtAvg(summary.average, locale)}
              delta={summary.trend !== null ? { value: summary.trend, label: t.stats.trend } : null}
            />
            <StatTile label={t.stats.testsTaken} value={String(submitted)} />
            <StatTile label={t.stats.best} value={summary.best !== null ? String(summary.best) : "—"} />
            <StatTile label={t.stats.last} value={summary.last !== null ? String(summary.last) : "—"} />
          </div>
        </div>
        <Card className="relative overflow-hidden px-5 py-8 text-center">
          <Ornament motif="star" className="pointer-events-none absolute -right-8 -top-8 w-32 opacity-15" />
          <h2 className="font-display text-xl font-bold">{t.student.joinTitle}</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm text-ink-2">{t.student.joinHint}</p>
          <div className="mt-6">
            <JoinForm />
          </div>
        </Card>
      </div>

      <Card className="mt-6 p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold">{t.stats.progressTitle}</h2>
        {points.length ? (
          <div className="mt-3">
            <LineChart
              points={points}
              min={1}
              max={10}
              ticks={[2, 4, 6, 8, 10]}
              reference={summary.average !== null ? { value: summary.average, label: `${t.stats.overall}: ${fmtAvg(summary.average, locale)}` } : undefined}
              ariaLabel={t.stats.progressAria}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center py-8 text-center">
            <AnimatedOrnament motif="tree" className="w-20" />
            <p className="mt-4 max-w-xs text-ink-2">{t.stats.noGrades}</p>
          </div>
        )}
        {hasPercentOnly ? <p className="mt-3 text-xs text-ink-3">{t.stats.percentNote}</p> : null}
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold">{t.stats.classesTitle}</h2>
          {myClasses.length === 0 ? (
            <p className="mt-3 text-sm text-ink-3">{t.stats.classesEmpty}</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {myClasses.map((c) => (
                <li key={c.id}>
                  <Link href={`/elev/clase/${c.id}`} className="group flex items-center gap-4 rounded-2xl border border-line bg-paper px-4 py-3 transition-colors hover:border-red/40">
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-night font-display text-sm font-bold text-night-ink">{c.name}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{c.subject || c.name}</span>
                      <span className="flex items-center gap-1 truncate text-xs text-ink-3">
                        <UserRound className="size-3" /> {c.teacher}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-[11px] font-semibold text-ink-3">{t.stats.yourAverage}</span>
                      <span className="block font-sans text-xl font-extrabold">{fmtAvg(c.yourAverage, locale)}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-[11px] font-semibold text-ink-3">{t.stats.classAverage}</span>
                      <span className="block font-sans text-xl font-extrabold text-ink-2">{fmtAvg(c.classAverage, locale)}</span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-1" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold">{t.stats.bySubject}</h2>
          {subjects.length ? (
            <div className="mt-3">
              <BarList
                max={10}
                emptyLabel={t.classes.noGrades}
                rows={subjects.map(([subject, avg]) => ({ key: subject, label: subject, value: avg, display: fmtAvg(avg, locale) }))}
              />
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-3">{t.stats.noGrades}</p>
          )}
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <h2 className="px-5 pt-5 font-display text-lg font-bold sm:px-6">{t.stats.allGrades}</h2>
        {results.length === 0 ? (
          <p className="px-5 pb-6 pt-3 text-sm text-ink-3 sm:px-6">{t.student.empty}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-y border-line bg-paper-2 text-xs font-bold uppercase tracking-wide text-ink-3">
                <tr>
                  <th className="px-5 py-2.5 sm:px-6">{t.stats.colDate}</th>
                  <th className="px-3 py-2.5">{t.stats.colTest}</th>
                  <th className="px-3 py-2.5">{t.stats.colSubject}</th>
                  <th className="px-5 py-2.5 text-right sm:px-6">{t.stats.colResult}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {results.map((r) => {
                  const done = r.status === "submitted";
                  const value = !done
                    ? null
                    : !r.visible
                      ? null
                      : !r.complete
                        ? null
                        : r.gradeMode === "grade10"
                          ? String(r.grade ?? "—")
                          : r.percent !== null
                            ? `${Math.round(r.percent)}%`
                            : "—";
                  return (
                    <tr key={r.attemptId} className="transition-colors hover:bg-paper-2/60">
                      <td className="whitespace-nowrap px-5 py-3 tabular-nums text-ink-3 sm:px-6">{dateFmt.format(r.at)}</td>
                      <td className="px-3 py-3">
                        <Link href={done ? `/examen/${r.attemptId}/rezultat` : `/examen/${r.attemptId}`} className="font-semibold hover:text-red">
                          {r.title}
                        </Link>
                        <div className="text-xs text-ink-3">{r.teacher}</div>
                      </td>
                      <td className="px-3 py-3 text-ink-2">{r.subject || "—"}</td>
                      <td className="px-5 py-3 text-right sm:px-6">
                        {!done ? (
                          <Link href={`/examen/${r.attemptId}`} className={btn("red", "sm")}>
                            {t.student.continue}
                          </Link>
                        ) : value !== null ? (
                          <span className="font-sans text-lg font-extrabold">{value}</span>
                        ) : (
                          <Badge tone={r.visible ? "sun" : "neutral"}>{r.visible ? t.stats.pending : t.stats.hidden}</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
