import type { SecurityPreset, TestSettings } from "./types";

export const DEFAULT_THRESHOLDS = [15, 25, 35, 45, 55, 65, 75, 85, 95];

type Security = TestSettings["security"];

/** Presetări de securitate; profesorul poate porni de la una și ajusta orice opțiune. */
export const SECURITY_PRESET_VALUES: Record<Exclude<SecurityPreset, "custom">, Omit<Security, "preset">> = {
  // Exersare acasă: fără restricții, doar se înregistrează ce face elevul.
  practice: {
    allowLeave: true,
    maxViolations: 3,
    onViolationLimit: "flag",
    requireFullscreen: false,
    allowScreenshots: true,
    allowCopyPaste: true,
    watermark: false,
    allowWebBrowser: true,
  },
  // Test obișnuit la clasă: ieșirile sunt numărate și semnalate profesorului.
  standard: {
    allowLeave: false,
    maxViolations: 3,
    onViolationLimit: "flag",
    requireFullscreen: true,
    allowScreenshots: false,
    allowCopyPaste: false,
    watermark: true,
    allowWebBrowser: true,
  },
  // Evaluare sumativă: la limita de ieșiri testul se predă automat.
  strict: {
    allowLeave: false,
    maxViolations: 2,
    onViolationLimit: "submit",
    requireFullscreen: true,
    allowScreenshots: false,
    allowCopyPaste: false,
    watermark: true,
    allowWebBrowser: true,
  },
  // Elevul are voie să iasă și să copieze — dar textul copiat conține capcana pentru AI.
  ai_trap: {
    allowLeave: true,
    maxViolations: 3,
    onViolationLimit: "flag",
    requireFullscreen: false,
    allowScreenshots: true,
    allowCopyPaste: true,
    watermark: false,
    allowWebBrowser: true,
  },
};

export function applyPreset(settings: TestSettings, preset: SecurityPreset): TestSettings {
  if (preset === "custom") return { ...settings, security: { ...settings.security, preset } };
  const next: TestSettings = {
    ...settings,
    security: { preset, ...SECURITY_PRESET_VALUES[preset] },
  };
  if (preset === "ai_trap") {
    next.aiTrap = { ...settings.aiTrap, enabled: true };
    next.aiAnalysis = { enabled: true };
  }
  return next;
}

export function defaultSettings(): TestSettings {
  return {
    grading: { mode: "grade10", thresholds: [...DEFAULT_THRESHOLDS] },
    timeLimitMinutes: 45,
    shuffleQuestions: true,
    shuffleOptions: true,
    allowBackNavigation: true,
    security: { preset: "standard", ...SECURITY_PRESET_VALUES.standard },
    aiTrap: { enabled: false, mode: "auto", hiddenText: "", keywords: [] },
    aiAnalysis: { enabled: true },
    results: { showScore: true, showCorrectAnswers: false },
  };
}
