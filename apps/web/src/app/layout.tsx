import type { Metadata, Viewport } from "next";
import "@fontsource-variable/unbounded";
import "@fontsource-variable/manrope";
import "katex/dist/katex.min.css";
import "./globals.css";
import { clientDict, getDict } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth/session";
import { I18nProvider } from "@/lib/i18n/client";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: t.meta.title, description: t.meta.description };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf7ee" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1020" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [{ locale, t }, user] = await Promise.all([getDict(), getCurrentUser()]);
  return (
    <html lang={locale}>
      <body className="linen min-h-dvh">
        <I18nProvider locale={locale} t={clientDict(t, user?.role)}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
