import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { classes, schools, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser, homeFor } from "@/lib/auth/session";
import { mpassEnabled } from "@/lib/auth/mpass";
import { verifyPayload } from "@/lib/auth/crypto";
import { getDict } from "@/lib/i18n";
import { AuthShell } from "../AuthShell";
import { MpassCompleteForm, RegisterForm, type ClassInvite } from "../AuthForms";
import { MPASS_PENDING_COOKIE, type MpassPending } from "@/lib/auth/mpass-pending";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string; mpass?: string }> }) {
  const [{ next, mpass }, user, { t }] = await Promise.all([searchParams, getCurrentUser(), getDict()]);
  if (user) redirect(homeFor(user.role));

  const schoolRows = await db
    .select({ name: schools.name, locality: schools.locality })
    .from(schools)
    .orderBy(asc(schools.name))
    .limit(2000);
  const schoolNames = schoolRows.map((s) => `${s.name} — ${s.locality}`);

  if (mpass) {
    const pending = verifyPayload<MpassPending>((await cookies()).get(MPASS_PENDING_COOKIE)?.value);
    if (pending) {
      return (
        <AuthShell title={t.auth.mpassFinish} subtitle={t.auth.mpassFinishText}>
          <MpassCompleteForm firstName={pending.firstName} lastName={pending.lastName} schools={schoolNames} />
        </AuthShell>
      );
    }
  }

  // Venit din invitația unei clase (/c/COD): elevul se înregistrează direct în acea clasă.
  let invite: ClassInvite | null = null;
  const m = /^\/c\/([A-Z0-9]{4,10})$/.exec(next ?? "");
  if (m) {
    const [row] = await db
      .select({ name: classes.name, first: users.firstName, last: users.lastName, school: users.schoolName })
      .from(classes)
      .innerJoin(users, eq(users.id, classes.ownerId))
      .where(eq(classes.joinCode, m[1]))
      .limit(1);
    if (row) invite = { code: m[1], name: row.name, teacher: `${row.first} ${row.last}`, school: row.school ?? "" };
  }

  return (
    <AuthShell title={t.auth.registerTitle} subtitle={t.auth.registerSubtitle}>
      <RegisterForm next={next} schools={schoolNames} mpass={mpassEnabled()} invite={invite} />
    </AuthShell>
  );
}
