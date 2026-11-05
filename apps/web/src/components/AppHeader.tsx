import Link from "next/link";
import { LogOut } from "lucide-react";
import { getCurrentUser, homeFor } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n";
import { logoutAction } from "@/app/(auth)/actions";
import { LocaleSwitch } from "./LocaleSwitch";
import { Logo } from "./Logo";
import { btn } from "./ui";

/** Antetul paginilor din aplicație (profesor, elev). */
export async function AppHeader() {
  const [{ t }, user] = await Promise.all([getDict(), getCurrentUser()]);
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Logo href={user ? homeFor(user.role) : "/"} />
        <div className="flex items-center gap-2">
          <LocaleSwitch />
          {user ? (
            <>
              <Link href={homeFor(user.role)} className="hidden text-sm font-semibold text-ink-2 hover:text-ink sm:block">
                {user.firstName} {user.lastName}
              </Link>
              <form action={logoutAction}>
                <button className={btn("ghost", "sm")} aria-label={t.common.logout} title={t.common.logout}>
                  <LogOut className="size-4" />
                  <span className="hidden sm:inline">{t.common.logout}</span>
                </button>
              </form>
            </>
          ) : (
            <Link href="/autentificare" className={btn("primary", "sm")}>
              {t.nav.login}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
