"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq, ilike } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { schools, users, type Role } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, homeFor } from "@/lib/auth/session";
import { verifyPayload } from "@/lib/auth/crypto";
import { MPASS_PENDING_COOKIE, type MpassPending } from "@/lib/auth/mpass-pending";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { getDict, LOCALE_COOKIE } from "@/lib/i18n";

export type FormState = { error?: string } | undefined;

/** Doar adrese interne, ca să nu putem fi folosiți pentru redirecționări către alte site-uri. */
function safeNext(next: FormDataEntryValue | null, fallback: string): string {
  const s = typeof next === "string" ? next : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : fallback;
}

async function rememberLocale(locale: string) {
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 365 * 24 * 3600, sameSite: "lax" });
}

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const { t } = await getDict();
  const ip = await clientIp();
  if (!rateLimit(`login:${ip}`, 20, 60_000)) return { error: t.auth.errors.tooMany };

  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: t.auth.errors.missing };
  if (!rateLimit(`login:${email}`, 8, 60_000)) return { error: t.auth.errors.tooMany };

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, password))) {
    return { error: t.auth.errors.invalid };
  }
  await createSession(user.id);
  await rememberLocale(user.locale);
  redirect(safeNext(form.get("next"), homeFor(user.role)));
}

const profileSchema = z.object({
  role: z.enum(["student", "teacher"]),
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  school: z.string().trim().min(2).max(200),
  className: z.string().trim().max(10).optional(),
});

/** Leagă textul introdus de o școală din registru, dacă se potrivește exact. */
async function resolveSchool(name: string): Promise<{ schoolId: string | null; schoolName: string }> {
  const label = name.split(" — ")[0].trim();
  const pattern = label.replace(/[\\%_]/g, (c) => `\\${c}`);
  const [match] = await db.select({ id: schools.id }).from(schools).where(ilike(schools.name, pattern)).limit(1);
  return { schoolId: match?.id ?? null, schoolName: label };
}

export async function registerAction(_: FormState, form: FormData): Promise<FormState> {
  const { t, locale } = await getDict();
  const ip = await clientIp();
  if (!rateLimit(`register:${ip}`, 10, 60_000)) return { error: t.auth.errors.tooMany };

  const profile = profileSchema.safeParse(Object.fromEntries(form));
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!profile.success || !z.email().safeParse(email).success) return { error: t.auth.errors.missing };
  if (password.length < 8) return { error: t.auth.errors.weakPassword };
  if (profile.data.role === "student" && !profile.data.className) return { error: t.auth.errors.missing };

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return { error: t.auth.errors.exists };

  const { schoolId, schoolName } = await resolveSchool(profile.data.school);
  const [user] = await db
    .insert(users)
    .values({
      role: profile.data.role as Role,
      email,
      passwordHash: await hashPassword(password),
      firstName: profile.data.firstName,
      lastName: profile.data.lastName,
      schoolId,
      schoolName,
      className: profile.data.role === "student" ? profile.data.className?.toUpperCase() : null,
      locale,
    })
    .returning();
  await createSession(user.id);
  redirect(safeNext(form.get("next"), homeFor(user.role)));
}

export async function completeMpassAction(_: FormState, form: FormData): Promise<FormState> {
  const { t, locale } = await getDict();
  const jar = await cookies();
  const pending = verifyPayload<MpassPending>(jar.get(MPASS_PENDING_COOKIE)?.value);
  if (!pending) return { error: t.auth.errors.mpass };

  const profile = profileSchema.safeParse({
    ...Object.fromEntries(form),
    firstName: pending.firstName || form.get("firstName"),
    lastName: pending.lastName || form.get("lastName"),
  });
  if (!profile.success) return { error: t.auth.errors.missing };
  if (profile.data.role === "student" && !profile.data.className) return { error: t.auth.errors.missing };

  const { schoolId, schoolName } = await resolveSchool(profile.data.school);
  const [user] = await db
    .insert(users)
    .values({
      role: profile.data.role,
      mpassSubject: pending.subject,
      firstName: profile.data.firstName,
      lastName: profile.data.lastName,
      schoolId,
      schoolName,
      className: profile.data.role === "student" ? profile.data.className?.toUpperCase() : null,
      locale,
    })
    .onConflictDoNothing()
    .returning();
  jar.delete(MPASS_PENDING_COOKIE);
  if (!user) return { error: t.auth.errors.mpass };
  await createSession(user.id);
  redirect(homeFor(user.role));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
