import {
  type AnyPgColumn,
  bigserial,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { AnswerValue, QuestionData, QuestionType, TestSettings } from "@/lib/tests/types";
import type { AiReport, WritingTelemetry } from "@/lib/ai/types";

export type Role = "student" | "teacher" | "admin";
export type Locale = "ro" | "ru";
export type Plan = "free" | "school" | "district";

/** Instituții de învățământ (gimnazii, licee, școli). Abonamentele se leagă de școală. */
export const schools = pgTable(
  "schools",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    locality: text("locality").notNull(),
    district: text("district").notNull(),
    kind: text("kind").$type<"primara" | "gimnaziu" | "liceu" | "profesionala">().notNull(),
    plan: text("plan").$type<Plan>().notNull().default("free"),
    planExpiresAt: timestamp("plan_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("schools_name_idx").on(t.name)],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    role: text("role").$type<Role>().notNull(),
    email: text("email"),
    passwordHash: text("password_hash"),
    /** HMAC al identificatorului MPass — nu stocăm IDNP-ul în clar. */
    mpassSubject: text("mpass_subject"),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    schoolId: uuid("school_id").references(() => schools.id, { onDelete: "set null" }),
    /** Numele școlii, așa cum l-a scris utilizatorul (dacă nu e încă în registru). */
    schoolName: text("school_name"),
    className: text("class_name"),
    locale: text("locale").$type<Locale>().notNull().default("ro"),
    teacherVerified: boolean("teacher_verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_idx").on(t.email),
    uniqueIndex("users_mpass_idx").on(t.mpassSubject),
    index("users_school_idx").on(t.schoolId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 al tokenului din cookie — tokenul brut nu ajunge în baza de date. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/** Clasa creată de profesor (ex. „8A · Matematică”). Elevii intră cu codul clasei. */
export const classes = pgTable(
  "classes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    schoolId: uuid("school_id").references(() => schools.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    subject: text("subject").notNull().default(""),
    gradeLevel: integer("grade_level"),
    joinCode: text("join_code").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("classes_code_idx").on(t.joinCode), index("classes_owner_idx").on(t.ownerId)],
);

export const classMembers = pgTable(
  "class_members",
  {
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.classId, t.studentId] }), index("class_members_student_idx").on(t.studentId)],
);

export const tests = pgTable(
  "tests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    subject: text("subject").notNull().default(""),
    language: text("language").$type<Locale>().notNull().default("ro"),
    /** Testul aparține unei clase: îl pot susține doar elevii ei, iar notele intră în media clasei. */
    classId: uuid("class_id").references((): AnyPgColumn => classes.id, { onDelete: "set null" }),
    status: text("status").$type<"draft" | "published" | "closed">().notNull().default("draft"),
    accessCode: text("access_code"),
    settings: jsonb("settings").$type<TestSettings>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("tests_code_idx").on(t.accessCode),
    index("tests_owner_idx").on(t.ownerId),
    index("tests_class_idx").on(t.classId),
  ],
);

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey(),
    testId: uuid("test_id")
      .notNull()
      .references(() => tests.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    type: text("type").$type<QuestionType>().notNull(),
    prompt: text("prompt").notNull(),
    imageUrl: text("image_url"),
    points: doublePrecision("points").notNull().default(1),
    /** Configurația specifică tipului, inclusiv răspunsurile corecte. Nu se trimite niciodată elevului. */
    data: jsonb("data").$type<QuestionData>().notNull(),
  },
  (t) => [index("questions_test_idx").on(t.testId, t.position)],
);

export const attempts = pgTable(
  "attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    testId: uuid("test_id")
      .notNull()
      .references(() => tests.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").$type<"in_progress" | "submitted">().notNull().default("in_progress"),
    submitReason: text("submit_reason").$type<"student" | "timeout" | "violations" | "teacher">(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    deadlineAt: timestamp("deadline_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    /** "web" sau "app" — de unde a fost susținut testul. */
    client: text("client").$type<"web" | "app">().notNull().default("web"),
    questionOrder: jsonb("question_order").$type<string[]>().notNull(),
    optionOrder: jsonb("option_order").$type<Record<string, string[]>>().notNull(),
    answers: jsonb("answers").$type<Record<string, AnswerValue>>().notNull().default({}),
    telemetry: jsonb("telemetry").$type<Record<string, WritingTelemetry>>().notNull().default({}),
    violationCount: integer("violation_count").notNull().default(0),
    /** Cuvântul-capcană unic al acestui elev (capcana AI automată). */
    canary: text("canary"),
    autoScores: jsonb("auto_scores").$type<Record<string, number>>().notNull().default({}),
    manualScores: jsonb("manual_scores").$type<Record<string, number>>().notNull().default({}),
    score: doublePrecision("score"),
    maxScore: doublePrecision("max_score"),
    percent: doublePrecision("percent"),
    grade: integer("grade"),
    gradingComplete: boolean("grading_complete").notNull().default(false),
    aiReport: jsonb("ai_report").$type<AiReport>(),
  },
  (t) => [
    uniqueIndex("attempts_test_student_idx").on(t.testId, t.studentId),
    index("attempts_student_idx").on(t.studentId),
  ],
);

/** Jurnalul de evenimente: ieșiri din test, încercări de copiere, capturi de ecran etc. */
export const attemptEvents = pgTable(
  "attempt_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    counted: boolean("counted").notNull().default(false),
    detail: jsonb("detail").$type<Record<string, unknown>>(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("attempt_events_attempt_idx").on(t.attemptId, t.at)],
);

export const uploads = pgTable("uploads", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Test = typeof tests.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Attempt = typeof attempts.$inferSelect;
export type AttemptEvent = typeof attemptEvents.$inferSelect;
export type School = typeof schools.$inferSelect;
export type Class = typeof classes.$inferSelect;
