import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { CheckCircle2, UserRound, Users } from "lucide-react";
import { db } from "@/lib/db";
import { classes, classMembers, users } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { fmt, getDict } from "@/lib/i18n";
import { isMember } from "@/lib/classes/service";
import { normalizeAccessCode } from "@/lib/tests/random";
import { Logo } from "@/components/Logo";
import { EmbroideryBand, Ornament } from "@/components/Ornament";
import { btn, Card } from "@/components/ui";
import { joinClassAction } from "@/app/elev/actions";

export default async function ClassJoinPage({ params, searchParams }: PageProps<"/c/[code]">) {
  const [{ code: raw }, sp] = await Promise.all([params, searchParams]);
  const code = normalizeAccessCode(raw);
  if (code !== raw) redirect(`/c/${code}`);
  const { t } = await getDict();

  const [row] = await db
    .select({
      cls: classes,
      teacherFirst: users.firstName,
      teacherLast: users.lastName,
      members: sql<number>`(select count(*)::int from ${classMembers} where ${classMembers.classId} = ${classes.id})`,
    })
    .from(classes)
    .innerJoin(users, eq(users.id, classes.ownerId))
    .where(eq(classes.joinCode, code))
    .limit(1);
  if (!row) notFound();
  const user = await getCurrentUser();
  const member = user?.role === "student" ? await isMember(row.cls.id, user.id) : false;
  const next = encodeURIComponent(`/c/${code}`);

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 py-6">
      <Logo />
      <Card className="relative mt-8 overflow-hidden text-center">
        <EmbroideryBand height={16} id="cls-join" />
        <div className="px-6 pb-10 pt-8 sm:px-10">
          <Ornament motif="wheat" className="mx-auto w-14" />
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-red">{t.classJoin.title}</p>
          <h1 className="mt-2 font-display text-5xl font-bold">{row.cls.name}</h1>
          {row.cls.subject ? <p className="mt-2 text-lg text-ink-2">{row.cls.subject}</p> : null}
          <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-ink-2">
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="size-4" /> {fmt(t.classJoin.teacher, { name: `${row.teacherFirst} ${row.teacherLast}` })}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-4" /> {fmt(t.classJoin.members, { n: row.members })}
            </span>
          </div>

          <div className="mt-8">
            {sp.joined && member ? (
              <>
                <p className="inline-flex items-center gap-2 rounded-2xl bg-green-soft px-4 py-3 font-bold text-green">
                  <CheckCircle2 className="size-5" /> {fmt(t.classJoin.joined, { name: row.cls.name })}
                </p>
                <div className="mt-6">
                  <Link href="/elev" className={btn("primary", "lg")}>
                    {t.classJoin.goHome}
                  </Link>
                </div>
              </>
            ) : !user ? (
              <div className="flex flex-col gap-3">
                <Link href={`/inregistrare?next=${next}`} className={btn("red", "lg")}>
                  {t.classJoin.register}
                </Link>
                <Link href={`/autentificare?next=${next}`} className={btn("outline", "lg")}>
                  {t.classJoin.login}
                </Link>
              </div>
            ) : user.role !== "student" ? (
              <p className="rounded-2xl bg-blue-soft px-4 py-3 text-sm font-semibold text-blue">{t.classJoin.teacherView}</p>
            ) : member ? (
              <>
                <p className="font-semibold text-ink-2">{t.classJoin.already}</p>
                <Link href="/elev" className={btn("outline", "lg", "mt-4")}>
                  {t.classJoin.goHome}
                </Link>
              </>
            ) : (
              <form action={joinClassAction.bind(null, code)}>
                <button className={btn("red", "lg", "w-full")}>{t.classJoin.join}</button>
              </form>
            )}
          </div>
        </div>
      </Card>
    </main>
  );
}
