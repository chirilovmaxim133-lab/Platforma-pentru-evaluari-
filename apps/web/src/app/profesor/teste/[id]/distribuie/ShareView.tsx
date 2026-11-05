"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, BarChart3, Check, Copy, Lock, Maximize2, Pencil, RotateCcw, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/fmt";
import { Ornament } from "@/components/Ornament";
import { Badge, Button, btn, Card } from "@/components/ui";
import { closeTestAction, publishTestAction, reopenTestAction } from "../../../actions";

type Counts = { joined: number; inProgress: number; submitted: number };

function useLiveCounts(testId: string, initial: Counts, active: boolean) {
  const [counts, setCounts] = useState(initial);
  useEffect(() => {
    if (!active) return;
    let stop = false;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/tests/${testId}/live`, { cache: "no-store" });
        if (res.ok && !stop) setCounts(await res.json());
      } catch {}
    };
    const h = setInterval(tick, 4000);
    return () => {
      stop = true;
      clearInterval(h);
    };
  }, [testId, active]);
  return counts;
}

function Counter({ n, label, tone }: { n: number; label: string; tone: string }) {
  return (
    <div className="text-center">
      <motion.div key={n} initial={{ scale: 1.3, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} className={`font-display text-4xl font-bold tabular-nums ${tone}`}>
        {n}
      </motion.div>
      <div className="mt-1 text-sm font-semibold text-ink-3">{label}</div>
    </div>
  );
}

export function ShareView({
  testId,
  title,
  status,
  code,
  url,
  host,
  qrSvg,
  initialCounts,
}: {
  testId: string;
  title: string;
  status: "draft" | "published" | "closed";
  code: string | null;
  url: string | null;
  host: string;
  qrSvg: string | null;
  initialCounts: Counts;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [projector, setProjector] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const counts = useLiveCounts(testId, initialCounts, status === "published");
  const pretty = code ? `${code.slice(0, 3)} ${code.slice(3)}` : "";

  const counters = (
    <div className="grid grid-cols-3 gap-4">
      <Counter n={counts.joined} label={t.share.joined} tone="text-ink" />
      <Counter n={counts.inProgress} label={t.share.inProgress} tone="text-blue" />
      <Counter n={counts.submitted} label={t.share.submitted} tone="text-green" />
    </div>
  );

  if (status === "draft" || !qrSvg || !url) {
    return (
      <Card className="mx-auto max-w-lg p-8 text-center">
        <Ornament motif="star" className="mx-auto w-20" />
        <p className="mt-6 text-ink-2">{t.share.draft}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href={`/profesor/teste/${testId}`} className={btn("outline")}>
            <Pencil className="size-4" /> {t.common.edit}
          </Link>
          <Button
            variant="red"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await publishTestAction(testId);
                if (res.ok) router.refresh();
                else router.push(`/profesor/teste/${testId}`);
              })
            }
          >
            {t.share.publishNow}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/profesor/teste/${testId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-ink-3 hover:text-ink">
          <ArrowLeft className="size-4" /> {title || t.teacher.untitled}
        </Link>
        <Link href={`/profesor/teste/${testId}/rezultate`} className={btn("outline", "sm")}>
          <BarChart3 className="size-4" /> {t.share.goResults}
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="relative overflow-hidden p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-2xl font-bold">{t.share.title}</h1>
            {status === "closed" ? <Badge>{t.teacher.status.closed}</Badge> : <Badge tone="green">{t.teacher.status.published}</Badge>}
          </div>
          <div className={`mx-auto mt-6 aspect-square w-full max-w-80 rounded-3xl bg-white p-4 shadow-lift ${status === "closed" ? "opacity-30 grayscale" : ""}`}>
            <div className="size-full [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          </div>
          <p className="mt-6 text-center font-display text-5xl font-bold tracking-[0.2em]">{pretty}</p>
          <p className="mt-2 text-center text-sm text-ink-3">{fmt(t.share.orCode, { url: host })}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <Check className="size-4 text-green" /> : <Copy className="size-4" />} {copied ? t.common.copied : t.share.copyLink}
            </Button>
            <Button onClick={() => setProjector(true)} disabled={status === "closed"}>
              <Maximize2 className="size-4" /> {t.share.projector}
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-2 text-sm font-bold text-ink-3">
              <span className="relative flex size-2.5">
                {status === "published" ? <span className="pulse-ring absolute inline-flex size-full rounded-full bg-green" /> : null}
                <span className="relative inline-flex size-2.5 rounded-full bg-green" />
              </span>
              {t.share.live}
            </div>
            {counters}
          </Card>
          <Card className="p-6">
            {status === "closed" ? (
              <>
                <p className="flex items-center gap-2 text-ink-2">
                  <Lock className="size-4" /> {t.share.closed}
                </p>
                <Button variant="outline" className="mt-4" disabled={pending} onClick={() => start(async () => { await reopenTestAction(testId); router.refresh(); })}>
                  <RotateCcw className="size-4" /> {t.share.reopen}
                </Button>
              </>
            ) : (
              <Button
                variant="danger"
                disabled={pending}
                onClick={() => {
                  if (!confirm(t.share.closeConfirm)) return;
                  start(async () => {
                    await closeTestAction(testId);
                    router.refresh();
                  });
                }}
              >
                <Lock className="size-4" /> {t.share.close}
              </Button>
            )}
          </Card>
        </div>
      </div>

      <AnimatePresence>
        {projector ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-paper p-6 linen"
          >
            <button onClick={() => setProjector(false)} className="absolute right-6 top-6 grid size-12 place-items-center rounded-full bg-ink text-paper" aria-label={t.share.exitProjector}>
              <X className="size-6" />
            </button>
            <h2 className="max-w-4xl text-center font-display text-3xl font-bold sm:text-5xl">{title}</h2>
            <motion.div initial={{ scale: 0.85 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 160, damping: 16 }} className="aspect-square w-[min(60vh,80vw)] rounded-[2rem] bg-white p-6 shadow-lift">
              <div className="size-full [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            </motion.div>
            <div className="text-center">
              <p className="font-display text-6xl font-bold tracking-[0.25em] sm:text-8xl">{pretty}</p>
              <p className="mt-3 text-lg text-ink-2">{fmt(t.share.orCode, { url: host })}</p>
            </div>
            <div className="w-full max-w-xl">{counters}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
