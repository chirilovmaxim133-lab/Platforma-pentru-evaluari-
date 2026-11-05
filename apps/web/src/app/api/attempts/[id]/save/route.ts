import { NextResponse, after } from "next/server";
import { runLlmAnalysis } from "@/lib/ai/analyze";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { attempts } from "@/lib/db/schema";
import { cachedQuestions, loadOwnAttempt, readJson } from "@/lib/tests/attempt-api";
import { DEADLINE_GRACE_MS, finalizeAttempt, sanitizeAnswers, sanitizeTelemetry } from "@/lib/tests/service";

/** Salvarea automată a răspunsurilor (și „semnul de viață” pentru panoul live al profesorului). */
export async function POST(req: Request, ctx: RouteContext<"/api/attempts/[id]/save">) {
  const { id } = await ctx.params;
  const loaded = await loadOwnAttempt(id);
  if (loaded instanceof NextResponse) return loaded;
  const { attempt } = loaded;
  if (attempt.status === "submitted") return NextResponse.json({ status: "submitted" });

  const body = await readJson(req);
  const qs = await cachedQuestions(attempt.testId);
  const answers = sanitizeAnswers(qs, body.answers);
  const telemetry = sanitizeTelemetry(qs, body.telemetry);

  if (attempt.deadlineAt && Date.now() > attempt.deadlineAt.getTime() + DEADLINE_GRACE_MS) {
    await finalizeAttempt(attempt.id, "timeout");
    after(() => runLlmAnalysis(attempt.id));
    return NextResponse.json({ status: "submitted" });
  }

  const now = new Date();
  await db
    .update(attempts)
    .set({
      ...(body.answers ? { answers } : {}),
      ...(body.telemetry ? { telemetry: { ...attempt.telemetry, ...telemetry } } : {}),
      lastSeenAt: now,
    })
    .where(and(eq(attempts.id, attempt.id), eq(attempts.status, "in_progress")));

  return NextResponse.json(
    { status: "in_progress", violationCount: attempt.violationCount, serverNow: now.getTime() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
