import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { schools } from "@/lib/db/schema";
import { getCurrentUser, homeFor } from "@/lib/auth/session";
import { mpassEnabled } from "@/lib/auth/mpass";
import { verifyPayload } from "@/lib/auth/crypto";
import { getDict } from "@/lib/i18n";
import { AuthShell } from "../AuthShell";
import { MpassCompleteForm, RegisterForm } from "../AuthForms";
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

  return (
    <AuthShell title={t.auth.registerTitle} subtitle={t.auth.registerSubtitle}>
      <RegisterForm next={next} schools={schoolNames} mpass={mpassEnabled()} />
    </AuthShell>
  );
}
