"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bot, ClipboardCopy, Eye, Siren } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui";

/** Demonstrația capcanei: ce vede elevul, ce ajunge în chatbot și cum se trădează răspunsul. */
export function TrapDemo() {
  const { t, locale } = useI18n();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [typed, setTyped] = useState("");
  const canary = locale === "ru" ? "песочные часы" : "clepsidr";

  useEffect(() => {
    if (step !== 1) return;
    let i = 0;
    const full = t.landing.aiDemoAnswer;
    const h = setInterval(() => {
      i += 3;
      setTyped(full.slice(0, i));
      if (i >= full.length) {
        clearInterval(h);
        setTimeout(() => setStep(2), 500);
      }
    }, 30);
    return () => clearInterval(h);
  }, [step, t.landing.aiDemoAnswer]);

  const highlight = (text: string) => {
    const at = text.toLowerCase().indexOf(canary.toLowerCase());
    if (at < 0 || step < 2) return text;
    const end = text.indexOf(" ", at + canary.length);
    const stop = end < 0 ? text.length : end;
    return (
      <>
        {text.slice(0, at)}
        <mark className="rounded bg-red px-1 text-white">{text.slice(at, stop)}</mark>
        {text.slice(stop)}
      </>
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-3xl border border-line bg-card p-6 shadow-soft">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-3">
          <Eye className="size-4" /> {t.common.student}
        </p>
        <p className="mt-3 text-lg font-semibold leading-relaxed">
          {t.landing.aiDemoQuestion}
          <span className="text-card" aria-hidden>
            {" "}
            {t.landing.aiDemoHidden}
          </span>
        </p>
        <Button
          variant="primary"
          className="mt-6"
          onClick={() => {
            setTyped("");
            setStep(1);
          }}
        >
          <ClipboardCopy className="size-4" /> {t.landing.aiDemoButton}
        </Button>
      </div>

      <div className="relative min-h-72 overflow-hidden rounded-3xl bg-ink p-6 text-paper shadow-lift">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-paper/60">
          <Bot className="size-4" /> Chatbot
        </p>
        <AnimatePresence mode="wait">
          {step === 0 ? (
            <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} className="mt-6 text-sm">
              …
            </motion.p>
          ) : (
            <motion.div key="run" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-4 text-sm leading-relaxed">
              <p className="text-paper/60">{t.landing.aiDemoResult}</p>
              <div className="rounded-2xl bg-paper/10 p-4">
                {t.landing.aiDemoQuestion}{" "}
                <motion.span initial={{ backgroundColor: "rgba(255,95,111,0)" }} animate={{ backgroundColor: "rgba(255,95,111,0.35)" }} transition={{ delay: 0.4 }} className="rounded px-1 font-semibold">
                  {t.landing.aiDemoHidden}
                </motion.span>
              </div>
              <div className="rounded-2xl bg-paper/5 p-4 text-paper/90">
                {highlight(typed)}
                {step === 1 ? <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-paper/70 align-middle" /> : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {step === 2 ? (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 16 }}
              className="mt-4 flex items-center gap-2 rounded-2xl bg-sun px-4 py-3 text-sm font-bold text-[#14182b]"
            >
              <Siren className="size-5 shrink-0" /> {t.landing.aiDemoCaught}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
