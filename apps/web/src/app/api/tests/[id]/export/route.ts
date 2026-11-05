import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { attempts, users } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n";
import { getOwnedTest } from "@/lib/tests/service";

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
// Excel din Moldova folosește „;” ca separator și virgula zecimală.
const num = (v: number | null) => (v === null ? "" : String(v).replace(".", ","));

export async function GET(_req: Request, ctx: RouteContext<"/api/tests/[id]/export">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  const test = user ? await getOwnedTest(id, user) : null;
  if (!test) return new Response("Not found", { status: 404 });
  const { t } = await getDict();

  const rows = await db
    .select({ a: attempts, firstName: users.firstName, lastName: users.lastName, className: users.className })
    .from(attempts)
    .innerJoin(users, eq(users.id, attempts.studentId))
    .where(eq(attempts.testId, id))
    .orderBy(asc(users.lastName), asc(users.firstName));

  const header = [
    t.auth.lastName,
    t.auth.firstName,
    t.auth.className,
    t.results.table.status,
    t.common.points,
    "max",
    "%",
    t.settings.grade10,
    t.results.table.exits,
    t.results.table.ai,
  ];
  const lines = rows.map(({ a, firstName, lastName, className }) =>
    [
      lastName,
      firstName,
      className,
      t.results.statusLabel[a.status],
      num(a.score),
      num(a.maxScore),
      num(a.percent),
      a.grade ?? "",
      a.violationCount,
      a.aiReport ? t.results.aiLevel[a.aiReport.level] : "",
    ]
      .map(cell)
      .join(";"),
  );
  const csv = "﻿" + [header.map(cell).join(";"), ...lines].join("\r\n");
  const name = (test.title || "test").replace(/[^\p{L}\p{N}]+/gu, "_").slice(0, 60);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(name)}.csv"; filename*=UTF-8''${encodeURIComponent(name)}.csv`,
      "Cache-Control": "no-store",
    },
  });
}
