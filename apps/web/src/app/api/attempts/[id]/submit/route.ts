import { NextResponse, after } from "next/server";
import { runLlmAnalysis } from "@/lib/ai/analyze";
import { cachedQuestions, loadOwnAttempt, readJson } from "@/lib/tests/attempt-api";
import { finalizeAttempt, sanitizeAnswers, sanitizeTelemetry } from "@/lib/tests/service";

export async function POST(req: Request, ctx: RouteContext<"/api/attempts/[id]/submit">) {
  const { id } = await ctx.params;
  const loaded = await loadOwnAttempt(id);
  if (loaded instanceof NextResponse) return loaded;
  const { attempt } = loaded;

  const body = await readJson(req);
  const qs = await cachedQuestions(attempt.testId);
  // „timeout” este acceptat doar dacă timpul chiar a expirat (cu câteva secunde de toleranță pentru ceas).
  const timedOut = body.reason === "timeout" && !!attempt.deadlineAt && Date.now() >= attempt.deadlineAt.getTime() - 5000;

  const final = await finalizeAttempt(attempt.id, timedOut ? "timeout" : "student", {
    answers: body.answers ? sanitizeAnswers(qs, body.answers) : undefined,
    telemetry: body.telemetry ? sanitizeTelemetry(qs, body.telemetry) : undefined,
  });
  if (final && attempt.status === "in_progress") after(() => runLlmAnalysis(attempt.id));
  return NextResponse.json({ status: "submitted", redirect: `/examen/${attempt.id}/rezultat` });
}
