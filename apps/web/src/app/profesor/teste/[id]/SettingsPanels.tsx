"use client";

import { useState } from "react";
import { BookOpenCheck, Eye, EyeOff, FlaskConical, GraduationCap, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/fmt";
import { AUTO_TEXT, CANARY_WORDS } from "@/lib/ai/trap-text";
import { applyPreset, DEFAULT_THRESHOLDS, SECURITY_PRESET_VALUES } from "@/lib/tests/presets";
import type { SecurityPreset, TestSettings } from "@/lib/tests/types";
import type { Locale } from "@/lib/db/schema";
import { NumberInput } from "@/components/NumberInput";
import { Switch } from "@/components/Switch";
import { Badge, Card, Input, Textarea, cn } from "@/components/ui";

type Props = { settings: TestSettings; onChange: (s: TestSettings) => void };

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-line bg-paper p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-xl px-4 py-2 text-sm font-bold transition-colors",
            value === o.id ? "bg-ink text-paper shadow" : "text-ink-2 hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h3 className="font-display text-lg font-bold">{title}</h3>
      {hint ? <p className="mt-1 text-sm text-ink-3">{hint}</p> : null}
      <div className="mt-4">{children}</div>
    </Card>
  );
}

const GRADE_COLORS = ["#c8283c", "#d6473b", "#e0663a", "#e98a38", "#f2b32a", "#c9b52f", "#8fb23d", "#55a64b", "#2e9555", "#1f8a5b"];

export function GradingPanel({ settings, onChange }: Props) {
  const { t } = useI18n();
  const g = settings.grading;
  const setThreshold = (i: number, v: number) => {
    const th = [...g.thresholds];
    th[i] = v;
    // Pragurile rămân crescătoare: ajustăm vecinii dacă e nevoie.
    for (let j = i + 1; j < th.length; j++) th[j] = Math.max(th[j], th[j - 1]);
    for (let j = i - 1; j >= 0; j--) th[j] = Math.min(th[j], th[j + 1]);
    onChange({ ...settings, grading: { ...g, thresholds: th } });
  };
  const bounds = [0, ...g.thresholds, 100];

  return (
    <div className="space-y-4">
      <Section title={t.settings.gradingMode}>
        <Segmented
          value={g.mode}
          onChange={(mode) => onChange({ ...settings, grading: { ...g, mode } })}
          options={[
            { id: "grade10", label: t.settings.grade10 },
            { id: "percent", label: t.settings.percent },
          ]}
        />
        {g.mode === "grade10" ? (
          <div className="mt-6">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-semibold">{t.settings.thresholds}</p>
              <button
                type="button"
                className="text-sm font-bold text-blue hover:underline"
                onClick={() => onChange({ ...settings, grading: { ...g, thresholds: [...DEFAULT_THRESHOLDS] } })}
              >
                {t.settings.resetThresholds}
              </button>
            </div>
            <p className="mt-1 text-sm text-ink-3">{t.settings.thresholdsHint}</p>
            <div className="mt-4 flex h-4 overflow-hidden rounded-full" aria-hidden>
              {GRADE_COLORS.map((c, i) => (
                <div key={c} style={{ width: `${bounds[i + 1] - bounds[i]}%`, background: c }} className="transition-all duration-300" />
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
              {g.thresholds.map((v, i) => (
                <label key={i} className="rounded-2xl border border-line bg-paper p-2 text-center">
                  <span className="block text-xs font-bold" style={{ color: GRADE_COLORS[i + 1] }}>
                    {fmt(t.settings.gradeLabel, { n: i + 2 })}
                  </span>
                  <span className="mt-1 block text-[11px] text-ink-3">{t.settings.fromPercent}</span>
                  <NumberInput value={v} min={0} max={100} onChange={(n) => setThreshold(i, n ?? 0)} className="mt-1 h-9 w-full text-sm" aria-label={fmt(t.settings.gradeLabel, { n: i + 2 })} />
                </label>
              ))}
            </div>
          </div>
        ) : null}
      </Section>

      <Section title={t.settings.timeLimit}>
        <div className="flex flex-wrap items-center gap-4">
          <Switch
            checked={settings.timeLimitMinutes !== null}
            onChange={(on) => onChange({ ...settings, timeLimitMinutes: on ? 45 : null })}
            label={t.settings.timeLimitOn}
          />
          {settings.timeLimitMinutes !== null ? (
            <label className="flex items-center gap-2 font-semibold">
              <NumberInput value={settings.timeLimitMinutes} min={1} max={600} onChange={(v) => onChange({ ...settings, timeLimitMinutes: Math.round(v ?? 1) || 1 })} className="w-20" />
              {t.settings.timeLimitMinutes}
            </label>
          ) : null}
        </div>
      </Section>

      <Section title={t.editor.tabs.questions}>
        <div className="divide-y divide-line">
          <Switch checked={settings.shuffleQuestions} onChange={(v) => onChange({ ...settings, shuffleQuestions: v })} label={t.settings.shuffleQuestions} />
          <Switch checked={settings.shuffleOptions} onChange={(v) => onChange({ ...settings, shuffleOptions: v })} label={t.settings.shuffleOptions} />
          <Switch checked={settings.allowBackNavigation} onChange={(v) => onChange({ ...settings, allowBackNavigation: v })} label={t.settings.allowBack} />
          <Switch checked={settings.results.showScore} onChange={(v) => onChange({ ...settings, results: { ...settings.results, showScore: v } })} label={t.settings.showScore} />
          <Switch checked={settings.results.showCorrectAnswers} onChange={(v) => onChange({ ...settings, results: { ...settings.results, showCorrectAnswers: v } })} label={t.settings.showCorrect} />
        </div>
      </Section>
    </div>
  );
}

const PRESET_ICONS = { practice: BookOpenCheck, standard: GraduationCap, strict: Lock, ai_trap: FlaskConical } as const;

/** Dacă regulile coincid exact cu o presetare, o afișăm ca selectată. */
function detectPreset(security: Omit<TestSettings["security"], "preset">): SecurityPreset {
  for (const [name, values] of Object.entries(SECURITY_PRESET_VALUES)) {
    if ((Object.keys(values) as (keyof typeof values)[]).every((k) => values[k] === security[k])) return name as SecurityPreset;
  }
  return "custom";
}

export function SecurityPanel({ settings, onChange }: Props) {
  const { t } = useI18n();
  const s = settings.security;
  const set = (patch: Partial<TestSettings["security"]>) => {
    const next = { ...s, ...patch };
    onChange({ ...settings, security: { ...next, preset: detectPreset(next) } });
  };
  return (
    <div className="space-y-4">
      <Section title={t.settings.presetTitle} hint={t.settings.presetHint}>
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(PRESET_ICONS) as (keyof typeof PRESET_ICONS)[]).map((p) => {
            const Icon = PRESET_ICONS[p];
            const active = s.preset === p;
            return (
              <button
                key={p}
                type="button"
                aria-pressed={active}
                onClick={() => onChange(applyPreset(settings, p))}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all",
                  active ? "border-ink bg-ink text-paper shadow-lift" : "border-line bg-paper hover:border-ink/30",
                )}
              >
                <Icon className={cn("mt-0.5 size-5 shrink-0", active ? "text-sun" : "text-red")} />
                <span>
                  <span className="block font-bold">{t.presets[p][0]}</span>
                  <span className={cn("mt-1 block text-sm", active ? "text-paper/75" : "text-ink-3")}>{t.presets[p][1]}</span>
                </span>
              </button>
            );
          })}
        </div>
        {s.preset === "custom" ? (
          <p className="mt-3 text-sm">
            <Badge tone="blue">{t.presets.custom[0]}</Badge> <span className="text-ink-3">{t.presets.custom[1]}</span>
          </p>
        ) : null}
      </Section>

      <Section title={t.editor.tabs.security}>
        <div className="divide-y divide-line">
          <Switch checked={s.allowLeave} onChange={(v) => set({ allowLeave: v })} label={t.settings.allowLeave} hint={t.settings.allowLeaveHint} />
          {!s.allowLeave ? (
            <div className="grid gap-4 py-4 sm:grid-cols-2">
              <label>
                <span className="mb-1.5 block text-sm font-semibold text-ink-2">{t.settings.maxViolations}</span>
                <NumberInput value={s.maxViolations} min={1} max={20} onChange={(v) => set({ maxViolations: Math.round(v ?? 1) || 1 })} className="w-24" />
              </label>
              <div>
                <span className="mb-1.5 block text-sm font-semibold text-ink-2">{t.settings.onLimit}</span>
                <Segmented
                  value={s.onViolationLimit}
                  onChange={(v) => set({ onViolationLimit: v })}
                  options={[
                    { id: "submit", label: t.settings.onLimitSubmit },
                    { id: "flag", label: t.settings.onLimitFlag },
                  ]}
                />
              </div>
            </div>
          ) : null}
          <Switch checked={s.requireFullscreen} onChange={(v) => set({ requireFullscreen: v })} label={t.settings.requireFullscreen} />
          <Switch checked={s.allowScreenshots} onChange={(v) => set({ allowScreenshots: v })} label={t.settings.allowScreenshots} hint={t.settings.allowScreenshotsHint} />
          <Switch checked={s.allowCopyPaste} onChange={(v) => set({ allowCopyPaste: v })} label={t.settings.allowCopyPaste} hint={t.settings.allowCopyPasteHint} />
          <Switch checked={s.watermark} onChange={(v) => set({ watermark: v })} label={t.settings.watermark} hint={t.settings.watermarkHint} />
          <Switch
            checked={s.allowWebBrowser}
            onChange={(v) => set({ allowWebBrowser: v })}
            disabled
            label={
              <>
                {t.settings.allowWeb} <Badge tone="sun">{t.common.comingSoon}</Badge>
              </>
            }
            hint={t.settings.allowWebHint}
          />
        </div>
      </Section>
    </div>
  );
}

export function AiPanel({ settings, onChange, language, llmAvailable }: Props & { language: Locale; llmAvailable: boolean }) {
  const { t } = useI18n();
  const trap = settings.aiTrap;
  const [reveal, setReveal] = useState(true);
  const [keywordsText, setKeywordsText] = useState(trap.keywords.join(", "));
  const setTrap = (patch: Partial<TestSettings["aiTrap"]>) => onChange({ ...settings, aiTrap: { ...trap, ...patch } });
  const sample = trap.mode === "auto" ? AUTO_TEXT[language](CANARY_WORDS[language][0]) : trap.hiddenText;

  return (
    <div className="space-y-4">
      <Section title={t.editor.tabs.ai}>
        <Switch checked={trap.enabled} onChange={(v) => setTrap({ enabled: v })} label={t.settings.aiTrapEnabled} hint={t.settings.aiTrapHint} />
        {trap.enabled ? (
          <div className="mt-2 space-y-4">
            {!settings.security.allowCopyPaste ? (
              <p className="rounded-2xl border border-sun/50 bg-sun-soft px-4 py-3 text-sm font-semibold">{t.settings.aiTrapCopyWarning}</p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              {(["auto", "custom"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={trap.mode === m}
                  onClick={() => setTrap({ mode: m })}
                  className={cn(
                    "rounded-2xl border-2 p-4 text-left font-semibold transition-all",
                    trap.mode === m ? "border-ink bg-ink text-paper" : "border-line bg-paper hover:border-ink/30",
                  )}
                >
                  {m === "auto" ? t.settings.aiTrapModeAuto : t.settings.aiTrapModeCustom}
                </button>
              ))}
            </div>
            {trap.mode === "custom" ? (
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-ink-2">{t.settings.aiTrapCustomText}</span>
                  <Textarea value={trap.hiddenText} maxLength={1000} onChange={(e) => setTrap({ hiddenText: e.target.value })} placeholder={t.settings.aiTrapCustomPlaceholder} rows={3} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-ink-2">{t.settings.aiTrapKeywords}</span>
                  <Input
                    value={keywordsText}
                    onChange={(e) => {
                      setKeywordsText(e.target.value);
                      setTrap({
                        keywords: e.target.value
                          .split(",")
                          .map((w) => w.trim())
                          .filter(Boolean)
                          .slice(0, 20),
                      });
                    }}
                  />
                  <span className="mt-1.5 block text-xs text-ink-3">{t.settings.aiTrapKeywordsHint}</span>
                </label>
              </div>
            ) : null}

            <div className="rounded-2xl border border-dashed border-line p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-ink-2">{t.settings.aiTrapPreview}</p>
                <button type="button" onClick={() => setReveal(!reveal)} className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-ink/5" aria-label={t.settings.aiTrapPreview}>
                  {reveal ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </button>
              </div>
              <p className="mt-3 leading-relaxed">
                {t.landing.aiDemoQuestion}{" "}
                {sample ? (
                  <span className={cn("transition-all", reveal ? "rounded bg-red-soft px-1 text-red" : "text-card")}>{sample}</span>
                ) : null}
              </p>
            </div>
          </div>
        ) : null}
      </Section>

      <Section title={t.settings.aiAnalysis} hint={t.settings.aiAnalysisHint}>
        <Switch
          checked={settings.aiAnalysis.enabled}
          onChange={(v) => onChange({ ...settings, aiAnalysis: { enabled: v } })}
          label={
            <span className="inline-flex items-center gap-2">
              <Sparkles className="size-4 text-sun" /> {t.settings.aiAnalysis}
            </span>
          }
        />
        {!llmAvailable ? (
          <p className="mt-2 flex items-start gap-2 text-sm text-ink-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" /> {t.settings.aiAnalysisOff}
          </p>
        ) : null}
      </Section>
    </div>
  );
}
