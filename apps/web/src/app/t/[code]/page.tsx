import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { Ban, Camera, Clock, Copy, LogOut, Maximize, ShieldAlert, Stamp, UserRound } from "lucide-react";
import { db } from "@/lib/db";
import { attempts, classes, questions, tests, users } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { DICTS, fmt } from "@/lib/i18n";
import { normalizeAccessCode } from "@/lib/tests/random";
import { Logo } from "@/components/Logo";
import { Ornament } from "@/components/Ornament";
import { Badge, btn, Card } from "@/components/ui";
import { startAttemptAction } from "@/app/elev/actions";

export default async function JoinPage({ params, searchParams }: PageProps<"/t/[code]">) {
  const [{ code: raw }, sp] = await Promise.all([params, searchParams]);
  const code = normalizeAccessCode(raw);
  if (code !== raw) redirect(`/t/${code}`);

  const [row] = await db
    .select({
      test: tests,
      teacherFirst: users.firstName,
      teacherLast: users.lastName,
      questionCount: sql<number>`(select count(*)::int from ${questions} where ${questions.testId} = ${tests.id})`,
    })
    .from(tests)
    .innerJoin(users, eq(users.id, tests.ownerId))
    .where(eq(tests.accessCode, code))
    .limit(1);
  if (!row || row.test.status === "draft") notFound();
  const { test } = row;
  const t = DICTS[test.language];
  const user = await getCurrentUser();

  let existing: { id: string; status: string } | undefined;
  if (user?.role === "student") {
    [existing] = await db
      .select({ id: attempts.id, status: attempts.status })
      .from(attempts)
      .where(and(eq(attempts.testId, test.id), eq(attempts.studentId, user.id)))
      .limit(1);
    if (existing?.status === "submitted") redirect(`/examen/${existing.id}/rezultat`);
  }

  const s = test.settings;
  const rules: { icon: typeof Clock; text: string }[] = [
    { icon: Clock, text: s.timeLimitMinutes ? fmt(t.join.rules.time, { n: s.timeLimitMinutes }) : t.join.rules.noTime },
    s.security.allowLeave
      ? { icon: LogOut, text: t.join.rules.leaveOk }
      : {
          icon: ShieldAlert,
          text:
            t.join.rules.noLeave +
            (s.security.onViolationLimit === "submit" ? ` ${fmt(t.join.rules.noLeaveLimit, { n: s.security.maxViolations })}` : ""),
        },
    ...(!s.security.allowScreenshots ? [{ icon: Camera, text: t.join.rules.noScreenshots }] : []),
    ...(!s.security.allowCopyPaste ? [{ icon: Copy, text: t.join.rules.noCopy }] : []),
    ...(s.security.watermark ? [{ icon: Stamp, text: t.join.rules.watermark }] : []),
    ...(s.security.requireFullscreen && !s.security.allowLeave ? [{ icon: Maximize, text: t.join.rules.fullscreen }] : []),
    { icon: Ban, text: t.join.rules.oneAttempt },
  ];
  let className = "";
  if (sp.e === "notInClass" && test.classId) {
    const [cls] = await db.select({ name: classes.name }).from(classes).where(eq(classes.id, test.classId)).limit(1);
    className = cls?.name ?? "";
  }
  const errorText =
    sp.e === "closed"
      ? t.join.closed
      : sp.e === "notPublished"
        ? t.join.notPublished
        : sp.e === "appOnly"
          ? t.join.appOnly
          : sp.e === "notInClass"
            ? fmt(t.join.notInClass, { name: className })
            : null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-6">
      <Logo />
      <Card className="relative mt-8 overflow-hidden p-6 sm:p-10">
        <Ornament motif="star" className="absolute -right-10 -top-10 hidden w-44 opacity-20 sm:block" />
        <Badge tone="red">{code.slice(0, 3)} {code.slice(3)}</Badge>
        <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{test.title}</h1>
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-2">
          <span className="inline-flex items-center gap-1.5">
            <UserRound className="size-4" /> {fmt(t.join.teacher, { name: `${row.teacherFirst} ${row.teacherLast}` })}
          </span>
          {test.subject ? <span>· {test.subject}</span> : null}
          <span>· {fmt(t.common.questionsCount, { n: row.questionCount })}</span>
        </p>
        {test.description ? <p className="mt-5 whitespace-pre-wrap leading-relaxed">{test.description}</p> : null}

        <h2 className="mt-8 text-sm font-bold uppercase tracking-wider text-ink-3">{t.join.rulesTitle}</h2>
        <ul className="mt-3 space-y-3">
          {rules.map((r, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-paper-2 text-red">
                <r.icon className="size-4" />
              </span>
              <span className="pt-1 leading-snug">{r.text}</span>
            </li>
          ))}
        </ul>

        {errorText ? <p className="mt-6 rounded-2xl bg-red-soft px-4 py-3 font-semibold text-red">{errorText}</p> : null}

        <div className="mt-8">
          {test.status === "closed" && !existing ? (
            <p className="font-semibold text-ink-2">{t.join.closed}</p>
          ) : !user ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href={`/autentificare?next=/t/${code}`} className={btn("red", "lg", "flex-1")}>
                {t.nav.login}
              </Link>
              <Link href={`/inregistrare?next=/t/${code}`} className={btn("outline", "lg", "flex-1")}>
                {t.nav.register}
              </Link>
            </div>
          ) : user.role !== "student" ? (
            <p className="rounded-2xl bg-blue-soft px-4 py-3 text-sm font-semibold text-blue">{t.join.teacherPreview}</p>
          ) : (
            <form action={startAttemptAction.bind(null, code)}>
              <button className={btn("red", "lg", "w-full")}>{existing ? t.join.resume : t.join.start}</button>
            </form>
          )}
        </div>
      </Card>
    </main>
  );
}
