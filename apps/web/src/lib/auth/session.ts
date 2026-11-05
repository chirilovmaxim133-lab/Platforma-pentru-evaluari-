import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessions, users, type Role, type User } from "@/lib/db/schema";
import { isHttps } from "@/config/site";
import { randomToken, sha256 } from "./crypto";

const COOKIE = "sid";
const SESSION_DAYS = 30;

export async function createSession(userId: string): Promise<void> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  await db.insert(sessions).values({ id: sha256(token), userId, expiresAt });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: isHttps(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, sha256(token)));
  jar.delete(COOKIE);
}

/** Utilizatorul curent (o singură interogare per cerere, datorită `cache`). */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sha256(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0]?.user ?? null;
});

export function homeFor(role: Role): string {
  return role === "student" ? "/elev" : "/profesor";
}

export async function requireUser(role?: Role | Role[], next?: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/autentificare?next=${encodeURIComponent(next)}` : "/autentificare");
  const allowed = role ? (Array.isArray(role) ? role : [role]) : null;
  if (allowed && !allowed.includes(user.role) && user.role !== "admin") redirect(homeFor(user.role));
  return user;
}
