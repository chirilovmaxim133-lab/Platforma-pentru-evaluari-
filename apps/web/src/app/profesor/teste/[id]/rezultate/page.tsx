import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { ArrowLeft, Download, QrCode, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { attemptEvents, attempts, classes, classMembers, users } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { fmt, getDict } from "@/lib/i18n";
import { runLlmAnalysis } from "@/lib/ai/analyze";
import { peerSimilarity } from "@/lib/ai/peer-similarity";
import { finalizeOverdue, getOwnedTest, loadQuestions } from "@/lib/tests/service";
import { AutoRefresh } from "@/components/AutoRefresh";
import { ColumnChart } from "@/components/charts";
import { Badge, btn, Card, cn } from "@/components/ui";

const ONLINE_MS = 45_000;

export default async function ResultsPage({ params }: PageProps<"/profesor/teste/[id]/rezultate">) {
  const { id } = await params;
  const user = await requireUser("teacher");
  const test = await getOwnedTest(id, user);
  if (!test) notFound();
  const { t } = await getDict();

  const expired = await finalizeOverdue(id);
  if (expired.length) after(async () => {
    for (const a of expired) await runLlmAnalysis(a);
  });

  const [qs, rows] = await Promise.all([
    loadQuestions(id),
    db
      .select({ attempt: attempts, firstName: users.firstName, lastName: users.lastName, className: users.className })
      .from(attempts)
      .innerJoin(users, eq(users.id, attempts.studentId))
      .where(eq(attempts.testId, id))
      .orderBy(asc(users.lastName), asc(users.firstName)),
  ]);

  // Ieșirile se arată și când sunt permise (atunci nu se penalizează, dar profesorul le vede).
  const leaveRows = rows.length
    ? await db
        .select({ attemptId: attemptEvents.attemptId, n: sql<number>`count(*)::int` })
        .from(attemptEvents)
        .where(
          and(
            inArray(attemptEvents.attemptId, rows.map((r) => r.attempt.id)),
            inArray(attemptEvents.type, ["leave", "app_background"]),
          ),
        )
        .groupBy(attemptEvents.attemptId)
    : [];
  const leaves = new Map(leaveRows.map((r) => [r.attemptId, r.n]));
  const exitsFor = (a: (typeof rows)[number]["attempt"]) =>
    test.settings.security.allowLeave ? (leaves.get(a.id) ?? 0) : a.violationCount;

  // Testul unei clase: cine din clasă n-a început încă.
  const [cls] = test.classId ? await db.select({ id: classes.id, name: classes.name }).from(classes).where(eq(classes.id, test.classId)).limit(1) : [];
  const members = cls
    ? await db
        .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
        .from(classMembers)
        .innerJoin(users, eq(users.id, classMembers.studentId))
        .where(eq(classMembers.classId, cls.id))
        .orderBy(asc(users.lastName))
    : [];
  const started = new Set(rows.map((r) => r.attempt.studentId));
  const notStarted = members.filter((m) => !started.has(m.id));

  const submitted = rows.filter((r) => r.attempt.status === "submitted");
  const similar = peerSimilarity(qs, submitted.map((r) => r.attempt));
  const isGrade = test.settings.grading.mode === "grade10";
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null);
  const avgGrade = avg(submitted.map((r) => r.attempt.grade).filter((g): g is number => g !== null));
  const avgPercent = avg(submitted.map((r) => r.attempt.percent).filter((p): p is number => p !== null));
  const pending = submitted.filter((r) => !r.attempt.gradingComplete).length;
  const dist = Array.from({ length: 10 }, (_, i) => submitted.filter((r) => r.attempt.grade === i + 1).length);
  const now = Date.now();

  return (
    <div>
      <AutoRefresh enabled={test.status === "published"} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/profesor/teste/${id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-ink-3 hover:text-ink">
          <ArrowLeft className="size-4" /> {test.title || t.teacher.untitled}
        </Link>
        <div className="flex gap-2">
          <Link href={`/profesor/teste/${id}/distribuie`} className={btn("outline", "sm")}>
            <QrCode className="size-4" /> {t.teacher.actions.share}
          </Link>
          <a href={`/api/tests/${id}/export`} className={btn("outline", "sm")}>
            <Download className="size-4" /> {t.results.exportCsv}
          </a>
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-3">
        <h1 className="flex flex-wrap items-center gap-3 font-display text-3xl font-bold tracking-tight">
          {t.results.title}
          {cls ? (
            <Link href={`/profesor/clase/${cls.id}`}>
              <Badge tone="red" className="text-sm">{cls.name}</Badge>
            </Link>
          ) : null}
        </h1>
        {test.status === "published" ? <span className="text-xs font-semibold text-ink-3">{t.results.refreshing}</span> : null}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [submitted.length, t.results.submitted],
          [rows.length - submitted.length, t.results.inProgress],
          [isGrade ? (avgGrade ?? "—") : avgPercent !== null ? `${avgPercent}%` : "—", isGrade ? t.results.average : t.results.averagePercent],
          [pending, t.results.pending],
        ].map(([n, label]) => (
          <Card key={String(label)} className="px-5 py-4">
            <div className="font-display text-3xl font-bold">{n}</div>
            <div className="mt-1 text-sm font-semibold text-ink-3">{label}</div>
          </Card>
        ))}
      </div>

      {isGrade && submitted.length ? (
        <Card className="mt-4 p-5">
          <p className="text-sm font-bold text-ink-2">{t.results.distribution}</p>
          <div className="mt-3">
            <ColumnChart
              ariaLabel={t.results.distribution}
              columns={dist.map((n, i) => ({
                key: String(i + 1),
                label: String(i + 1),
                value: n,
                tooltip: `${t.settings.gradeLabel.replace("{n}", String(i + 1))}`,
              }))}
            />
          </div>
        </Card>
      ) : null}

      {rows.length === 0 ? (
        <Card className="mt-6 p-10 text-center text-ink-2">{t.results.empty}</Card>
      ) : (
        <Card className="mt-6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-line bg-paper-2 text-xs font-bold uppercase tracking-wide text-ink-3">
                <tr>
                  <th className="px-4 py-3">{t.results.table.student}</th>
                  <th className="px-4 py-3">{t.results.table.className}</th>
                  <th className="px-4 py-3">{t.results.table.status}</th>
                  <th className="px-4 py-3 text-center">{t.results.table.result}</th>
                  <th className="px-4 py-3 text-center">{t.results.table.exits}</th>
                  <th className="px-4 py-3">{t.results.table.ai}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(({ attempt: a, firstName, lastName, className }) => {
                  const online = a.status === "in_progress" && now - a.lastSeenAt.getTime() < ONLINE_MS;
                  const report = a.aiReport;
                  const peers = similar.get(a.id)?.length ?? 0;
                  const level = report?.level ?? "none";
                  const effective = peers && level === "none" ? "medium" : level;
                  const tone = effective === "high" ? "red" : effective === "medium" ? "sun" : effective === "low" ? "blue" : "neutral";
                  return (
                    <tr key={a.id} className="transition-colors hover:bg-paper-2/60">
                      <td className="px-4 py-3">
                        <Link href={`/profesor/teste/${id}/rezultate/${a.id}`} className="font-bold hover:text-blue hover:underline">
                          {lastName} {firstName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-ink-2">{className ?? "—"}</td>
                      <td className="px-4 py-3">
                        {a.status === "in_progress" ? (
                          <span className="inline-flex items-center gap-2">
                            <span className={cn("size-2 rounded-full", online ? "bg-green" : "bg-ink-3")} />
                            {t.results.statusLabel.in_progress}
                            <span className="text-xs text-ink-3">({online ? t.results.statusLabel.online : t.results.statusLabel.offline})</span>
                          </span>
                        ) : (
                          <span>
                            {t.results.statusLabel.submitted}
                            {a.submitReason && a.submitReason !== "student" ? <span className="block text-xs text-ink-3">{t.results.reason[a.submitReason]}</span> : null}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {a.status === "submitted" ? (
                          <span className="inline-flex flex-col items-center">
                            <span className="font-display text-xl font-bold">{isGrade ? a.grade : `${Math.round(a.percent ?? 0)}%`}</span>
                            {!a.gradingComplete ? <Badge tone="sun">{t.results.needsGrading}</Badge> : null}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn("font-bold tabular-nums", exitsFor(a) ? "text-red" : "text-ink-3")}>{exitsFor(a)}</span>
                      </td>
                      <td className="px-4 py-3">
                        {effective !== "none" ? (
                          <Badge tone={tone}>
                            <Sparkles className="size-3" /> {t.results.aiLevel[effective]} · {(report?.signals.length ?? 0) + peers}
                          </Badge>
                        ) : (
                          <span className="text-ink-3">{t.results.aiLevel.none}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {notStarted.length ? (
        <p className="mt-3 rounded-2xl bg-sun-soft px-4 py-3 text-sm">
          {fmt(t.classes.notStarted, { names: notStarted.map((m) => `${m.lastName} ${m.firstName}`).join(", ") })}
        </p>
      ) : null}
      <p className="mt-3 text-xs text-ink-3">{fmt(t.common.questionsCount, { n: qs.length })}</p>
    </div>
  );
}
