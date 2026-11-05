import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth/session";
import { mpassEnabled } from "@/lib/auth/mpass";
import { getDict } from "@/lib/i18n";
import { AuthShell } from "../AuthShell";
import { LoginForm } from "../AuthForms";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, user, { t }] = await Promise.all([searchParams, getCurrentUser(), getDict()]);
  if (user) redirect(next?.startsWith("/") && !next.startsWith("//") ? next : homeFor(user.role));
  return (
    <AuthShell title={t.auth.loginTitle} subtitle={t.auth.loginSubtitle}>
      <LoginForm next={next} mpass={mpassEnabled()} />
    </AuthShell>
  );
}
