"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { classes, tests } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { joinClass } from "@/lib/classes/service";
import { normalizeAccessCode } from "@/lib/tests/random";
import { startAttempt } from "@/lib/tests/service";
import { getDict } from "@/lib/i18n";

/** Același câmp primește și codul unui test, și codul unei clase. */
export async function joinByCodeAction(_: { error?: string } | undefined, form: FormData) {
  const { t } = await getDict();
  const code = normalizeAccessCode(String(form.get("code") ?? ""));
  if (code.length < 4) return { error: t.student.notFound };
  const [test] = await db.select({ id: tests.id, status: tests.status }).from(tests).where(eq(tests.accessCode, code)).limit(1);
  if (test && test.status !== "draft") redirect(`/t/${code}`);
  const [cls] = await db.select({ id: classes.id }).from(classes).where(eq(classes.joinCode, code)).limit(1);
  if (cls) redirect(`/c/${code}`);
  return { error: t.student.notFound };
}

export async function startAttemptAction(code: string) {
  const student = await requireUser("student", `/t/${code}`);
  const [test] = await db.select().from(tests).where(eq(tests.accessCode, normalizeAccessCode(code))).limit(1);
  if (!test) redirect("/elev");
  const res = await startAttempt(test, student, "web");
  if (!res.ok) redirect(`/t/${code}?e=${res.reason}`);
  redirect(`/examen/${res.attemptId}`);
}

export async function joinClassAction(code: string) {
  const student = await requireUser("student", `/c/${code}`);
  const [cls] = await db.select({ id: classes.id }).from(classes).where(eq(classes.joinCode, normalizeAccessCode(code))).limit(1);
  if (!cls) redirect("/elev");
  await joinClass(cls.id, student.id);
  redirect(`/c/${code}?joined=1`);
}
