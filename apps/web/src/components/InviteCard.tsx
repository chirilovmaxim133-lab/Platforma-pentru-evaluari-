"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, Maximize2, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { Button, Card } from "./ui";

/** Cod QR + cod scurt + link, cu mod proiector pentru tablă. */
export function InviteCard({ title, heading, code, url, hint, qrSvg }: { title: string; heading: string; code: string; url: string; hint: string; qrSvg: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [projector, setProjector] = useState(false);
  const pretty = `${code.slice(0, 3)} ${code.slice(3)}`;
  return (
    <Card className="p-6">
      <p className="font-display text-lg font-bold">{heading}</p>
      <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row">
        <div className="aspect-square w-40 shrink-0 rounded-2xl bg-white p-2.5 shadow-soft">
          <div className="size-full [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        </div>
        <div className="min-w-0 text-center sm:text-left">
          <p className="font-display text-4xl font-bold tracking-[0.18em]">{pretty}</p>
          <p className="mt-1 text-sm text-ink-3">{hint}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <Check className="size-4 text-green" /> : <Copy className="size-4" />} {copied ? t.common.copied : t.share.copyLink || t.common.copy}
            </Button>
            <Button size="sm" onClick={() => setProjector(true)}>
              <Maximize2 className="size-4" /> {t.share.projector || t.common.close}
            </Button>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {projector ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="linen fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 p-6">
            <button onClick={() => setProjector(false)} className="absolute right-6 top-6 grid size-12 place-items-center rounded-full bg-night text-night-ink" aria-label={t.common.close}>
              <X className="size-6" />
            </button>
            <h2 className="max-w-4xl text-center font-display text-3xl font-bold sm:text-5xl">{title}</h2>
            <motion.div initial={{ scale: 0.85 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 160, damping: 16 }} className="aspect-square w-[min(58vh,80vw)] rounded-[2rem] bg-white p-6 shadow-lift">
              <div className="size-full [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            </motion.div>
            <p className="font-display text-6xl font-bold tracking-[0.25em] sm:text-8xl">{pretty}</p>
            <p className="text-lg text-ink-2">{hint}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Card>
  );
}
