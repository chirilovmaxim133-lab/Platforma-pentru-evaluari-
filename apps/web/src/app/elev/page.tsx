import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { attempts, tests, users } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { fmt, getDict } from "@/lib/i18n";
import { Ornament } from "@/components/Ornament";
import { Badge, btn, Card } from "@/components/ui";
import { JoinForm } from "./JoinForm";

export default async function StudentHome() {
  const user = await requireUser("student");
  const { t, locale } = await getDict();
  const rows = await db
    .select({
      id: attempts.id,
      status: attempts.status,
      grade: attempts.grade,
      percent: attempts.percent,
      gradingComplete: attempts.gradingComplete,
      startedAt: attempts.startedAt,
      title: tests.title,
      settings: tests.settings,
      teacherFirst: users.firstName,
      teacherLast: users.lastName,
    })
    .from(attempts)
    .innerJoin(tests, eq(tests.id, attempts.testId))
    .innerJoin(users, eq(users.id, tests.ownerId))
    .where(eq(attempts.studentId, user.id))
    .orderBy(desc(attempts.startedAt))
    .limit(100);
  const dateFmt = new Intl.DateTimeFormat(locale === "ru" ? "ru-MD" : "ro-MD", { day: "numeric", month: "long" });

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">{fmt(t.student.hello, { name: user.firstName })}</h1>
      <Card className="relative mt-6 overflow-hidden px-5 py-10 text-center sm:px-10">
        <Ornament motif="band" className="absolute -left-6 top-4 hidden w-40 opacity-20 sm:block" />
        <Ornament motif="band" className="absolute -right-6 bottom-4 hidden w-40 opacity-20 sm:block" />
        <h2 className="font-display text-2xl font-bold">{t.student.joinTitle}</h2>
        <p className="mx-auto mt-2 max-w-sm text-ink-2">{t.student.joinHint}</p>
        <div className="mt-8">
          <JoinForm />
        </div>
      </Card>

      <h2 className="mt-12 font-display text-xl font-bold">{t.student.myAttempts}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-ink-3">{t.student.empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((r) => {
            const done = r.status === "submitted";
            const showScore = done && r.settings.results.showScore && r.gradingComplete;
            const value = r.settings.grading.mode === "grade10" ? r.grade : r.percent !== null ? `${Math.round(r.percent)}%` : null;
            return (
              <li key={r.id}>
                <Link href={done ? `/examen/${r.id}/rezultat` : `/examen/${r.id}`}>
                  <Card className="flex items-center justify-between gap-4 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift sm:p-5">
                    <div className="min-w-0">
                      <p className="truncate font-bold">{r.title}</p>
                      <p className="mt-0.5 text-sm text-ink-3">
                        {r.teacherFirst} {r.teacherLast} · {dateFmt.format(r.startedAt)}
                      </p>
                    </div>
                    {!done ? (
                      <span className={btn("red", "sm")}>{t.student.continue}</span>
                    ) : showScore && value !== null ? (
                      <span className="font-display text-2xl font-bold">{value}</span>
                    ) : (
                      <Badge tone={r.gradingComplete ? "neutral" : "sun"}>{r.gradingComplete ? t.student.seeResult : t.student.waiting}</Badge>
                    )}
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
