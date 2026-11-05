import { z } from "zod";

export const QUESTION_TYPES = ["single", "multiple", "truefalse", "short", "number", "long"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const LOCALES = ["ro", "ru"] as const;

const optionSchema = z.object({
  id: z.string().min(1).max(40),
  text: z.string().max(2000),
});
export type QuestionOption = z.infer<typeof optionSchema>;

export const questionDataSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("single"),
    options: z.array(optionSchema).min(2).max(12),
    correctIds: z.array(z.string()).max(1),
  }),
  z.object({
    type: z.literal("multiple"),
    options: z.array(optionSchema).min(2).max(12),
    correctIds: z.array(z.string()).max(12),
    partialCredit: z.boolean(),
  }),
  z.object({
    type: z.literal("truefalse"),
    correct: z.boolean(),
  }),
  z.object({
    type: z.literal("short"),
    accepted: z.array(z.string().max(200)).max(20),
    caseSensitive: z.boolean(),
    ignoreDiacritics: z.boolean(),
  }),
  z.object({
    type: z.literal("number"),
    value: z.number(),
    tolerance: z.number().min(0),
  }),
  z.object({
    type: z.literal("long"),
    minWords: z.number().int().min(0).max(5000).nullable(),
    maxWords: z.number().int().min(1).max(5000).nullable(),
    rubric: z.string().max(4000),
  }),
]);
export type QuestionData = z.infer<typeof questionDataSchema>;

/** Răspunsul unui elev: id-ul variantei, lista de id-uri, adevărat/fals sau text. */
export type AnswerValue = string | string[] | boolean | null;

export const editorQuestionSchema = z.object({
  id: z.uuid(),
  prompt: z.string().max(10000),
  imageUrl: z.string().max(500).nullable(),
  points: z.number().min(0).max(1000),
  data: questionDataSchema,
});
export type EditorQuestion = z.infer<typeof editorQuestionSchema>;

export const SECURITY_PRESETS = ["practice", "standard", "strict", "ai_trap", "custom"] as const;
export type SecurityPreset = (typeof SECURITY_PRESETS)[number];

export const testSettingsSchema = z.object({
  grading: z.object({
    mode: z.enum(["grade10", "percent"]),
    /** Pragul minim (în %) pentru notele 2, 3, …, 10. Sub primul prag elevul primește nota 1. */
    thresholds: z
      .array(z.number().min(0).max(100))
      .length(9)
      .refine((t) => t.every((v, i) => i === 0 || v >= t[i - 1]), "thresholds must be ascending"),
  }),
  timeLimitMinutes: z.number().int().min(1).max(600).nullable(),
  shuffleQuestions: z.boolean(),
  shuffleOptions: z.boolean(),
  allowBackNavigation: z.boolean(),
  security: z.object({
    preset: z.enum(SECURITY_PRESETS),
    /** Elevul poate ieși din test (alt tab, altă aplicație) fără penalizare. */
    allowLeave: z.boolean(),
    maxViolations: z.number().int().min(1).max(20),
    /** Ce se întâmplă când elevul atinge limita de ieșiri: testul se predă automat sau doar se semnalează. */
    onViolationLimit: z.enum(["submit", "flag"]),
    requireFullscreen: z.boolean(),
    allowScreenshots: z.boolean(),
    allowCopyPaste: z.boolean(),
    watermark: z.boolean(),
    /** Dacă e fals, testul poate fi susținut doar din aplicația mobilă securizată. */
    allowWebBrowser: z.boolean(),
  }),
  aiTrap: z.object({
    enabled: z.boolean(),
    /** auto: platforma generează pentru fiecare elev un cuvânt-capcană unic. custom: textul profesorului. */
    mode: z.enum(["auto", "custom"]),
    hiddenText: z.string().max(1000),
    keywords: z.array(z.string().max(60)).max(20),
  }),
  aiAnalysis: z.object({
    enabled: z.boolean(),
  }),
  results: z.object({
    showScore: z.boolean(),
    showCorrectAnswers: z.boolean(),
  }),
});
export type TestSettings = z.infer<typeof testSettingsSchema>;

export const editorPayloadSchema = z.object({
  title: z.string().max(200),
  description: z.string().max(5000),
  subject: z.string().max(100),
  language: z.enum(LOCALES),
  classId: z.uuid().nullable(),
  questions: z.array(editorQuestionSchema).max(200),
  settings: testSettingsSchema,
});
export type EditorPayload = z.infer<typeof editorPayloadSchema>;
