import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { fmt, getDict } from "@/lib/i18n";
import { studentClassDetail } from "@/lib/classes/service";
import { fmtAvg } from "@/lib/stats";
import { StatTile } from "@/components/charts";
import { EmbroideryBand } from "@/components/Ornament";
import { Badge, Card } from "@/components/ui";

export default async function StudentClassPage({ params }: PageProps<"/elev/clase/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const user = await requireUser("student");
  const { t, locale } = await getDict();
  const detail = await studentClassDetail(id, user.id);
  if (!detail) notFound();
  const dateFmt = new Intl.DateTimeFormat(locale === "ru" ? "ru-MD" : "ro-MD", { day: "numeric", month: "short" });

  return (
    <div>
      <Link href="/elev" className="inline-flex items-center gap-2 text-sm font-semibold text-ink-3 hover:text-ink">
        <ArrowLeft className="size-4" /> {t.stats.back}
      </Link>
      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">{fmt(t.stats.classPageTitle, { name: detail.cls.name })}</h1>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 text-ink-2">
        {detail.cls.subject ? <span>{detail.cls.subject}</span> : null}
        <span className="inline-flex items-center gap-1.5">
          <UserRound className="size-4" /> {detail.teacher}
        </span>
      </p>

      <div className="mt-6 grid max-w-xl grid-cols-2 gap-3">
        <StatTile label={t.stats.yourAverage} value={fmtAvg(detail.yourAverage, locale)} />
        <StatTile label={t.stats.classAverage} value={fmtAvg(detail.classAverage, locale)} />
      </div>

      <Card className="mt-6 overflow-hidden">
        <EmbroideryBand height={12} id="stu-cls" />
        {detail.tests.length === 0 ? (
          <p className="p-6 text-sm text-ink-3">{t.student.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b border-line bg-paper-2 text-xs font-bold uppercase tracking-wide text-ink-3">
                <tr>
                  <th className="px-5 py-2.5">{t.stats.colDate}</th>
                  <th className="px-3 py-2.5">{t.stats.colTest}</th>
                  <th className="px-3 py-2.5 text-right">{t.stats.colYour}</th>
                  <th className="px-5 py-2.5 text-right">{t.stats.colClassAverage}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {detail.tests.map((tt) => (
                  <tr key={tt.id}>
                    <td className="whitespace-nowrap px-5 py-3 tabular-nums text-ink-3">{dateFmt.format(tt.at)}</td>
                    <td className="px-3 py-3 font-semibold">{tt.title}</td>
                    <td className="px-3 py-3 text-right">
                      {tt.your !== null ? (
                        <span className="font-sans text-lg font-extrabold">{tt.your}</span>
                      ) : tt.yourStatus === "pending" ? (
                        <Badge tone="sun">{t.stats.pending}</Badge>
                      ) : tt.yourStatus === "in_progress" ? (
                        <Badge tone="blue">{t.stats.inProgress}</Badge>
                      ) : (
                        <span className="text-ink-3">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-ink-2">{fmtAvg(tt.classAverage, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
