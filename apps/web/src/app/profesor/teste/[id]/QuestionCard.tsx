"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, Copy, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/fmt";
import { convertQuestion, newOptionId } from "@/lib/tests/factory";
import { QUESTION_TYPES, type EditorQuestion, type QuestionData, type QuestionType } from "@/lib/tests/types";
import { MathText } from "@/components/MathText";
import { NumberInput } from "@/components/NumberInput";
import { Switch } from "@/components/Switch";
import { Input, Select, Textarea, cn } from "@/components/ui";

const FORMULAS: { key: keyof ReturnType<typeof useI18n>["t"]["editor"]["insert"]; tex: string; label: string }[] = [
  { key: "fraction", tex: "\\frac{a}{b}", label: "a/b" },
  { key: "power", tex: "x^{2}", label: "x²" },
  { key: "sqrt", tex: "\\sqrt{x}", label: "√x" },
  { key: "index", tex: "x_{1}", label: "x₁" },
  { key: "pi", tex: "\\pi", label: "π" },
  { key: "times", tex: "\\times", label: "×" },
  { key: "leq", tex: "\\leq", label: "≤" },
  { key: "geq", tex: "\\geq", label: "≥" },
  { key: "neq", tex: "\\neq", label: "≠" },
  { key: "degree", tex: "90^\\circ", label: "90°" },
];

export function QuestionCard({
  q,
  index,
  total,
  locked,
  onChange,
  onMove,
  onDuplicate,
  onDelete,
}: {
  q: EditorQuestion;
  index: number;
  total: number;
  locked: boolean;
  onChange: (q: EditorQuestion) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);

  const setData = (data: QuestionData) => onChange({ ...q, data });

  function insertFormula(tex: string) {
    const el = promptRef.current;
    const snippet = `$${tex}$`;
    if (!el) return onChange({ ...q, prompt: q.prompt + snippet });
    const start = el.selectionStart ?? q.prompt.length;
    const end = el.selectionEnd ?? start;
    const prompt = q.prompt.slice(0, start) + snippet + q.prompt.slice(end);
    onChange({ ...q, prompt });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + snippet.length, start + snippet.length);
    });
  }

  async function upload(file: File) {
    setUploading(true);
    setUploadError(false);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body });
      if (!res.ok) throw new Error(String(res.status));
      const { url } = (await res.json()) as { url: string };
      onChange({ ...q, imageUrl: url });
    } catch {
      setUploadError(true);
    } finally {
      setUploading(false);
    }
  }

  return (
    <fieldset disabled={locked} className="group/q relative rounded-3xl border border-line bg-card p-4 shadow-soft transition-shadow focus-within:shadow-lift sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-ink font-display text-sm font-bold text-paper">{index + 1}</span>
        <Select
          aria-label={t.editor.changeType}
          value={q.data.type}
          onChange={(e) => onChange(convertQuestion(q, e.target.value as QuestionType))}
          className="h-10 w-auto min-w-0 flex-1 text-sm font-semibold sm:max-w-72"
        >
          {QUESTION_TYPES.map((type) => (
            <option key={type} value={type}>
              {t.qtypes[type]}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink-2">
          <NumberInput value={q.points} min={0} max={1000} onChange={(v) => onChange({ ...q, points: v ?? 0 })} className="h-10 w-16" aria-label={t.editor.points} />
          {t.common.pts}
        </label>
        <div className="ml-auto flex items-center">
          <IconButton label={t.editor.moveUp} onClick={() => onMove(-1)} disabled={index === 0}>
            <ArrowUp className="size-4" />
          </IconButton>
          <IconButton label={t.editor.moveDown} onClick={() => onMove(1)} disabled={index === total - 1}>
            <ArrowDown className="size-4" />
          </IconButton>
          <IconButton label={t.editor.duplicate} onClick={onDuplicate}>
            <Copy className="size-4" />
          </IconButton>
          <IconButton label={t.editor.deleteQuestion} onClick={onDelete} danger>
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex flex-wrap gap-1" aria-label={t.editor.formulaHelp}>
          {FORMULAS.map((f) => (
            <button
              key={f.key}
              type="button"
              title={t.editor.insert[f.key]}
              onClick={() => insertFormula(f.tex)}
              className="h-8 min-w-9 rounded-lg border border-line bg-paper px-2 text-sm font-semibold text-ink-2 hover:border-blue hover:text-blue"
            >
              {f.label}
            </button>
          ))}
        </div>
        <Textarea
          ref={promptRef}
          value={q.prompt}
          onChange={(e) => onChange({ ...q, prompt: e.target.value })}
          placeholder={t.editor.promptPlaceholder}
          aria-label={t.editor.prompt}
          rows={3}
          className="text-base"
        />
        {q.prompt.includes("$") ? (
          <div className="mt-2 rounded-2xl bg-paper-2 px-4 py-3 text-[15px]">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-3">{t.editor.preview}</span>
            <MathText text={q.prompt} />
          </div>
        ) : null}
      </div>

      <div className="mt-3">
        {q.imageUrl ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={q.imageUrl} alt="" className="max-h-64 rounded-2xl border border-line" />
            <button
              type="button"
              onClick={() => onChange({ ...q, imageUrl: null })}
              className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-ink/80 text-paper"
              aria-label={t.editor.removeImage}
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold text-ink-3 hover:bg-ink/5 hover:text-ink"
          >
            <ImagePlus className="size-4" /> {uploading ? t.common.loading : t.editor.addImage}
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
        {uploadError ? <p className="mt-1 text-sm font-semibold text-red">{t.editor.uploadError}</p> : null}
      </div>

      <div className="mt-5 border-t border-line pt-5">
        <TypeEditor data={q.data} setData={setData} />
      </div>
    </fieldset>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid size-9 place-items-center rounded-xl text-ink-3 transition-colors disabled:opacity-30",
        danger ? "hover:bg-red-soft hover:text-red" : "hover:bg-ink/5 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function TypeEditor({ data, setData }: { data: QuestionData; setData: (d: QuestionData) => void }) {
  const { t } = useI18n();
  switch (data.type) {
    case "single":
    case "multiple": {
      const multiple = data.type === "multiple";
      const toggle = (id: string) => {
        const has = data.correctIds.includes(id);
        const correctIds = multiple ? (has ? data.correctIds.filter((x) => x !== id) : [...data.correctIds, id]) : [id];
        setData({ ...data, correctIds });
      };
      return (
        <div>
          <p className="mb-3 text-sm font-semibold text-ink-2">{t.editor.options}</p>
          <ul className="space-y-2">
            {data.options.map((o, i) => {
              const correct = data.correctIds.includes(o.id);
              return (
                <li key={o.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggle(o.id)}
                    title={t.editor.markCorrect}
                    aria-label={t.editor.markCorrect}
                    aria-pressed={correct}
                    className={cn(
                      "grid size-10 shrink-0 place-items-center border-2 transition-all",
                      multiple ? "rounded-xl" : "rounded-full",
                      correct ? "border-green bg-green text-white" : "border-line text-transparent hover:border-green/60",
                    )}
                  >
                    <Check className="size-5" strokeWidth={3} />
                  </button>
                  <Input
                    value={o.text}
                    placeholder={fmt(t.editor.option, { n: i + 1 })}
                    onChange={(e) =>
                      setData({ ...data, options: data.options.map((x) => (x.id === o.id ? { ...x, text: e.target.value } : x)) })
                    }
                    className={cn("h-11", correct && "border-green/50")}
                  />
                  <button
                    type="button"
                    disabled={data.options.length <= 2}
                    onClick={() =>
                      setData({
                        ...data,
                        options: data.options.filter((x) => x.id !== o.id),
                        correctIds: data.correctIds.filter((x) => x !== o.id),
                      })
                    }
                    className="grid size-10 shrink-0 place-items-center rounded-xl text-ink-3 hover:bg-red-soft hover:text-red disabled:opacity-30"
                    aria-label={t.common.delete}
                  >
                    <X className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
          {data.options.length < 12 ? (
            <button
              type="button"
              onClick={() => setData({ ...data, options: [...data.options, { id: newOptionId(), text: "" }] })}
              className="mt-3 inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-bold text-blue hover:bg-blue-soft"
            >
              <Plus className="size-4" /> {t.editor.addOption}
            </button>
          ) : null}
          {data.type === "multiple" ? (
            <Switch checked={data.partialCredit} onChange={(v) => setData({ ...data, partialCredit: v })} label={t.editor.partialCredit} />
          ) : null}
        </div>
      );
    }
    case "truefalse":
      return (
        <div>
          <p className="mb-3 text-sm font-semibold text-ink-2">{t.editor.correctAnswer}</p>
          <div className="grid grid-cols-2 gap-3 sm:max-w-md">
            {[true, false].map((v) => (
              <button
                key={String(v)}
                type="button"
                aria-pressed={data.correct === v}
                onClick={() => setData({ ...data, correct: v })}
                className={cn(
                  "h-14 rounded-2xl border-2 font-bold transition-all",
                  data.correct === v ? "border-green bg-green text-white" : "border-line text-ink-2 hover:border-green/50",
                )}
              >
                {v ? t.editor.trueLabel : t.editor.falseLabel}
              </button>
            ))}
          </div>
        </div>
      );
    case "short":
      return (
        <div>
          <p className="text-sm font-semibold text-ink-2">{t.editor.acceptedAnswers}</p>
          <p className="mb-3 mt-1 text-xs text-ink-3">{t.editor.acceptedHint}</p>
          <ul className="space-y-2">
            {data.accepted.map((a, i) => (
              <li key={i} className="flex items-center gap-2">
                <Input
                  value={a}
                  onChange={(e) => setData({ ...data, accepted: data.accepted.map((x, j) => (j === i ? e.target.value : x)) })}
                  className="h-11"
                />
                <button
                  type="button"
                  disabled={data.accepted.length <= 1}
                  onClick={() => setData({ ...data, accepted: data.accepted.filter((_, j) => j !== i) })}
                  className="grid size-10 shrink-0 place-items-center rounded-xl text-ink-3 hover:bg-red-soft hover:text-red disabled:opacity-30"
                  aria-label={t.common.delete}
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          {data.accepted.length < 20 ? (
            <button
              type="button"
              onClick={() => setData({ ...data, accepted: [...data.accepted, ""] })}
              className="mt-3 inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-bold text-blue hover:bg-blue-soft"
            >
              <Plus className="size-4" /> {t.editor.addAccepted}
            </button>
          ) : null}
          <div className="mt-2 divide-y divide-line">
            <Switch checked={data.ignoreDiacritics} onChange={(v) => setData({ ...data, ignoreDiacritics: v })} label={t.editor.ignoreDiacritics} />
            <Switch checked={data.caseSensitive} onChange={(v) => setData({ ...data, caseSensitive: v })} label={t.editor.caseSensitive} />
          </div>
        </div>
      );
    case "number":
      return (
        <div className="grid max-w-md grid-cols-2 gap-4">
          <label>
            <span className="mb-1.5 block text-sm font-semibold text-ink-2">{t.editor.numberValue}</span>
            <NumberInput value={data.value} onChange={(v) => setData({ ...data, value: v ?? 0 })} className="w-full" />
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-semibold text-ink-2">{t.editor.tolerance}</span>
            <NumberInput value={data.tolerance} min={0} onChange={(v) => setData({ ...data, tolerance: v ?? 0 })} className="w-full" />
          </label>
        </div>
      );
    case "long":
      return (
        <div className="space-y-4">
          <div className="grid max-w-md grid-cols-2 gap-4">
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-ink-2">{t.editor.minWords}</span>
              <NumberInput value={data.minWords} allowEmpty min={0} max={5000} placeholder={t.common.none} onChange={(v) => setData({ ...data, minWords: v === null ? null : Math.round(v) })} className="w-full" />
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-ink-2">{t.editor.maxWords}</span>
              <NumberInput value={data.maxWords} allowEmpty min={1} max={5000} placeholder={t.common.none} onChange={(v) => setData({ ...data, maxWords: v === null ? null : Math.round(v) })} className="w-full" />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink-2">{t.editor.rubric}</span>
            <Textarea value={data.rubric} onChange={(e) => setData({ ...data, rubric: e.target.value })} placeholder={t.editor.rubricPlaceholder} rows={3} />
            <span className="mt-1.5 block text-xs text-ink-3">{t.editor.rubricHint}</span>
          </label>
        </div>
      );
  }
}
