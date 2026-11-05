"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  AlignLeft,
  ArrowLeft,
  CheckCircle2,
  CircleDot,
  CloudOff,
  Hash,
  ListChecks,
  Loader2,
  Lock,
  QrCode,
  ToggleLeft,
  Type,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/fmt";
import { newQuestion } from "@/lib/tests/factory";
import { QUESTION_TYPES, type EditorPayload, type QuestionType } from "@/lib/tests/types";
import type { PublishIssue } from "@/lib/tests/service";
import { Badge, Button, Input, cn } from "@/components/ui";
import { publishTestAction, saveTestAction } from "../../actions";
import { QuestionCard } from "./QuestionCard";
import { AiPanel, GradingPanel, SecurityPanel } from "./SettingsPanels";

const TYPE_ICONS: Record<QuestionType, typeof CircleDot> = {
  single: CircleDot,
  multiple: ListChecks,
  truefalse: ToggleLeft,
  short: Type,
  number: Hash,
  long: AlignLeft,
};

type Tab = "questions" | "grading" | "security" | "ai";

export function TestEditor({
  testId,
  initial,
  status,
  locked: initiallyLocked,
  llmAvailable,
}: {
  testId: string;
  initial: EditorPayload;
  status: "draft" | "published" | "closed";
  locked: boolean;
  llmAvailable: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [data, setData] = useState<EditorPayload>(initial);
  const [tab, setTab] = useState<Tab>("questions");
  const [saveState, setSaveState] = useState<"saved" | "dirty" | "saving" | "error">("saved");
  const [locked, setLocked] = useState(initiallyLocked);
  const [issues, setIssues] = useState<PublishIssue[]>([]);
  const [publishing, startPublish] = useTransition();
  const lastSaved = useRef(JSON.stringify(initial));
  const chain = useRef<Promise<void>>(Promise.resolve());
  const latest = useRef(data);
  latest.current = data;

  // Salvările rulează pe rând, ca o salvare veche să nu o suprascrie pe una nouă.
  const save = useCallback(() => {
    chain.current = chain.current.then(async () => {
      const snapshot = latest.current;
      const json = JSON.stringify(snapshot);
      if (json === lastSaved.current) return setSaveState("saved");
      setSaveState("saving");
      try {
        const res = await saveTestAction(testId, snapshot);
        if (!res.ok) return setSaveState("error");
        lastSaved.current = json;
        setLocked(res.locked);
        setSaveState(JSON.stringify(latest.current) === json ? "saved" : "dirty");
      } catch {
        setSaveState("error");
      }
    });
    return chain.current;
  }, [testId]);

  useEffect(() => {
    if (JSON.stringify(data) === lastSaved.current) return;
    setSaveState("dirty");
    const h = setTimeout(save, 800);
    return () => clearTimeout(h);
  }, [data, save]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (JSON.stringify(latest.current) !== lastSaved.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const totalPoints = Math.round(data.questions.reduce((s, q) => s + q.points, 0) * 100) / 100;

  const updateQuestion = (i: number, fn: (qs: EditorPayload["questions"]) => EditorPayload["questions"]) =>
    setData((d) => ({ ...d, questions: fn(d.questions) }));

  function addQuestion(type: QuestionType) {
    setData((d) => ({ ...d, questions: [...d.questions, newQuestion(type)] }));
    requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
  }

  function publish() {
    startPublish(async () => {
      await save();
      const res = await publishTestAction(testId);
      if (res.ok) router.push(`/profesor/teste/${testId}/distribuie`);
      else setIssues(res.issues);
    });
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "questions", label: `${t.editor.tabs.questions} · ${data.questions.length}` },
    { id: "grading", label: t.editor.tabs.grading },
    { id: "security", label: t.editor.tabs.security },
    { id: "ai", label: t.editor.tabs.ai },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/profesor" className="inline-flex items-center gap-2 text-sm font-semibold text-ink-3 hover:text-ink">
          <ArrowLeft className="size-4" /> {t.nav.myTests}
        </Link>
        <div className="flex items-center gap-3">
          <SaveIndicator state={saveState} />
          {status !== "draft" ? (
            <Link href={`/profesor/teste/${testId}/distribuie`} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-line bg-card px-4 text-sm font-bold">
              <QrCode className="size-4" /> {t.teacher.actions.share}
            </Link>
          ) : null}
          {status !== "published" ? (
            <Button variant="red" onClick={publish} disabled={publishing}>
              {publishing ? <Loader2 className="size-4 animate-spin" /> : <QrCode className="size-4" />} {t.editor.publish}
            </Button>
          ) : (
            <Badge tone="green" className="h-11 px-4 text-sm">
              <CheckCircle2 className="size-4" /> {t.editor.published}
            </Badge>
          )}
        </div>
      </div>

      <AnimatePresence>
        {issues.length ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="alert"
            className="mt-4 rounded-2xl border border-red/30 bg-red-soft px-5 py-4 text-sm"
          >
            <p className="font-bold text-red">{t.editor.publishIssues}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {issues.map((iss, i) => (
                <li key={i}>{fmt(t.editor.issues[iss.key], { n: iss.n ?? "" })}</li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mt-6 space-y-3">
        <input
          value={data.title}
          onChange={(e) => {
            setIssues([]);
            setData({ ...data, title: e.target.value });
          }}
          placeholder={t.editor.titlePlaceholder}
          aria-label={t.editor.titlePlaceholder}
          maxLength={200}
          className="w-full bg-transparent font-display text-3xl font-bold tracking-tight placeholder:text-ink-3/60 focus:outline-none sm:text-4xl"
        />
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Input value={data.subject} onChange={(e) => setData({ ...data, subject: e.target.value })} placeholder={t.editor.subjectPlaceholder} maxLength={100} />
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-ink-2">{t.editor.language}</span>
            {(["ro", "ru"] as const).map((l) => (
              <button
                key={l}
                type="button"
                disabled={locked}
                aria-pressed={data.language === l}
                onClick={() => setData({ ...data, language: l })}
                className={cn(
                  "h-12 rounded-2xl border-2 px-4 font-bold uppercase transition-all disabled:opacity-50",
                  data.language === l ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink-2",
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <textarea
          value={data.description}
          onChange={(e) => setData({ ...data, description: e.target.value })}
          placeholder={t.editor.descriptionPlaceholder}
          rows={2}
          maxLength={5000}
          className="w-full resize-none rounded-2xl border border-line bg-card px-4 py-3 text-[15px] placeholder:text-ink-3 focus:border-blue focus:outline-none focus:ring-4 focus:ring-blue/15"
        />
      </div>

      <nav className="sticky top-16 z-30 -mx-4 mt-6 overflow-x-auto border-b border-line bg-paper/90 px-4 backdrop-blur" aria-label="tabs">
        <div className="flex min-w-max gap-1">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              type="button"
              onClick={() => setTab(tb.id)}
              className={cn(
                "relative px-4 py-3.5 text-sm font-bold transition-colors",
                tab === tb.id ? "text-ink" : "text-ink-3 hover:text-ink",
              )}
            >
              {tb.label}
              {tab === tb.id ? <motion.span layoutId="tab-underline" className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-red" /> : null}
            </button>
          ))}
        </div>
      </nav>

      <div className="mt-6">
        {tab === "questions" ? (
          <div>
            {locked ? (
              <div className="mb-4 flex gap-3 rounded-2xl border border-blue/30 bg-blue-soft px-5 py-4 text-sm">
                <Lock className="mt-0.5 size-4 shrink-0 text-blue" />
                <div>
                  <p className="font-bold">{t.editor.lockedTitle}</p>
                  <p className="mt-1 text-ink-2">{t.editor.lockedText}</p>
                </div>
              </div>
            ) : null}
            <ol className="space-y-4">
              <AnimatePresence initial={false}>
                {data.questions.map((q, i) => (
                  <motion.li key={q.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.25 }}>
                    <QuestionCard
                      q={q}
                      index={i}
                      total={data.questions.length}
                      locked={locked}
                      onChange={(nq) => updateQuestion(i, (qs) => qs.map((x) => (x.id === q.id ? nq : x)))}
                      onMove={(dir) =>
                        updateQuestion(i, (qs) => {
                          const j = i + dir;
                          if (j < 0 || j >= qs.length) return qs;
                          const copy = [...qs];
                          [copy[i], copy[j]] = [copy[j], copy[i]];
                          return copy;
                        })
                      }
                      onDuplicate={() =>
                        updateQuestion(i, (qs) => {
                          const copy = [...qs];
                          copy.splice(i + 1, 0, { ...structuredClone(q), id: crypto.randomUUID() });
                          return copy;
                        })
                      }
                      onDelete={() => updateQuestion(i, (qs) => qs.filter((x) => x.id !== q.id))}
                    />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ol>

            {!locked ? (
              <div className="mt-6 rounded-3xl border-2 border-dashed border-line p-4 sm:p-6">
                <p className="mb-3 font-display font-bold">{t.editor.addQuestion}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {QUESTION_TYPES.map((type) => {
                    const Icon = TYPE_ICONS[type];
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => addQuestion(type)}
                        className="group flex items-start gap-3 rounded-2xl border border-line bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-ink/30 hover:shadow-soft"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-red-soft text-red transition-colors group-hover:bg-red group-hover:text-white">
                          <Icon className="size-5" />
                        </span>
                        <span>
                          <span className="block text-sm font-bold leading-tight">{t.qtypes[type]}</span>
                          <span className="mt-0.5 hidden text-xs text-ink-3 sm:block">{t.qtypeHints[type]}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <p className="mt-4 text-right text-sm font-semibold text-ink-3">{fmt(t.editor.totalPoints, { n: totalPoints })}</p>
          </div>
        ) : null}
        {tab === "grading" ? <GradingPanel settings={data.settings} onChange={(settings) => setData({ ...data, settings })} /> : null}
        {tab === "security" ? <SecurityPanel settings={data.settings} onChange={(settings) => setData({ ...data, settings })} /> : null}
        {tab === "ai" ? (
          <AiPanel settings={data.settings} onChange={(settings) => setData({ ...data, settings })} language={data.language} llmAvailable={llmAvailable} />
        ) : null}
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: "saved" | "dirty" | "saving" | "error" }) {
  const { t } = useI18n();
  if (state === "error")
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red">
        <CloudOff className="size-4" /> {t.common.saveError}
      </span>
    );
  if (state === "saving" || state === "dirty")
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-3">
        <Loader2 className="size-4 animate-spin" /> {t.common.saving}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green">
      <CheckCircle2 className="size-4" /> {t.common.saved}
    </span>
  );
}
