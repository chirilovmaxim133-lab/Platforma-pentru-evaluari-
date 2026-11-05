import "server-only";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { attempts, tests, type Attempt, type Question, type Test, type User } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { loadQuestions } from "./service";

/**
 * Întrebările nu se mai schimbă după ce elevii au început testul, așa că le ținem în memorie câteva
 * zeci de secunde: la un test cu 30 de elevi care salvează des, economisim sute de interogări.
 */
const questionCache = new Map<string, { at: number; qs: Question[] }>();

export async function cachedQuestions(testId: string): Promise<Question[]> {
  const hit = questionCache.get(testId);
  if (hit && Date.now() - hit.at < 60_000) return hit.qs;
  const qs = await loadQuestions(testId);
  questionCache.set(testId, { at: Date.now(), qs });
  if (questionCache.size > 5000) questionCache.delete(questionCache.keys().next().value!);
  return qs;
}

export type AttemptContext = { user: User; attempt: Attempt; test: Test };

export async function loadOwnAttempt(attemptId: string): Promise<AttemptContext | NextResponse> {
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const [row] = await db
    .select({ attempt: attempts, test: tests })
    .from(attempts)
    .innerJoin(tests, eq(tests.id, attempts.testId))
    .where(eq(attempts.id, attemptId))
    .limit(1);
  if (!row || row.attempt.studentId !== user.id) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return { user, attempt: row.attempt, test: row.test };
}

/** Corpul cererii poate veni și prin navigator.sendBeacon (text/plain). */
export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const text = await req.text();
    if (text.length > 1_000_000) return {};
    const v = JSON.parse(text);
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}
