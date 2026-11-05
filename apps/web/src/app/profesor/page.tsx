import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { BarChart3, Copy, FilePlus2, Pencil, QrCode } from "lucide-react";
import { db } from "@/lib/db";
import { questions, tests } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { fmt, getDict } from "@/lib/i18n";
import { attemptsCountByTest } from "@/lib/tests/service";
import { Ornament } from "@/components/Ornament";
import { Badge, btn, Card } from "@/components/ui";
import { createTestAction, duplicateTestAction } from "./actions";

export default async function TeacherHome() {
  const user = await requireUser("teacher");
  const { t, locale } = await getDict();
  const rows = await db
    .select({
      id: tests.id,
      title: tests.title,
      subject: tests.subject,
      status: tests.status,
      updatedAt: tests.updatedAt,
      language: tests.language,
      questionCount: sql<number>`(select count(*)::int from ${questions} where ${questions.testId} = ${tests.id})`,
    })
    .from(tests)
    .where(eq(tests.ownerId, user.id))
    .orderBy(desc(tests.updatedAt));
  const counts = await attemptsCountByTest(rows.map((r) => r.id));
  const live = rows.filter((r) => r.status === "published").length;
  const submitted = [...counts.values()].reduce((s, c) => s + c.submitted, 0);
  const dateFmt = new Intl.DateTimeFormat(locale === "ru" ? "ru-MD" : "ro-MD", { day: "numeric", month: "short" });

  return (
    <div>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{fmt(t.teacher.hello, { name: user.firstName })}</h1>
          <p className="mt-2 text-ink-2">{t.teacher.subtitle}</p>
        </div>
        <form action={createTestAction}>
          <button className={btn("red", "lg")}>
            <FilePlus2 className="size-5" /> {t.teacher.newTest}
          </button>
        </form>
      </div>

      {!user.teacherVerified ? (
        <p className="mt-6 rounded-2xl border border-sun/40 bg-sun-soft px-4 py-3 text-sm font-medium">{t.teacher.unverified}</p>
      ) : null}

      <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
        {[
          [rows.length, t.teacher.statTests],
          [live, t.teacher.statLive],
          [submitted, t.teacher.statAttempts],
        ].map(([n, label]) => (
          <Card key={String(label)} className="px-4 py-5 sm:px-6">
            <div className="font-display text-2xl font-bold sm:text-3xl">{n}</div>
            <div className="mt-1 text-xs font-semibold text-ink-3 sm:text-sm">{label}</div>
          </Card>
        ))}
      </div>

      {rows.length === 0 ? (
        <Card className="mt-8 flex flex-col items-center px-6 py-14 text-center">
          <Ornament motif="star" className="w-24" />
          <p className="mt-6 max-w-sm text-ink-2">{t.teacher.empty}</p>
          <form action={createTestAction} className="mt-6">
            <button className={btn("primary")}>
              <FilePlus2 className="size-4" /> {t.teacher.newTest}
            </button>
          </form>
        </Card>
      ) : (
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {rows.map((r) => {
            const c = counts.get(r.id);
            const tone = r.status === "published" ? "green" : r.status === "closed" ? "neutral" : "sun";
            return (
              <li key={r.id}>
                <Card className="group flex h-full flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/profesor/teste/${r.id}`} className="min-w-0">
                      <h2 className="truncate font-display text-lg font-bold">{r.title || t.teacher.untitled}</h2>
                      <p className="mt-1 text-sm text-ink-3">
                        {[r.subject, fmt(t.common.questionsCount, { n: r.questionCount }), r.language.toUpperCase()].filter(Boolean).join(" · ")}
                      </p>
                    </Link>
                    <Badge tone={tone}>{t.teacher.status[r.status]}</Badge>
                  </div>
                  <p className="mt-3 text-xs text-ink-3">
                    {fmt(t.teacher.attempts, { n: c?.total ?? 0 })} · {fmt(t.teacher.updated, { date: dateFmt.format(r.updatedAt) })}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                    <Link href={`/profesor/teste/${r.id}`} className={btn("outline", "sm")}>
                      <Pencil className="size-4" /> {t.teacher.actions.edit}
                    </Link>
                    <Link href={`/profesor/teste/${r.id}/distribuie`} className={btn("outline", "sm")}>
                      <QrCode className="size-4" /> {t.teacher.actions.share}
                    </Link>
                    <Link href={`/profesor/teste/${r.id}/rezultate`} className={btn("outline", "sm")}>
                      <BarChart3 className="size-4" /> {t.teacher.actions.results}
                    </Link>
                    <form action={duplicateTestAction.bind(null, r.id)}>
                      <button className={btn("ghost", "sm")} title={t.teacher.actions.duplicate}>
                        <Copy className="size-4" />
                        <span className="sr-only">{t.teacher.actions.duplicate}</span>
                      </button>
                    </form>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
