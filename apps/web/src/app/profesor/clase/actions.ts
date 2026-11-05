"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { classes, classMembers } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { createClass, getOwnedClass } from "@/lib/classes/service";
import { getDict } from "@/lib/i18n";

const classSchema = z.object({
  name: z.string().trim().min(1).max(40),
  subject: z.string().trim().max(80),
  gradeLevel: z.coerce.number().int().min(1).max(12).nullable(),
});

export async function createClassAction(_: { error?: string } | undefined, form: FormData) {
  const user = await requireUser("teacher");
  const { t } = await getDict();
  const gl = String(form.get("gradeLevel") ?? "");
  const parsed = classSchema.safeParse({ name: form.get("name"), subject: form.get("subject") ?? "", gradeLevel: gl ? gl : null });
  if (!parsed.success) return { error: t.auth.errors.missing };
  const id = await createClass(user, parsed.data);
  redirect(`/profesor/clase/${id}`);
}

export async function deleteClassAction(classId: string) {
  const user = await requireUser("teacher");
  if (!(await getOwnedClass(classId, user))) return;
  await db.delete(classes).where(eq(classes.id, classId));
  redirect("/profesor/clase");
}

export async function removeMemberAction(classId: string, studentId: string) {
  const user = await requireUser("teacher");
  if (!(await getOwnedClass(classId, user))) return;
  await db.delete(classMembers).where(and(eq(classMembers.classId, classId), eq(classMembers.studentId, studentId)));
}
