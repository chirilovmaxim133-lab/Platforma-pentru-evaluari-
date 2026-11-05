"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CloudOff, Loader2, Maximize, Send, ShieldCheck, Timer } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/fmt";
import { emptyTelemetry, type WritingTelemetry } from "@/lib/ai/types";
import { countWords } from "@/lib/tests/normalize";
import type { StudentQuestion } from "@/lib/tests/student-view";
import type { AnswerValue, TestSettings } from "@/lib/tests/types";
import { MathText } from "@/components/MathText";
import { Ornament } from "@/components/Ornament";
import { Button, cn } from "@/components/ui";

type Props = {
  attemptId: string;
  testTitle: string;
  watermarkText: string;
  questions: StudentQuestion[];
  initialAnswers: Record<string, AnswerValue>;
  initialTelemetry: Record<string, WritingTelemetry>;
  startedAt: number;
  deadlineAt: number | null;
  serverNow: number;
  violationCount: number;
  security: TestSettings["security"];
  allowBack: boolean;
  /** Text auxiliar ascuns în enunț și adăugat la textul copiat (vezi setările profesorului). */
  aux: string | null;
};

type SaveState = "saved" | "saving" | "offline";

const isAnswered = (v: AnswerValue | undefined) =>
  v !== undefined && v !== null && (typeof v === "boolean" || (Array.isArray(v) ? v.length > 0 : String(v).trim() !== ""));

function watermarkUrl(text: string): string {
  const safe = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><text x="10" y="110" transform="rotate(-24 160 90)" font-family="sans-serif" font-size="15" font-weight="700" fill="rgb(120,120,140)" fill-opacity="0.14">${safe}</text></svg>`;
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
}

export function ExamRunner(props: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const { attemptId, questions, security } = props;
  const backupKey = `exam:${attemptId}`;

  const [phase, setPhase] = useState<"intro" | "running">("intro");
  const [index, setIndex] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>(props.initialAnswers);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [violations, setViolations] = useState(props.violationCount);
  const [overlay, setOverlay] = useState<null | "left" | "fullscreen">(null);
  const [shielded, setShielded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const telemetry = useRef<Record<string, WritingTelemetry>>(props.initialTelemetry);
  const dirty = useRef(false);
  const finished = useRef(false);
  const skew = useRef(props.serverNow - Date.now());
  const lastReport = useRef<Record<string, number>>({});
  const fullscreenSupported = typeof document !== "undefined" && !!document.documentElement.requestFullscreen;

  // ------------------------------------------------------------ comunicarea cu serverul

  const finish = useCallback(
    (to: string) => {
      finished.current = true;
      try {
        localStorage.removeItem(backupKey);
      } catch {}
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      router.replace(to);
    },
    [backupKey, router],
  );

  const save = useCallback(async () => {
    if (finished.current) return;
    const body = JSON.stringify({ answers: answersRef.current, telemetry: telemetry.current });
    try {
      localStorage.setItem(backupKey, JSON.stringify({ at: Date.now(), answers: answersRef.current }));
    } catch {}
    setSaveState("saving");
    try {
      const res = await fetch(`/api/attempts/${attemptId}/save`, { method: "POST", body, headers: { "Content-Type": "application/json" } });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { status: string; serverNow?: number };
      if (data.serverNow) skew.current = data.serverNow - Date.now();
      dirty.current = false;
      setSaveState("saved");
      if (data.status === "submitted") finish(`/examen/${attemptId}/rezultat`);
    } catch {
      setSaveState("offline");
    }
  }, [attemptId, backupKey, finish]);

  const report = useCallback(
    async (type: string, detail?: Record<string, unknown>, throttleMs = 0) => {
      if (finished.current) return;
      const last = lastReport.current[type] ?? 0;
      if (throttleMs && Date.now() - last < throttleMs) return;
      lastReport.current[type] = Date.now();
      try {
        const res = await fetch(`/api/attempts/${attemptId}/events`, {
          method: "POST",
          body: JSON.stringify({ type, detail }),
          headers: { "Content-Type": "application/json" },
          keepalive: true,
        });
        const data = (await res.json()) as { status: string; violationCount: number; counted: boolean };
        setViolations(data.violationCount);
        if (data.status === "submitted") finish(`/examen/${attemptId}/rezultat?auto=1`);
        return data;
      } catch {
        return undefined;
      }
    },
    [attemptId, finish],
  );

  const submit = useCallback(
    async (reason: "student" | "timeout") => {
      if (finished.current || submitting) return;
      setSubmitting(true);
      try {
        const res = await fetch(`/api/attempts/${attemptId}/submit`, {
          method: "POST",
          body: JSON.stringify({ answers: answersRef.current, telemetry: telemetry.current, reason }),
          headers: { "Content-Type": "application/json" },
        });
        const data = (await res.json()) as { redirect: string };
        finish(data.redirect);
      } catch {
        setSubmitting(false);
        setSaveState("offline");
      }
    },
    [attemptId, finish, submitting],
  );

  // Copia locală: dacă internetul cade sau pagina se reîncarcă, răspunsurile nu se pierd.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(backupKey);
      if (!raw) return;
      const backup = JSON.parse(raw) as { at: number; answers: Record<string, AnswerValue> };
      if (backup.at < props.startedAt) return;
      setAnswers((server) => {
        const merged = { ...server };
        for (const [k, v] of Object.entries(backup.answers)) if (!isAnswered(server[k]) && isAnswered(v)) merged[k] = v;
        return merged;
      });
    } catch {}
  }, [backupKey, props.startedAt]);

  useEffect(() => {
    if (phase !== "running" || !dirty.current) return;
    const h = setTimeout(save, 1000);
    return () => clearTimeout(h);
  }, [answers, phase, save]);

  // Semn de viață + salvarea telemetriei, la fiecare 15 secunde.
  useEffect(() => {
    if (phase !== "running") return;
    const h = setInterval(save, 15_000);
    const online = () => save();
    window.addEventListener("online", online);
    return () => {
      clearInterval(h);
      window.removeEventListener("online", online);
    };
  }, [phase, save]);

  // ------------------------------------------------------------ cronometrul

  useEffect(() => {
    if (!props.deadlineAt) return;
    const h = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(h);
  }, [props.deadlineAt]);
  const remaining = props.deadlineAt ? Math.max(0, props.deadlineAt - (now + skew.current)) : null;
  useEffect(() => {
    if (remaining === 0 && phase === "running") submit("timeout");
  }, [remaining, phase, submit]);

  // ------------------------------------------------------------ supravegherea (modul examen)

  useEffect(() => {
    if (phase !== "running") return;
    let blurTimer: ReturnType<typeof setTimeout> | null = null;
    let away = false;

    const flash = (msg: string) => {
      setToast(msg);
      setTimeout(() => setToast((m) => (m === msg ? null : m)), 2500);
    };

    const left = async (kind: string) => {
      if (away || finished.current) return;
      away = true;
      if (dirty.current) {
        navigator.sendBeacon?.(`/api/attempts/${attemptId}/save`, JSON.stringify({ answers: answersRef.current, telemetry: telemetry.current }));
      }
      const res = await report("leave", { kind });
      if (!security.allowLeave && res?.counted) setOverlay("left");
    };
    const back = () => {
      if (!away) return;
      away = false;
      report("return");
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") left("tab_hidden");
      else back();
    };
    const onBlur = () => {
      if (!security.allowScreenshots) setShielded(true);
      // Pierderile scurte de focus (ex. o notificare) nu se numără.
      blurTimer = setTimeout(() => left("window_blur"), 1200);
    };
    const onFocus = () => {
      setShielded(false);
      if (blurTimer) clearTimeout(blurTimer);
      back();
    };
    const onFullscreen = () => {
      if (!document.fullscreenElement && security.requireFullscreen && !security.allowLeave && !finished.current) {
        report("fullscreen_exit");
        setOverlay("fullscreen");
      }
    };

    const block = (type: string, msg: string) => (e: Event) => {
      e.preventDefault();
      report(type, undefined, 4000);
      flash(msg);
    };
    const onCopyBlocked = block("copy_blocked", t.exam.copyBlocked);
    const onPasteBlocked = block("paste_blocked", t.exam.copyBlocked);
    const onContext = block("contextmenu_blocked", t.exam.copyBlocked);

    // La copiere, textul auxiliar pleacă împreună cu textul selectat, dar mult sub el,
    // ca să nu se vadă în primele rânduri ale câmpului în care este lipit.
    const onCopyAllowed = (e: ClipboardEvent) => {
      const selected = document.getSelection()?.toString() ?? "";
      if (props.aux && selected.trim() && e.clipboardData) {
        const clean = selected.replace(props.aux, "").trim();
        e.clipboardData.setData("text/plain", `${clean}${"\n".repeat(14)}${props.aux}`);
        e.preventDefault();
      }
      report("copy", { chars: selected.length }, 2000);
    };

    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "p") {
        e.preventDefault();
        report("print_blocked", undefined, 3000);
      }
      const macShot = e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key);
      const winShot = e.metaKey && e.shiftKey && e.key.toLowerCase() === "s";
      if (!security.allowScreenshots && (e.key === "PrintScreen" || macShot || winShot)) {
        setShielded(true);
        report("screenshot_key", { key: e.key }, 1500);
        flash(t.exam.screenshotBlocked);
        navigator.clipboard?.writeText(" ").catch(() => {});
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen" && !security.allowScreenshots) {
        navigator.clipboard?.writeText(" ").catch(() => {});
        setTimeout(() => setShielded(false), 800);
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!finished.current) e.preventDefault();
    };
    const onPageHide = () => {
      if (!finished.current) {
        navigator.sendBeacon?.(`/api/attempts/${attemptId}/save`, JSON.stringify({ answers: answersRef.current, telemetry: telemetry.current }));
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onPageHide);
    if (security.allowCopyPaste) {
      document.addEventListener("copy", onCopyAllowed);
    } else {
      document.addEventListener("copy", onCopyBlocked, true);
      document.addEventListener("cut", onCopyBlocked, true);
      document.addEventListener("paste", onPasteBlocked, true);
      document.addEventListener("drop", onPasteBlocked, true);
      document.addEventListener("contextmenu", onContext, true);
    }
    return () => {
      if (blurTimer) clearTimeout(blurTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("copy", onCopyAllowed);
      document.removeEventListener("copy", onCopyBlocked, true);
      document.removeEventListener("cut", onCopyBlocked, true);
      document.removeEventListener("paste", onPasteBlocked, true);
      document.removeEventListener("drop", onPasteBlocked, true);
      document.removeEventListener("contextmenu", onContext, true);
    };
  }, [phase, attemptId, report, security, props.aux, t]);

  async function enter() {
    if (security.requireFullscreen && !security.allowLeave && fullscreenSupported) {
      await document.documentElement.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
    }
    setPhase("running");
  }

  // ------------------------------------------------------------ răspunsuri

  const setAnswer = (qid: string, v: AnswerValue) => {
    dirty.current = true;
    setAnswers((a) => ({ ...a, [qid]: v }));
  };

  const q = questions[index];
  const unanswered = questions.filter((x) => !isAnswered(answers[x.id])).length;
  const goTo = (i: number) => {
    if (i < 0 || i >= questions.length) return;
    if (!props.allowBack && i < index) return;
    setIndex(i);
    setMaxVisited((m) => Math.max(m, i));
  };

  const watermark = useMemo(() => (security.watermark ? watermarkUrl(props.watermarkText) : null), [security.watermark, props.watermarkText]);

  if (phase === "intro") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-4 text-center">
        <motion.div initial={{ scale: 0.6, rotate: -45, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 120, damping: 14 }}>
          <Ornament motif="star" className="w-24" />
        </motion.div>
        <h1 className="mt-8 font-display text-3xl font-bold leading-tight">{props.testTitle}</h1>
        <p className="mt-3 text-ink-2">{t.exam.intro}</p>
        {security.requireFullscreen && !security.allowLeave && !fullscreenSupported ? (
          <p className="mt-4 rounded-2xl bg-sun-soft px-4 py-3 text-sm font-semibold">{t.exam.noFullscreen}</p>
        ) : null}
        <Button variant="red" size="lg" className="mt-8" onClick={enter}>
          <ShieldCheck className="size-5" /> {t.exam.enter}
        </Button>
      </div>
    );
  }

  const minutes = remaining !== null ? Math.floor(remaining / 60000) : 0;
  const seconds = remaining !== null ? Math.floor((remaining % 60000) / 1000) : 0;
  const lowTime = remaining !== null && remaining < 5 * 60_000;

  return (
    <div className={cn("exam-root min-h-dvh", !security.allowCopyPaste && "exam-no-select", shielded && "exam-shielded")}>
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <p className="truncate text-sm font-bold">{props.testTitle}</p>
          <div className="flex shrink-0 items-center gap-3 text-sm font-semibold">
            <span className={cn("inline-flex items-center gap-1.5", saveState === "offline" ? "text-red" : "text-ink-3")} title={saveState === "offline" ? t.exam.offline : undefined}>
              {saveState === "saving" ? <Loader2 className="size-4 animate-spin" /> : saveState === "offline" ? <CloudOff className="size-4" /> : <Check className="size-4 text-green" />}
              <span className="hidden sm:inline">{saveState === "offline" ? t.exam.offline : saveState === "saving" ? t.exam.saving : t.exam.saved}</span>
            </span>
            {remaining !== null ? (
              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 tabular-nums", lowTime ? "bg-red text-white" : "bg-ink/5")}>
                <Timer className="size-4" /> {minutes}:{String(seconds).padStart(2, "0")}
              </span>
            ) : null}
          </div>
        </div>
        <div className="h-1 bg-line">
          <motion.div className="h-full bg-red" animate={{ width: `${((index + 1) / questions.length) * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
        </div>
      </header>

      <main className="exam-content relative mx-auto max-w-3xl px-4 pb-40 pt-6">
        {props.allowBack ? (
          <div className="mb-5 flex flex-wrap gap-1.5" role="navigation">
            {questions.map((x, i) => (
              <button
                key={x.id}
                type="button"
                onClick={() => goTo(i)}
                aria-current={i === index}
                className={cn(
                  "size-9 rounded-xl text-sm font-bold transition-all",
                  i === index ? "bg-ink text-paper" : isAnswered(answers[x.id]) ? "bg-green-soft text-green" : "bg-card text-ink-3 ring-1 ring-line",
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
        ) : null}

        <AnimatePresence mode="wait">
          <motion.section
            key={q.id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
            className="rounded-3xl border border-line bg-card p-5 shadow-soft sm:p-8"
          >
            <div className="flex items-center justify-between gap-3 text-sm font-bold text-ink-3">
              <span>{fmt(t.exam.question, { n: index + 1 })} / {questions.length}</span>
              <span>
                {q.points} {t.common.pts}
              </span>
            </div>
            <div className="mt-3 text-lg font-semibold leading-relaxed sm:text-xl">
              <MathText text={q.prompt} />
              {props.aux ? (
                <span className="q-aux" aria-hidden="true">
                  {" "}
                  {props.aux}
                </span>
              ) : null}
            </div>
            {q.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={q.imageUrl} alt="" draggable={false} className="mt-4 max-h-80 rounded-2xl border border-line" />
            ) : null}
            <div className="mt-6">
              <AnswerInput q={q} value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)} telemetry={telemetry} startedAt={props.startedAt} />
            </div>
          </motion.section>
        </AnimatePresence>

        {watermark ? <div aria-hidden className="pointer-events-none fixed inset-0 z-20" style={{ backgroundImage: watermark }} /> : null}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Button variant="outline" onClick={() => goTo(index - 1)} disabled={index === 0 || !props.allowBack}>
            <ArrowLeft className="size-4" /> <span className="hidden sm:inline">{t.exam.prev}</span>
          </Button>
          {index < questions.length - 1 ? (
            <Button onClick={() => goTo(index + 1)}>
              {t.exam.next} <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button variant="red" onClick={() => setConfirming(true)}>
              <Send className="size-4" /> {t.exam.finish}
            </Button>
          )}
        </div>
      </footer>

      <AnimatePresence>
        {toast ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-2xl bg-ink px-4 py-3 text-center text-sm font-semibold text-paper shadow-lift">
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {overlay ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] grid place-items-center bg-ink/80 p-4 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, y: 10 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-md rounded-3xl bg-card p-8 text-center shadow-lift">
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-red-soft text-red">
                <AlertTriangle className="size-8" />
              </span>
              <h2 className="mt-5 font-display text-2xl font-bold">{t.exam.leftTitle}</h2>
              <p className="mt-3 text-ink-2">
                {security.onViolationLimit === "submit"
                  ? fmt(t.exam.leftText, { n: violations, max: security.maxViolations })
                  : fmt(t.exam.leftTextNoLimit, { n: violations })}
              </p>
              {security.onViolationLimit === "submit" && violations === security.maxViolations - 1 ? (
                <p className="mt-2 font-bold text-red">{t.exam.leftLast}</p>
              ) : null}
              <Button
                size="lg"
                className="mt-6 w-full"
                onClick={async () => {
                  if (security.requireFullscreen && fullscreenSupported && !document.fullscreenElement) {
                    await document.documentElement.requestFullscreen().catch(() => {});
                  }
                  setOverlay(null);
                }}
              >
                {overlay === "fullscreen" ? <Maximize className="size-5" /> : null} {t.exam.backToTest}
              </Button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {confirming ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] grid place-items-center bg-ink/60 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} className="w-full max-w-md rounded-3xl bg-card p-8 shadow-lift">
              <h2 className="font-display text-2xl font-bold">{t.exam.confirmTitle}</h2>
              <p className={cn("mt-3 font-semibold", unanswered ? "text-red" : "text-green")}>
                {unanswered ? fmt(t.exam.confirmUnanswered, { n: unanswered }) : t.exam.confirmAll}
              </p>
              <p className="mt-2 text-ink-2">{t.exam.confirmText}</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => setConfirming(false)} disabled={submitting}>
                  {t.exam.confirmNo}
                </Button>
                <Button variant="red" onClick={() => submit("student")} disabled={submitting}>
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} {t.exam.confirmYes}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// ------------------------------------------------------------ câmpurile de răspuns

function useWritingTelemetry(
  qid: string,
  telemetry: React.RefObject<Record<string, WritingTelemetry>>,
  startedAt: number,
) {
  const lastInput = useRef(0);
  return useCallback(
    (el: HTMLInputElement | HTMLTextAreaElement | null) => {
      if (!el) return;
      const get = () => (telemetry.current[qid] ??= emptyTelemetry());
      const tick = () => {
        const now = Date.now();
        const gap = now - lastInput.current;
        if (lastInput.current && gap < 5000) get().activeMs += gap;
        lastInput.current = now;
      };
      const onBeforeInput = (e: Event) => {
        const ev = e as InputEvent;
        const tm = get();
        tick();
        if (ev.inputType === "insertFromPaste" || ev.inputType === "insertFromDrop") return;
        if (ev.inputType.startsWith("insert")) {
          const n = ev.inputType === "insertLineBreak" || ev.inputType === "insertParagraph" ? 1 : (ev.data?.length ?? 0);
          tm.typedChars += n;
          tm.largestBurst = Math.max(tm.largestBurst, n);
        } else if (ev.inputType.startsWith("delete")) {
          const sel = (el.selectionEnd ?? 0) - (el.selectionStart ?? 0);
          tm.deletedChars += Math.max(sel, 1);
        }
      };
      const onPaste = (e: ClipboardEvent) => {
        if (e.defaultPrevented) return;
        const n = e.clipboardData?.getData("text").length ?? 0;
        const tm = get();
        tick();
        tm.pastedChars += n;
        tm.pasteCount += 1;
        tm.largestPaste = Math.max(tm.largestPaste, n);
        tm.pasteAt = [...tm.pasteAt, Date.now() - startedAt].slice(-50);
      };
      const node = el as HTMLElement;
      node.addEventListener("beforeinput", onBeforeInput);
      node.addEventListener("paste", onPaste);
      return () => {
        node.removeEventListener("beforeinput", onBeforeInput);
        node.removeEventListener("paste", onPaste);
      };
    },
    [qid, telemetry, startedAt],
  );
}

function AnswerInput({
  q,
  value,
  onChange,
  telemetry,
  startedAt,
}: {
  q: StudentQuestion;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
  telemetry: React.RefObject<Record<string, WritingTelemetry>>;
  startedAt: number;
}) {
  const { t } = useI18n();
  const track = useWritingTelemetry(q.id, telemetry, startedAt);

  if (q.type === "single" || q.type === "multiple") {
    const multiple = q.type === "multiple";
    const selected = multiple ? (Array.isArray(value) ? value : []) : typeof value === "string" ? [value] : [];
    return (
      <div>
        <p className="mb-3 text-sm font-semibold text-ink-3">{multiple ? t.exam.chooseMany : t.exam.chooseOne}</p>
        <div className="space-y-2.5" role={multiple ? "group" : "radiogroup"}>
          {q.options!.map((o, i) => {
            const on = selected.includes(o.id);
            return (
              <motion.button
                key={o.id}
                type="button"
                whileTap={{ scale: 0.98 }}
                role={multiple ? "checkbox" : "radio"}
                aria-checked={on}
                onClick={() => onChange(multiple ? (on ? selected.filter((x) => x !== o.id) : [...selected, o.id]) : o.id)}
                className={cn(
                  "flex w-full items-center gap-4 rounded-2xl border-2 px-4 py-3.5 text-left text-[16px] transition-colors",
                  on ? "border-blue bg-blue-soft" : "border-line bg-paper hover:border-ink/25",
                )}
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center text-sm font-bold transition-colors",
                    multiple ? "rounded-lg" : "rounded-full",
                    on ? "bg-blue text-white" : "bg-card text-ink-2 ring-1 ring-line",
                  )}
                >
                  {on ? <Check className="size-4" strokeWidth={3} /> : String.fromCharCode(65 + i)}
                </span>
                <MathText text={o.text} />
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }

  if (q.type === "truefalse") {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[true, false].map((v) => (
          <motion.button
            key={String(v)}
            type="button"
            whileTap={{ scale: 0.97 }}
            aria-pressed={value === v}
            onClick={() => onChange(v)}
            className={cn(
              "h-20 rounded-2xl border-2 text-lg font-bold transition-colors",
              value === v ? (v ? "border-green bg-green text-white" : "border-red bg-red text-white") : "border-line bg-paper text-ink-2 hover:border-ink/25",
            )}
          >
            {v ? t.common.trueLabel : t.common.falseLabel}
          </motion.button>
        ))}
      </div>
    );
  }

  if (q.type === "short" || q.type === "number") {
    return (
      <input
        ref={track}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        inputMode={q.type === "number" ? "decimal" : "text"}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        maxLength={300}
        placeholder={q.type === "number" ? t.exam.numberPlaceholder : t.exam.shortPlaceholder}
        className="h-14 w-full rounded-2xl border-2 border-line bg-paper px-5 text-lg font-semibold focus:border-blue focus:outline-none"
      />
    );
  }

  const text = typeof value === "string" ? value : "";
  const words = countWords(text);
  return (
    <div>
      <textarea
        ref={track}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
        maxLength={20000}
        spellCheck={false}
        autoCorrect="off"
        placeholder={t.exam.longPlaceholder}
        className="w-full resize-y rounded-2xl border-2 border-line bg-paper px-5 py-4 text-[16px] leading-relaxed focus:border-blue focus:outline-none"
      />
      <p className="mt-2 text-right text-sm font-semibold text-ink-3">
        {fmt(t.exam.words, { n: words })}
        {q.minWords || q.maxWords ? ` · ${fmt(t.exam.wordsRange, { min: q.minWords ?? 0, max: q.maxWords ?? "∞" })}` : ""}
      </p>
    </div>
  );
}
