"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CameraOff, CopyX, DoorOpen, ShieldAlert } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/components/ui";

type Rules = { leave: boolean; screenshots: boolean; copy: boolean; watermark: boolean };

export function SecurityDemo() {
  const { t } = useI18n();
  const [rules, setRules] = useState<Rules>({ leave: false, screenshots: false, copy: false, watermark: true });
  const toggle = (k: keyof Rules) => setRules((r) => ({ ...r, [k]: !r[k] }));

  const statuses = [
    !rules.leave
      ? { icon: ShieldAlert, text: t.landing.phoneLocked, tone: "bg-red text-white" }
      : { icon: DoorOpen, text: t.landing.phoneFree, tone: "bg-green text-white" },
    !rules.screenshots ? { icon: CameraOff, text: t.landing.phoneNoShot, tone: "bg-night text-night-ink" } : null,
    !rules.copy ? { icon: CopyX, text: t.landing.phoneNoCopy, tone: "bg-sun text-[#1b1414]" } : null,
  ].filter((s): s is NonNullable<typeof s> => !!s);

  return (
    <div className="grid items-center gap-10 lg:grid-cols-2">
      <div className="space-y-3">
        {(Object.keys(rules) as (keyof Rules)[]).map((k) => (
          <button
            key={k}
            type="button"
            role="switch"
            aria-checked={rules[k]}
            onClick={() => toggle(k)}
            className="flex w-full items-center justify-between gap-4 rounded-2xl border border-line bg-card px-5 py-4 text-left font-semibold shadow-soft transition-all hover:-translate-y-0.5"
          >
            {t.landing.toggles[k]}
            <span className={cn("relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors", rules[k] ? "bg-green" : "bg-ink/15")}>
              <motion.span layout transition={{ type: "spring", stiffness: 500, damping: 30 }} className={cn("inline-block size-5 rounded-full bg-white shadow", rules[k] ? "ml-6" : "ml-1")} />
            </span>
          </button>
        ))}
        <p className="pt-2 text-sm leading-relaxed text-ink-3">{t.landing.securityNote}</p>
      </div>

      <div className="relative mx-auto w-[260px]">
        <div className="relative overflow-hidden rounded-[2.4rem] border-[10px] border-night bg-paper shadow-lift">
          <div className={cn("space-y-3 p-5 pt-10 transition-all", !rules.copy && "select-none")}>
            <div className="h-3 w-24 rounded-full bg-ink/15" />
            <div className="h-24 rounded-2xl border border-line bg-card p-3">
              <div className="h-2.5 w-full rounded-full bg-ink/10" />
              <div className="mt-2 h-2.5 w-4/5 rounded-full bg-ink/10" />
              <div className="mt-2 h-2.5 w-3/5 rounded-full bg-ink/10" />
            </div>
            {[0, 1, 2].map((i) => (
              <div key={i} className={cn("h-10 rounded-xl border-2", i === 1 ? "border-red bg-red-soft" : "border-line")} />
            ))}
          </div>
          <AnimatePresence>
            {rules.watermark ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                aria-hidden
                className="pointer-events-none absolute inset-0 grid -rotate-[24deg] grid-cols-2 content-center gap-x-4 gap-y-10 text-[11px] font-bold text-ink/15"
              >
                {Array.from({ length: 10 }).map((_, i) => (
                  <span key={i} className="whitespace-nowrap">
                    Ana Rusu · 8A
                  </span>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        <div className="absolute -right-6 top-6 space-y-2 sm:-right-24">
          <AnimatePresence mode="popLayout">
            {statuses.map((s) => (
              <motion.div
                key={s.text}
                layout
                initial={{ opacity: 0, x: 20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                className={cn("flex max-w-[13rem] items-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold shadow-lift", s.tone)}
              >
                <s.icon className="size-4 shrink-0" /> {s.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
