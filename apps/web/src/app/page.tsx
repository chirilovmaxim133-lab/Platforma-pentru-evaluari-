import Link from "next/link";
import { AlignLeft, CircleDot, Hash, ListChecks, QrCode, School, Sparkles, ToggleLeft, Type, Wand2, Zap } from "lucide-react";
import { getCurrentUser, homeFor } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n";
import { DEFAULT_THRESHOLDS } from "@/lib/tests/presets";
import { SITE } from "@/config/site";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { Logo } from "@/components/Logo";
import { MathText } from "@/components/MathText";
import { Ornament } from "@/components/Ornament";
import { btn } from "@/components/ui";
import { Hero } from "@/components/landing/Hero";
import { Reveal } from "@/components/landing/Reveal";
import { SecurityDemo } from "@/components/landing/SecurityDemo";
import { TrapDemo } from "@/components/landing/TrapDemo";

const GRADE_COLORS = ["#c8283c", "#d6473b", "#e0663a", "#e98a38", "#f2b32a", "#c9b52f", "#8fb23d", "#55a64b", "#2e9555", "#1f8a5b"];

function SectionTitle({ kicker, title, subtitle }: { kicker?: string; title: string; subtitle?: string }) {
  return (
    <Reveal className="mx-auto max-w-3xl text-center">
      {kicker ? <p className="text-sm font-bold uppercase tracking-[0.2em] text-red">{kicker}</p> : null}
      <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl">{title}</h2>
      {subtitle ? <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-ink-2">{subtitle}</p> : null}
    </Reveal>
  );
}

export default async function Landing() {
  const [{ t }, user] = await Promise.all([getDict(), getCurrentUser()]);
  const home = user ? homeFor(user.role) : null;

  const types = [
    { icon: CircleDot, title: t.qtypes.single, sample: "$2^{10} = $ ?  A) 512  **B) 1024**  C) 2048" },
    { icon: ListChecks, title: t.qtypes.multiple, sample: "Moldova · Chișinău · Bălți · Cahul" },
    { icon: ToggleLeft, title: t.qtypes.truefalse, sample: "$\\sqrt{49} = 7$ ✓" },
    { icon: Type, title: t.qtypes.short, sample: "Ștefan cel Mare = ștefan cel mare = Stefan cel Mare" },
    { icon: Hash, title: t.qtypes.number, sample: "$\\pi \\approx 3{,}14 \\pm 0{,}01$" },
    { icon: AlignLeft, title: t.qtypes.long, sample: "„Luceafărul” — 150–250" },
  ];

  return (
    <div>
      <header className="sticky top-0 z-40 border-b border-line/60 bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm font-semibold text-ink-2 md:flex">
            <a href="#cum" className="hover:text-ink">{t.nav.how}</a>
            <a href="#securitate" className="hover:text-ink">{t.nav.security}</a>
            <a href="#ai" className="hover:text-ink">{t.nav.ai}</a>
            <a href="#scoli" className="hover:text-ink">{t.nav.schools}</a>
          </nav>
          <div className="flex items-center gap-2">
            <LocaleSwitch />
            {home ? (
              <Link href={home} className={btn("primary", "sm")}>{t.nav.myTests}</Link>
            ) : (
              <>
                <Link href="/autentificare" className={btn("ghost", "sm", "hidden sm:inline-flex")}>{t.nav.login}</Link>
                <Link href="/inregistrare" className={btn("primary", "sm")}>{t.nav.register}</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <Hero loggedInHref={home} />

      {/* Cifre */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {t.landing.stats.map(([n, label], i) => (
            <Reveal key={label} delay={i * 0.08}>
              <div className="rounded-3xl border border-line bg-card px-5 py-6 shadow-soft">
                <div className="font-display text-3xl font-bold">{n}</div>
                <div className="mt-1 text-sm font-semibold text-ink-3">{label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Banda cu discipline */}
      <section className="mt-16 overflow-hidden border-y border-line bg-ink py-5 text-paper" aria-hidden>
        <div className="marquee flex w-max items-center gap-8 whitespace-nowrap">
          {[...t.landing.subjects, ...t.landing.subjects].map((s, i) => (
            <span key={i} className="flex items-center gap-8 font-display text-lg font-bold">
              {s}
              <Ornament motif="small" className="size-5" />
            </span>
          ))}
        </div>
      </section>

      {/* Cum funcționează */}
      <section id="cum" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24">
        <SectionTitle kicker="01" title={t.landing.howTitle} />
        <div className="relative mt-14 grid gap-5 md:grid-cols-3">
          <div className="stitch-line absolute left-[16%] right-[16%] top-10 hidden md:block" />
          {t.landing.how.map(([title, text], i) => {
            const Icon = [Wand2, QrCode, Zap][i];
            return (
              <Reveal key={title} delay={i * 0.12}>
                <div className="relative h-full rounded-3xl border border-line bg-card p-7 shadow-soft">
                  <span className="relative z-10 grid size-14 place-items-center rounded-2xl bg-red text-white shadow-lift">
                    <Icon className="size-6" />
                  </span>
                  <p className="mt-6 font-display text-sm font-bold text-ink-3">0{i + 1}</p>
                  <h3 className="mt-1 font-display text-xl font-bold">{title}</h3>
                  <p className="mt-3 leading-relaxed text-ink-2">{text}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Tipuri de întrebări */}
      <section className="bg-paper-2/70 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <SectionTitle kicker="02" title={t.landing.typesTitle} subtitle={t.landing.typesSubtitle} />
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {types.map((ty, i) => (
              <Reveal key={ty.title} delay={(i % 3) * 0.08}>
                <div className="group h-full rounded-3xl border border-line bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
                  <span className="grid size-11 place-items-center rounded-xl bg-red-soft text-red transition-all duration-300 group-hover:rotate-6 group-hover:bg-red group-hover:text-white">
                    <ty.icon className="size-5" />
                  </span>
                  <h3 className="mt-5 font-display text-lg font-bold">{ty.title}</h3>
                  <div className="mt-3 rounded-2xl bg-paper px-4 py-3 text-[15px] text-ink-2">
                    <MathText text={ty.sample.replaceAll("**", "")} />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Securitate */}
      <section id="securitate" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24">
        <SectionTitle kicker="03" title={t.landing.securityTitle} subtitle={t.landing.securitySubtitle} />
        <Reveal className="mt-14">
          <SecurityDemo />
        </Reveal>
      </section>

      {/* AI */}
      <section id="ai" className="relative scroll-mt-20 overflow-hidden bg-ink py-24 text-paper">
        <Ornament motif="star" className="pointer-events-none absolute -left-24 top-10 w-80 opacity-10" />
        <Ornament motif="star" className="pointer-events-none absolute -right-24 bottom-10 w-80 opacity-10" />
        <div className="relative mx-auto max-w-6xl px-4">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-sun">04</p>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl">{t.landing.aiTitle}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-paper/75">{t.landing.aiSubtitle}</p>
          </Reveal>
          <Reveal className="mt-14 text-ink">
            <TrapDemo />
          </Reveal>
          <Reveal className="mt-16">
            <h3 className="text-center font-display text-2xl font-bold">{t.landing.aiSignalsTitle}</h3>
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {t.landing.aiSignals.map(([title, text], i) => (
              <Reveal key={title} delay={i * 0.08}>
                <div className="h-full rounded-3xl border border-paper/10 bg-paper/5 p-6">
                  <Sparkles className="size-5 text-sun" />
                  <h4 className="mt-4 font-bold">{title}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-paper/70">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-paper/60">{t.landing.aiHonest}</p>
        </div>
      </section>

      {/* Notare */}
      <section className="mx-auto max-w-6xl px-4 py-24">
        <SectionTitle kicker="05" title={t.landing.gradingTitle} subtitle={t.landing.gradingSubtitle} />
        <Reveal className="mx-auto mt-12 max-w-3xl">
          <div className="rounded-3xl border border-line bg-card p-6 shadow-soft">
            <div className="flex h-40 items-end gap-2">
              {GRADE_COLORS.map((c, i) => (
                <div key={c} className="flex flex-1 flex-col items-center gap-2">
                  <div className="w-full origin-bottom rounded-t-xl transition-transform duration-500 hover:scale-y-110" style={{ height: `${24 + i * 12}px`, background: c }} />
                  <span className="font-display text-sm font-bold">{i + 1}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-between text-xs font-semibold text-ink-3">
              <span>0%</span>
              {DEFAULT_THRESHOLDS.filter((_, i) => i % 2 === 1).map((p) => (
                <span key={p}>{p}%</span>
              ))}
              <span>100%</span>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Școli */}
      <section id="scoli" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] bg-red px-6 py-14 text-white sm:px-14">
            <Ornament motif="band" className="absolute -right-10 -top-4 w-72 opacity-25 [&_g]:!stroke-white" />
            <School className="size-10" />
            <h2 className="mt-6 max-w-2xl font-display text-3xl font-bold leading-tight sm:text-4xl">{t.landing.schoolsTitle}</h2>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/85">{t.landing.schoolsText}</p>
          </div>
        </Reveal>
      </section>

      {/* Final */}
      <section className="mx-auto max-w-6xl px-4 pb-24 text-center">
        <Reveal>
          <Ornament motif="star" className="mx-auto w-20" />
          <h2 className="mx-auto mt-8 max-w-2xl font-display text-3xl font-bold leading-tight sm:text-5xl">{t.landing.finalTitle}</h2>
          <Link href={home ?? "/inregistrare"} className={btn("red", "lg", "mt-8")}>
            {home ? t.nav.myTests : t.landing.finalCta}
          </Link>
        </Reveal>
      </section>

      <footer className="border-t border-line">
        <div className="stitch-line" />
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-ink-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <span>© {new Date().getFullYear()} {SITE.name}</span>
          </div>
          <div className="sm:text-right">
            <p className="font-semibold text-ink-2">{t.landing.footer}</p>
            <p className="mt-1">{t.landing.footerPrivacy}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
