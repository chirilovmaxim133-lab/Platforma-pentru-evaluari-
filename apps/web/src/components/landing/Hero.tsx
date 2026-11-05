"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowRight, BadgeCheck, CameraOff, LogOut, QrCode, Timer, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { btn } from "@/components/ui";
import { AnimatedOrnament } from "./AnimatedOrnament";

const FLOATS = [
  { key: "floatScreenshot", icon: CameraOff, tone: "bg-night text-night-ink", pos: "left-[-1rem] top-[2%] sm:left-[-6rem]" },
  { key: "floatLeave", icon: LogOut, tone: "bg-red text-white", pos: "right-[-1rem] top-[36%] sm:right-[-5.5rem]" },
  { key: "floatGrade", icon: BadgeCheck, tone: "bg-green text-white", pos: "left-[-1rem] bottom-[6%] sm:left-[-6.5rem]" },
  { key: "floatClass", icon: Users, tone: "bg-sun text-[#1b1414]", pos: "right-[-0.5rem] bottom-[-2%] sm:right-[-4.5rem]" },
] as const;

function Phone() {
  const { t } = useI18n();
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => {
    const h = setInterval(() => setSelected((s) => (s === 1 ? null : 1)), 2600);
    return () => clearInterval(h);
  }, []);
  const options = ["6π cm²", "9π cm²", "3π cm²", "12π cm²"];
  return (
    <div className="relative mx-auto w-[260px] rounded-[2.6rem] border-[10px] border-night bg-card shadow-lift sm:w-[290px]">
      <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-night" />
      <div className="overflow-hidden rounded-[2rem] bg-paper pb-6 pt-9">
        <div className="flex items-center justify-between px-5 text-[11px] font-bold">
          <span className="truncate">Geometrie · cl. 8</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-2 py-0.5 tabular-nums">
            <Timer className="size-3" /> 12:41
          </span>
        </div>
        <div className="mx-5 mt-3 h-1 rounded-full bg-line">
          <motion.div className="h-full rounded-full bg-red" initial={{ width: "20%" }} animate={{ width: ["20%", "60%", "20%"] }} transition={{ duration: 8, repeat: Infinity }} />
        </div>
        <div className="mx-4 mt-4 rounded-2xl border border-line bg-card p-4">
          <p className="text-[11px] font-bold text-ink-3">3 / 10</p>
          <p className="mt-1 text-[14px] font-semibold leading-snug">{t.landing.phoneQuestion}</p>
          <div className="mt-3 space-y-2">
            {options.map((o, i) => (
              <motion.div
                key={o}
                animate={selected === i ? { scale: [1, 1.04, 1] } : {}}
                className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-[13px] font-semibold transition-colors ${
                  selected === i ? "border-red bg-red-soft" : "border-line"
                }`}
              >
                <span className={`grid size-5 place-items-center rounded-full text-[10px] font-bold ${selected === i ? "bg-red text-white" : "bg-paper ring-1 ring-line"}`}>
                  {String.fromCharCode(65 + i)}
                </span>
                {o}
              </motion.div>
            ))}
          </div>
        </div>
        <div className="mx-4 mt-3 grid grid-cols-2 gap-2">
          <div className="h-9 rounded-xl border border-line" />
          <div className="h-9 rounded-xl bg-night" />
        </div>
      </div>
    </div>
  );
}

export function Hero({ loggedInHref }: { loggedInHref: string | null }) {
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const { scrollY } = useScroll();
  const phoneY = useTransform(scrollY, [0, 600], [0, -50]);
  const starRotate = useTransform(scrollY, [0, 900], [0, 30]);

  useEffect(() => {
    if (reduce) return;
    const h = setInterval(() => setActive((a) => (a + 1) % FLOATS.length), 2200);
    return () => clearInterval(h);
  }, [reduce]);

  const words = t.landing.titleB.split(" ");

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 pb-20 pt-12 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-bold text-ink-2 shadow-soft"
          >
            <span className="size-2 rotate-45 bg-red" /> {t.landing.badge}
          </motion.span>
          <h1 className="mt-6 font-display text-[2.6rem] font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-[4.1rem]">
            <motion.span className="block" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              {t.landing.titleA}
            </motion.span>
            <span className="block text-red">
              {words
                .map((w, i) => (
                  <motion.span
                    key={i}
                    className="inline-block"
                    initial={reduce ? false : { opacity: 0, y: 30, rotate: 4 }}
                    animate={{ opacity: 1, y: 0, rotate: 0 }}
                    transition={{ delay: 0.25 + i * 0.09, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {w}
                  </motion.span>
                ))
                .flatMap((el, i) => (i ? [" ", el] : [el]))}
            </span>
          </h1>
          <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.8, duration: 0.8 }} className="stitch-line stitch-run mt-6 w-40 origin-left" />
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2">
            {t.landing.subtitle}
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85 }} className="mt-8 flex flex-wrap gap-3">
            <Link href={loggedInHref ?? "/inregistrare"} className={btn("red", "lg", "group")}>
              {loggedInHref ? t.nav.myTests : t.landing.ctaTeacher}
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href={loggedInHref ?? "/autentificare?next=/elev"} className={btn("outline", "lg")}>
              <QrCode className="size-5" /> {t.landing.ctaStudent}
            </Link>
          </motion.div>
        </div>

        <motion.div style={{ y: reduce ? 0 : phoneY }} className="relative mx-auto">
          {/* Medalionul: un cerc de pânză cu tighel roșu, ca un gherghef de brodat. */}
          <div className="absolute left-1/2 top-1/2 -z-10 size-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper-2 sm:size-[460px]">
            <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
              <circle cx="50" cy="50" r="48" fill="none" stroke="var(--red)" strokeWidth="0.6" strokeDasharray="2.2 1.6" />
              <circle cx="50" cy="50" r="45.5" fill="none" stroke="var(--ink)" strokeOpacity="0.25" strokeWidth="0.3" />
            </svg>
          </div>
          <motion.div style={{ rotate: reduce ? 0 : starRotate }} className="absolute -right-24 -top-24 -z-10 w-64 opacity-90 sm:-right-36 sm:-top-28 sm:w-80">
            <AnimatedOrnament motif="star" step={0.04} delay={0.4} />
          </motion.div>
          <motion.div className="absolute -bottom-16 -left-20 -z-10 w-36 opacity-80 sm:-left-28 sm:w-44">
            <AnimatedOrnament motif="tree" step={0.05} delay={0.9} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 40, rotate: -6 }} animate={{ opacity: 1, y: 0, rotate: -3 }} transition={{ delay: 0.3, type: "spring", stiffness: 60, damping: 14 }}>
            <Phone />
          </motion.div>
          {FLOATS.map((f, i) => (
            <AnimatePresence key={f.key}>
              {(reduce || active === i || (active + 2) % FLOATS.length === i) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.7, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 220, damping: 18 }}
                  className={`absolute ${f.pos} z-10 flex max-w-[15rem] items-center gap-2 rounded-2xl px-3.5 py-2.5 text-[13px] font-bold shadow-lift ${f.tone}`}
                >
                  <f.icon className="size-4 shrink-0" /> {t.landing[f.key]}
                </motion.div>
              )}
            </AnimatePresence>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
