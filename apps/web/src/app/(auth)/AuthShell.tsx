import { LocaleSwitch } from "@/components/LocaleSwitch";
import { Logo } from "@/components/Logo";
import { EmbroideryBand, Ornament } from "@/components/Ornament";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col overflow-hidden bg-night lg:flex">
        <EmbroideryBand tone="dark" height={36} id="auth-top" />
        <div className="grid flex-1 grid-cols-3 place-items-center gap-10 p-12">
          {(["star", "tree", "rhombus", "wheat", "star", "tree"] as const).map((m, i) => (
            <Ornament key={i} motif={m} tone="dark" className={i % 2 ? "w-24 opacity-60" : "w-32 opacity-90"} />
          ))}
        </div>
        <EmbroideryBand tone="dark" height={36} id="auth-bottom" />
      </section>
      <section className="flex flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo />
          <LocaleSwitch />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-2 text-ink-2">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}
