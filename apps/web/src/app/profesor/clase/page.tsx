import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { fmt, getDict } from "@/lib/i18n";
import { listTeacherClasses } from "@/lib/classes/service";
import { fmtAvg } from "@/lib/stats";
import { Ornament } from "@/components/Ornament";
import { Card } from "@/components/ui";
import { CreateClassForm } from "./CreateClassForm";

export default async function ClassesPage() {
  const user = await requireUser("teacher");
  const { t, locale } = await getDict();
  const list = await listTeacherClasses(user.id);

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{t.classes.title}</h1>
      <p className="mt-2 max-w-2xl text-ink-2">{t.classes.subtitle}</p>

      <Card className="mt-8 p-5 sm:p-6">
        <h2 className="mb-4 font-display text-lg font-bold">{t.classes.new}</h2>
        <CreateClassForm />
      </Card>

      {list.length === 0 ? (
        <Card className="mt-6 flex flex-col items-center px-6 py-14 text-center">
          <Ornament motif="wheat" className="w-14" />
          <p className="mt-6 max-w-sm text-ink-2">{t.classes.empty}</p>
        </Card>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <li key={c.id}>
              <Link href={`/profesor/clase/${c.id}`} className="group block h-full">
                <Card className="relative h-full overflow-hidden p-6 transition-all group-hover:-translate-y-0.5 group-hover:shadow-lift">
                  <Ornament motif="wheat" className="absolute -right-2 -top-2 w-12 opacity-20 transition-opacity group-hover:opacity-60" />
                  <p className="font-display text-3xl font-bold">{c.name}</p>
                  <p className="mt-1 text-sm text-ink-3">{[c.subject, c.gradeLevel ? fmt(t.classes.levelShort, { n: c.gradeLevel }) : null].filter(Boolean).join(" · ") || " "}</p>
                  <div className="mt-6 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-ink-3">{t.classes.average}</p>
                      <p className="font-sans text-3xl font-extrabold tracking-tight">{c.average !== null ? fmtAvg(c.average, locale) : "—"}</p>
                    </div>
                    <div className="text-right text-sm text-ink-2">
                      <p className="inline-flex items-center gap-1.5">
                        <Users className="size-4" /> {fmt(t.classes.students, { n: c.students })}
                      </p>
                      <p>{fmt(t.classes.tests, { n: c.tests })}</p>
                    </div>
                  </div>
                  <p className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-red">
                    {t.classes.open} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
