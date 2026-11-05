import Link from "next/link";
import { LogOut } from "lucide-react";
import { getCurrentUser, homeFor } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n";
import { logoutAction } from "@/app/(auth)/actions";
import { LocaleSwitch } from "./LocaleSwitch";
import { Logo } from "./Logo";
import { NavLinks } from "./NavLinks";
import { EmbroideryBand } from "./Ornament";
import { btn } from "./ui";

/** Antetul paginilor din aplicație (profesor, elev), cu altița brodată dedesubt. */
export async function AppHeader() {
  const [{ t }, user] = await Promise.all([getDict(), getCurrentUser()]);
  const links =
    user?.role === "student"
      ? [{ href: "/elev", label: t.nav.home }]
      : user
        ? [
            { href: "/profesor", label: t.nav.tests },
            { href: "/profesor/clase", label: t.nav.classes },
          ]
        : [];
  return (
    <header className="sticky top-0 z-40 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-6">
          <Logo href={user ? homeFor(user.role) : "/"} />
          {links.length > 1 ? <NavLinks links={links} /> : null}
        </div>
        <div className="flex items-center gap-2">
          <LocaleSwitch />
          {user ? (
            <>
              <span className="hidden text-sm font-semibold text-ink-2 md:block">
                {user.firstName} {user.lastName}
              </span>
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
      <EmbroideryBand height={14} id="app-hdr" />
    </header>
  );
}
