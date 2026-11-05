import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { ArrowLeft, BarChart3, FilePlus2 } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { fmt, getDict } from "@/lib/i18n";
import { appUrl } from "@/config/site";
import { classDetail, getOwnedClass } from "@/lib/classes/service";
import { fmtAvg } from "@/lib/stats";
import { InviteCard } from "@/components/InviteCard";
import { LineChart, StatTile } from "@/components/charts";
import { Badge, btn, Card } from "@/components/ui";
import { createTestAction } from "@/app/profesor/actions";
import { DeleteClassButton, RemoveMemberButton } from "./ClassActions";

export default async function ClassPage({ params }: PageProps<"/profesor/clase/[id]">) {
  const { id } = await params;
  const user = await requireUser("teacher");
  const cls = await getOwnedClass(id, user);
  if (!cls) notFound();
  const { t, locale } = await getDict();
  const detail = await classDetail(cls);

  const url = `${appUrl()}/c/${cls.joinCode}`;
  const qrSvg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1b1414", light: "#ffffff" } });
  const dateFmt = new Intl.DateTimeFormat(locale === "ru" ? "ru-MD" : "ro-MD", { day: "numeric", month: "short" });
  const trend = detail.tests
    .filter((tt) => tt.gradeMode === "grade10" && tt.average !== null)
    .map((tt) => ({
      key: tt.id,
      label: tt.title || t.teacher.untitled,
      sub: dateFmt.format(tt.publishedAt ?? tt.createdAt),
      value: tt.average!,
      display: fmtAvg(tt.average, locale),
    }));
  const maxAvg = 10;
  const ranked = [...detail.students].sort((a, b) => (b.average ?? -1) - (a.average ?? -1));

  return (
    <div>
      <Link href="/profesor/clase" className="inline-flex items-center gap-2 text-sm font-semibold text-ink-3 hover:text-ink">
        <ArrowLeft className="size-4" /> {t.classes.back}
      </Link>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">{cls.name}</h1>
          <p className="mt-1 text-ink-2">{[cls.subject, cls.gradeLevel ? fmt(t.classes.levelShort, { n: cls.gradeLevel }) : null].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={createTestAction.bind(null, cls.id)}>
            <button className={btn("red", "md")}>
              <FilePlus2 className="size-4" /> {t.classes.newTest}
            </button>
          </form>
          <DeleteClassButton classId={cls.id} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <InviteCard title={cls.name} heading={t.classes.inviteTitle} code={cls.joinCode} url={url} qrSvg={qrSvg} hint={fmt(t.classes.inviteOr, { url: appUrl().replace(/^https?:\/\//, "") })} />
        <div className="grid grid-cols-2 gap-3">
          <StatTile label={t.classes.average} value={fmtAvg(detail.average, locale)} />
          <StatTile label={t.classes.averagePercent} value={detail.averagePercent !== null ? `${Math.round(detail.averagePercent)}%` : "—"} />
          <StatTile label={t.classes.statStudents} value={String(detail.students.length)} />
          <StatTile label={t.classes.statTests} value={String(detail.tests.length)} />
        </div>
      </div>

      <Card className="mt-4 p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold">{t.classes.trendTitle}</h2>
        {trend.length ? (
          <div className="mt-3">
            <LineChart
              points={trend}
              min={1}
              max={10}
              ticks={[2, 4, 6, 8, 10]}
              reference={detail.average !== null ? { value: detail.average, label: `${t.classes.average}: ${fmtAvg(detail.average, locale)}` } : undefined}
              ariaLabel={t.classes.trendAria}
            />
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-3">{t.classes.trendEmpty}</p>
        )}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold">{t.classes.studentsTitle}</h2>
          {ranked.length === 0 ? (
            <p className="mt-3 text-sm text-ink-3">{t.classes.studentsEmpty}</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-xs font-bold uppercase tracking-wide text-ink-3">
                <tr>
                  <th className="pb-2">{t.classes.colStudent}</th>
                  <th className="pb-2">{t.classes.colAverage}</th>
                  <th className="pb-2 text-right">{t.classes.colLast}</th>
                  <th className="w-8 pb-2" />
                </tr>
              </thead>
              <tbody>
                {ranked.map((s) => (
                  <tr key={s.id} className="border-t border-line">
                    <td className="py-2.5 pr-3">
                      <div className="font-semibold">
                        {s.lastName} {s.firstName}
                      </div>
                      <div className="text-xs text-ink-3">{fmt(t.classes.tests, { n: s.graded })}</div>
                    </td>
                    <td className="w-1/2 py-2.5 pr-3">
                      {s.average !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="h-3 flex-1">
                            <div className="h-3 rounded-r-[4px] bg-red" style={{ width: `${Math.max(3, (s.average / maxAvg) * 100)}%` }} />
                          </div>
                          <span className="w-11 text-right font-bold tabular-nums">{fmtAvg(s.average, locale)}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-ink-3">{t.classes.noGrades}</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right font-bold tabular-nums">{s.last ?? "—"}</td>
                    <td className="py-2.5 pl-2">
                      <RemoveMemberButton classId={cls.id} studentId={s.id} name={`${s.lastName} ${s.firstName}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold">{t.classes.testsTitle}</h2>
          {detail.tests.length === 0 ? (
            <p className="mt-3 text-sm text-ink-3">{t.classes.testsEmpty}</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {[...detail.tests].reverse().map((tt) => (
                <li key={tt.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link href={`/profesor/teste/${tt.id}/rezultate`} className="block truncate font-semibold hover:text-red">
                      {tt.title || t.teacher.untitled}
                    </Link>
                    <p className="text-xs text-ink-3">
                      {dateFmt.format(tt.publishedAt ?? tt.createdAt)} · {t.classes.colSubmitted}: {tt.submitted}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {tt.status !== "published" ? <Badge tone={tt.status === "draft" ? "sun" : "neutral"}>{t.teacher.status[tt.status]}</Badge> : null}
                    <span className="w-11 text-right font-bold tabular-nums">{tt.gradeMode === "grade10" ? fmtAvg(tt.average, locale) : "—"}</span>
                    <Link href={`/profesor/teste/${tt.id}/rezultate`} className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-ink/5 hover:text-ink" aria-label={t.teacher.actions.results}>
                      <BarChart3 className="size-4" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
