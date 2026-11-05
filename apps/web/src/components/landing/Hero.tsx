"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowRight, BadgeCheck, CameraOff, FlaskConical, LogOut, QrCode, Timer } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { btn } from "@/components/ui";
import { AnimatedOrnament } from "./AnimatedOrnament";

const FLOATS = [
  { key: "floatScreenshot", icon: CameraOff, tone: "bg-ink text-paper", pos: "left-[-1.5rem] top-[4%] sm:left-[-5.5rem]" },
  { key: "floatLeave", icon: LogOut, tone: "bg-red text-white", pos: "right-[-1rem] top-[38%] sm:right-[-5rem]" },
  { key: "floatGrade", icon: BadgeCheck, tone: "bg-green text-white", pos: "left-[-1rem] bottom-[3%] sm:left-[-6rem]" },
  { key: "floatTrap", icon: FlaskConical, tone: "bg-sun text-[#14182b]", pos: "right-[-0.5rem] bottom-[8%] sm:right-[-4rem]" },
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
    <div className="relative mx-auto w-[270px] rounded-[2.6rem] border-[10px] border-ink bg-card shadow-lift sm:w-[300px]">
      <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-ink" />
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
                  selected === i ? "border-blue bg-blue-soft" : "border-line"
                }`}
              >
                <span className={`grid size-5 place-items-center rounded-full text-[10px] font-bold ${selected === i ? "bg-blue text-white" : "bg-paper ring-1 ring-line"}`}>
                  {String.fromCharCode(65 + i)}
                </span>
                {o}
              </motion.div>
            ))}
          </div>
        </div>
        <div className="mx-4 mt-3 grid grid-cols-2 gap-2">
          <div className="h-9 rounded-xl border border-line" />
          <div className="h-9 rounded-xl bg-ink" />
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
  const phoneY = useTransform(scrollY, [0, 600], [0, -60]);
  const ornamentRotate = useTransform(scrollY, [0, 800], [0, 45]);

  useEffect(() => {
    if (reduce) return;
    const h = setInterval(() => setActive((a) => (a + 1) % FLOATS.length), 2200);
    return () => clearInterval(h);
  }, [reduce]);

  const words = t.landing.titleB.split(" ");

  return (
    <section className="relative overflow-hidden">
      <motion.div style={{ rotate: ornamentRotate }} className="pointer-events-none absolute -right-40 -top-40 hidden w-[42rem] opacity-[0.07] lg:block">
        <AnimatedOrnament motif="star" className="w-full" />
      </motion.div>

      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-10 lg:grid-cols-[1.15fr_1fr] lg:pt-16">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-bold text-ink-2 shadow-soft"
          >
            <span className="size-2 rounded-full bg-green" /> {t.landing.badge}
          </motion.span>
          <h1 className="mt-6 font-display text-[2.6rem] font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-[4.2rem]">
            <motion.span className="block" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              {t.landing.titleA}
            </motion.span>
            <span className="block text-red">
              {words.map((w, i) => (
                <motion.span
                  key={i}
                  className="inline-block"
                  initial={reduce ? false : { opacity: 0, y: 30, rotate: 4 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  transition={{ delay: 0.25 + i * 0.09, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  {w}
                </motion.span>
              )).flatMap((el, i) => (i ? [" ", el] : [el]))}
            </span>
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2"
          >
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
          <motion.div
            className="absolute inset-0 -z-10 m-auto size-[340px] rounded-full bg-sun/30 blur-3xl"
            animate={reduce ? {} : { scale: [1, 1.08, 1] }}
            transition={{ duration: 6, repeat: Infinity }}
          />
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
