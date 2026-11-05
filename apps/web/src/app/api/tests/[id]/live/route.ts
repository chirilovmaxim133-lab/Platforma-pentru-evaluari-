import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { attempts } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getOwnedTest } from "@/lib/tests/service";

/** Contoarele live pentru ecranul cu codul QR (interogat la câteva secunde). */
export async function GET(_req: Request, ctx: RouteContext<"/api/tests/[id]/live">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user || !(await getOwnedTest(id, user))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const [row] = await db
    .select({
      joined: sql<number>`count(*)::int`,
      inProgress: sql<number>`count(*) filter (where ${attempts.status} = 'in_progress')::int`,
      submitted: sql<number>`count(*) filter (where ${attempts.status} = 'submitted')::int`,
    })
    .from(attempts)
    .where(eq(attempts.testId, id));
  return NextResponse.json(row, { headers: { "Cache-Control": "no-store" } });
}
