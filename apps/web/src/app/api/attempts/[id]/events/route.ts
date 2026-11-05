import { NextResponse, after } from "next/server";
import { runLlmAnalysis } from "@/lib/ai/analyze";
import { loadOwnAttempt, readJson } from "@/lib/tests/attempt-api";
import { CLIENT_EVENT_TYPES, recordEvent } from "@/lib/tests/service";

/** Ieșiri din test, încercări de copiere sau de captură de ecran — trimise de pagina de examen. */
export async function POST(req: Request, ctx: RouteContext<"/api/attempts/[id]/events">) {
  const { id } = await ctx.params;
  const loaded = await loadOwnAttempt(id);
  if (loaded instanceof NextResponse) return loaded;
  const { attempt, test } = loaded;
  if (attempt.status === "submitted") return NextResponse.json({ status: "submitted", violationCount: attempt.violationCount });

  const body = await readJson(req);
  const type = typeof body.type === "string" ? body.type : "";
  if (!CLIENT_EVENT_TYPES.has(type)) return NextResponse.json({ error: "bad_type" }, { status: 400 });
  const detail =
    body.detail && typeof body.detail === "object" && JSON.stringify(body.detail).length < 500
      ? (body.detail as Record<string, unknown>)
      : null;

  const outcome = await recordEvent(attempt, test, type, detail);
  if (outcome.status === "submitted") after(() => runLlmAnalysis(attempt.id));
  return NextResponse.json({ ...outcome, max: test.settings.security.maxViolations });
}
