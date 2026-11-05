import Link from "next/link";
import {
  AlignLeft,
  BadgeCheck,
  CircleDot,
  Eye,
  Hash,
  ListChecks,
  MessageCircleQuestion,
  QrCode,
  School,
  ScrollText,
  Sparkles,
  ToggleLeft,
  Type,
  Users,
  Wand2,
  Zap,
} from "lucide-react";
import { getCurrentUser, homeFor } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n";
import { DEFAULT_THRESHOLDS } from "@/lib/tests/presets";
import { SITE } from "@/config/site";
import { GradeScaleBar } from "@/components/GradeScale";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { Logo } from "@/components/Logo";
import { MathText } from "@/components/MathText";
import { EmbroideryBand, Ornament, type MotifName } from "@/components/Ornament";
import { btn } from "@/components/ui";
import { AnimatedOrnament } from "@/components/landing/AnimatedOrnament";
import { ClassesDemo } from "@/components/landing/ClassesDemo";
import { Hero } from "@/components/landing/Hero";
import { Reveal } from "@/components/landing/Reveal";
import { SecurityDemo } from "@/components/landing/SecurityDemo";

function SectionTitle({ kicker, title, subtitle, dark }: { kicker?: string; title: string; subtitle?: string; dark?: boolean }) {
  return (
    <Reveal className="mx-auto max-w-3xl text-center">
      {kicker ? (
        <p className={`inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] ${dark ? "text-sun" : "text-red"}`}>
          <span className="size-1.5 rotate-45 bg-current" /> {kicker} <span className="size-1.5 rotate-45 bg-current" />
        </p>
      ) : null}
      <h2 className="mt-3 text-balance font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl">{title}</h2>
      {subtitle ? <p className={`mx-auto mt-4 max-w-2xl text-lg leading-relaxed ${dark ? "text-night-ink/75" : "text-ink-2"}`}>{subtitle}</p> : null}
    </Reveal>
  );
}

const TRADITION_MOTIFS: MotifName[] = ["tree", "star", "rhombus", "wheat"];

export default async function Landing() {
  const [{ t }, user] = await Promise.all([getDict(), getCurrentUser()]);
  const home = user ? homeFor(user.role) : null;

  const types = [
    { icon: CircleDot, title: t.qtypes.single, sample: "$2^{10} = $ ?   A) 512   B) 1024   C) 2048" },
    { icon: ListChecks, title: t.qtypes.multiple, sample: "Chișinău · Bălți · Cahul · Soroca" },
    { icon: ToggleLeft, title: t.qtypes.truefalse, sample: "$\\sqrt{49} = 7$ ✓" },
    { icon: Type, title: t.qtypes.short, sample: "Ștefan cel Mare = ștefan cel mare = Stefan cel Mare" },
    { icon: Hash, title: t.qtypes.number, sample: "$\\pi \\approx 3{,}14 \\pm 0{,}01$" },
    { icon: AlignLeft, title: t.qtypes.long, sample: "„Luceafărul” — 150–250" },
  ];
  const aiIcons = [ScrollText, Eye, MessageCircleQuestion, Users];
  const classIcons = [QrCode, BadgeCheck, Users];

  return (
    <div>
      <header className="sticky top-0 z-40 bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm font-semibold text-ink-2 md:flex">
            <a href="#cum" className="hover:text-ink">{t.nav.how}</a>
            <a href="#traditie" className="hover:text-ink">{t.landing.traditionKicker}</a>
            <a href="#securitate" className="hover:text-ink">{t.nav.security}</a>
            <a href="#clase" className="hover:text-ink">{t.nav.classes}</a>
            <a href="#scoli" className="hover:text-ink">{t.nav.schools}</a>
          </nav>
          <div className="flex items-center gap-2">
            <LocaleSwitch />
            {home ? (
              <Link href={home} className={btn("primary", "sm")}>{t.nav.myTests}</Link>
            ) : (
              <>
                <span className="hidden sm:inline">
                  <Link href="/autentificare" className={btn("ghost", "sm")}>{t.nav.login}</Link>
                </span>
                <Link href="/inregistrare" className={btn("primary", "sm")}>{t.nav.register}</Link>
              </>
            )}
          </div>
        </div>
        <EmbroideryBand height={16} id="hdr" />
      </header>

      <Hero loggedInHref={home} />

      {/* Cifre */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {t.landing.stats.map(([n, label], i) => (
            <Reveal key={label} delay={i * 0.08}>
              <div className="relative h-full overflow-hidden rounded-3xl border border-line bg-card px-5 py-6 shadow-soft">
                <Ornament motif="small" className="absolute right-3 top-3 size-5 opacity-60" />
                <div className="font-sans text-3xl font-extrabold tracking-tight">{n}</div>
                <div className="mt-1 text-sm font-semibold text-ink-3">{label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Brâul cu discipline */}
      <section className="mt-16 overflow-hidden bg-red py-4 text-white" aria-hidden>
        <div className="marquee flex w-max items-center gap-8 whitespace-nowrap">
          {[...t.landing.subjects, ...t.landing.subjects].map((s, i) => (
            <span key={i} className="flex items-center gap-8 font-display text-lg font-bold">
              {s}
              <Ornament motif="small" tone="mono" className="size-5 text-white/80" />
            </span>
          ))}
        </div>
      </section>

      {/* Cum funcționează */}
      <section id="cum" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24">
        <SectionTitle kicker="01" title={t.landing.howTitle} />
        <div className="relative mt-14 grid gap-5 md:grid-cols-3">
          <div className="stitch-line stitch-run absolute left-[16%] right-[16%] top-11 hidden md:block" />
          {t.landing.how.map(([title, text], i) => {
            const Icon = [Wand2, QrCode, Zap][i];
            return (
              <Reveal key={title} delay={i * 0.12}>
                <div className="relative h-full rounded-3xl border border-line bg-card p-7 shadow-soft">
                  <span className="relative z-10 grid size-14 place-items-center rounded-2xl bg-night text-night-ink shadow-lift">
                    <Icon className="size-6" />
                  </span>
                  <p className="mt-6 font-display text-sm font-bold text-red">0{i + 1}</p>
                  <h3 className="mt-1 font-display text-xl font-bold">{title}</h3>
                  <p className="mt-3 leading-relaxed text-ink-2">{text}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Semnele de pe ie */}
      <section id="traditie" className="relative scroll-mt-24 bg-night text-night-ink">
        <EmbroideryBand tone="dark" height={36} id="trad-top" />
        <div className="mx-auto max-w-6xl px-4 py-24">
          <SectionTitle kicker={t.landing.traditionKicker} title={t.landing.traditionTitle} subtitle={t.landing.traditionSubtitle} dark />
          <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {t.landing.traditions.map(([motif, meaning, feature, text], i) => (
              <Reveal key={motif} delay={i * 0.1}>
                <article className="group flex h-full flex-col rounded-3xl border border-night-ink/10 bg-night-2 p-6 transition-transform duration-300 hover:-translate-y-1">
                  <div className="grid h-36 place-items-center">
                    <AnimatedOrnament motif={TRADITION_MOTIFS[i]} tone="dark" className="h-full max-w-[9rem] transition-transform duration-700 group-hover:scale-105" step={0.04} />
                  </div>
                  <h3 className="mt-5 font-display text-lg font-bold">{motif}</h3>
                  <p className="mt-1 text-sm italic text-night-ink/65">{meaning}</p>
                  <div className="my-4 h-px bg-night-ink/10" />
                  <p className="text-sm font-bold uppercase tracking-wide text-sun">{feature}</p>
                  <p className="mt-2 text-sm leading-relaxed text-night-ink/80">{text}</p>
                </article>
              </Reveal>
            ))}
          </div>
          <p className="mx-auto mt-10 max-w-2xl text-center text-xs text-night-ink/50">{t.landing.traditionNote}</p>
        </div>
        <EmbroideryBand tone="dark" height={36} id="trad-bottom" />
      </section>

      {/* Tipuri de întrebări */}
      <section className="mx-auto max-w-6xl px-4 py-24">
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
                  <MathText text={ty.sample} />
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Securitate */}
      <section id="securitate" className="scroll-mt-24 bg-paper-2/70 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <SectionTitle kicker="03" title={t.landing.securityTitle} subtitle={t.landing.securitySubtitle} />
          <Reveal className="mt-14">
            <SecurityDemo />
          </Reveal>
        </div>
      </section>

      {/* Clase și progres */}
      <section id="clase" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          <Reveal>
            <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-red">
              <span className="size-1.5 rotate-45 bg-current" /> {t.landing.classesKicker}
            </p>
            <h2 className="mt-3 text-balance font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl">{t.landing.classesTitle}</h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-2">{t.landing.classesSubtitle}</p>
            <ul className="mt-8 space-y-4">
              {t.landing.classesPoints.map(([title, text], i) => {
                const Icon = classIcons[i];
                return (
                  <li key={title} className="flex gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-red-soft text-red">
                      <Icon className="size-5" />
                    </span>
                    <span>
                      <span className="block font-bold">{title}</span>
                      <span className="text-ink-2">{text}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </Reveal>
          <Reveal delay={0.15}>
            <ClassesDemo />
          </Reveal>
        </div>
      </section>

      {/* AI */}
      <section className="relative overflow-hidden bg-night py-24 text-night-ink">
        <Ornament motif="rhombus" tone="dark" className="pointer-events-none absolute -left-16 top-12 w-64 opacity-[0.12]" />
        <Ornament motif="rhombus" tone="dark" className="pointer-events-none absolute -right-16 bottom-12 w-64 opacity-[0.12]" />
        <div className="relative mx-auto max-w-6xl px-4">
          <SectionTitle kicker="04" title={t.landing.aiTitle} subtitle={t.landing.aiSubtitle} dark />
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {t.landing.aiPoints.map(([title, text], i) => {
              const Icon = aiIcons[i];
              return (
                <Reveal key={title} delay={i * 0.08}>
                  <div className="h-full rounded-3xl border border-night-ink/10 bg-night-2 p-6">
                    <Icon className="size-5 text-sun" />
                    <h3 className="mt-4 font-bold">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-night-ink/70">{text}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
          <p className="mx-auto mt-10 flex max-w-2xl items-center justify-center gap-2 text-center text-sm text-night-ink/60">
            <Sparkles className="size-4 shrink-0 text-sun" /> {t.landing.aiHonest}
          </p>
        </div>
      </section>

      {/* Notare */}
      <section className="mx-auto max-w-6xl px-4 py-24">
        <SectionTitle kicker="05" title={t.landing.gradingTitle} subtitle={t.landing.gradingSubtitle} />
        <Reveal className="mx-auto mt-12 max-w-3xl">
          <div className="rounded-3xl border border-line bg-card p-6 shadow-soft sm:p-8">
            <GradeScaleBar thresholds={DEFAULT_THRESHOLDS} ariaLabel={t.settings.thresholds || t.landing.gradingTitle} />
            <div className="mt-3 flex justify-between text-xs font-semibold tabular-nums text-ink-3">
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
      <section id="scoli" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] bg-red px-6 py-14 text-white sm:px-14">
            <Ornament motif="star" tone="mono" className="absolute -right-10 -top-10 w-72 text-white/15" />
            <School className="size-10" />
            <h2 className="mt-6 max-w-2xl font-display text-3xl font-bold leading-tight sm:text-4xl">{t.landing.schoolsTitle}</h2>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/85">{t.landing.schoolsText}</p>
          </div>
        </Reveal>
      </section>

      {/* Final */}
      <section className="mx-auto max-w-6xl px-4 pb-24 text-center">
        <Reveal>
          <AnimatedOrnament motif="star" className="mx-auto w-24" />
          <h2 className="mx-auto mt-8 max-w-2xl font-display text-3xl font-bold leading-tight sm:text-5xl">{t.landing.finalTitle}</h2>
          <Link href={home ?? "/inregistrare"} className={btn("red", "lg", "mt-8")}>
            {home ? t.nav.myTests : t.landing.finalCta}
          </Link>
        </Reveal>
      </section>

      <footer className="bg-night text-night-ink">
        <EmbroideryBand tone="dark" height={36} id="ftr" />
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-night-ink/65 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Logo tone="dark" />
            <span>© {new Date().getFullYear()} {SITE.name}</span>
          </div>
          <div className="sm:text-right">
            <p className="font-semibold text-night-ink">{t.landing.footer}</p>
            <p className="mt-1">{t.landing.footerPrivacy}</p>
            <p className="mt-1 text-night-ink/45">{t.landing.footerTradition}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
