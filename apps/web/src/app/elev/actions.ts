"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tests } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { normalizeAccessCode } from "@/lib/tests/random";
import { startAttempt } from "@/lib/tests/service";
import { getDict } from "@/lib/i18n";

export async function joinByCodeAction(_: { error?: string } | undefined, form: FormData) {
  const { t } = await getDict();
  const code = normalizeAccessCode(String(form.get("code") ?? ""));
  if (code.length < 4) return { error: t.student.notFound };
  const [test] = await db.select({ id: tests.id, status: tests.status }).from(tests).where(eq(tests.accessCode, code)).limit(1);
  if (!test || test.status === "draft") return { error: t.student.notFound };
  redirect(`/t/${code}`);
}

export async function startAttemptAction(code: string) {
  const student = await requireUser("student", `/t/${code}`);
  const [test] = await db.select().from(tests).where(eq(tests.accessCode, normalizeAccessCode(code))).limit(1);
  if (!test) redirect("/elev");
  const res = await startAttempt(test, student, "web");
  if (!res.ok) redirect(`/t/${code}?e=${res.reason}`);
  redirect(`/examen/${res.attemptId}`);
}
