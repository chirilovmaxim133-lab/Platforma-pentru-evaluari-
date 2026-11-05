/**
 * Date demonstrative pentru dezvoltare locală: școli demo, un profesor, trei elevi și două teste.
 * Nu rulați în producție.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { hash } from "@node-rs/argon2";
import * as schema from "./schema";
import { applyPreset, defaultSettings } from "../tests/presets";
import type { EditorQuestion } from "../tests/types";

if (process.env.NODE_ENV === "production") {
  console.error("Seed is for local development only.");
  process.exit(1);
}

const client = postgres(process.env.DATABASE_URL ?? "postgres://postgres@localhost:5432/evaluari", { max: 1 });
const db = drizzle(client, { schema });
const PASSWORD = "Demo12345";

const schoolsData = [
  { name: "Liceul Teoretic Demo nr. 1", locality: "Chișinău", district: "mun. Chișinău", kind: "liceu" as const },
  { name: "Gimnaziul Demo nr. 2", locality: "Bălți", district: "mun. Bălți", kind: "gimnaziu" as const },
  { name: "Liceul Teoretic Demo nr. 3", locality: "Cahul", district: "r. Cahul", kind: "liceu" as const },
  { name: "Gimnaziul Demo nr. 4", locality: "Orhei", district: "r. Orhei", kind: "gimnaziu" as const },
  { name: "Теоретический лицей Демо № 5", locality: "Comrat", district: "UTA Găgăuzia", kind: "liceu" as const },
];

const id = () => crypto.randomUUID();

const geometry: EditorQuestion[] = [
  {
    id: id(),
    prompt: "Care este aria unui cerc cu raza $r = 3$ cm? (Folosește formula $A = \\pi r^2$.)",
    imageUrl: null,
    points: 2,
    data: { type: "single", options: [{ id: "a", text: "$6\\pi$ cm²" }, { id: "b", text: "$9\\pi$ cm²" }, { id: "c", text: "$3\\pi$ cm²" }, { id: "d", text: "$12\\pi$ cm²" }], correctIds: ["b"] },
  },
  {
    id: id(),
    prompt: "Care dintre următoarele sunt numere prime?",
    imageUrl: null,
    points: 2,
    data: { type: "multiple", options: [{ id: "a", text: "2" }, { id: "b", text: "9" }, { id: "c", text: "13" }, { id: "d", text: "21" }, { id: "e", text: "29" }], correctIds: ["a", "c", "e"], partialCredit: true },
  },
  {
    id: id(),
    prompt: "Suma unghiurilor unui triunghi este $180^\\circ$.",
    imageUrl: null,
    points: 1,
    data: { type: "truefalse", correct: true },
  },
  {
    id: id(),
    prompt: "Cum se numește segmentul care unește centrul cercului cu un punct de pe cerc?",
    imageUrl: null,
    points: 1,
    data: { type: "short", accepted: ["raza", "rază"], caseSensitive: false, ignoreDiacritics: true },
  },
  {
    id: id(),
    prompt: "Calculează: $\\frac{3}{4} + \\frac{1}{4} \\times 2$. Scrie rezultatul ca număr zecimal.",
    imageUrl: null,
    points: 2,
    data: { type: "number", value: 1.25, tolerance: 0 },
  },
  {
    id: id(),
    prompt: "Explică, în 5–7 propoziții, unde întâlnești cercul în viața de zi cu zi și de ce această formă este atât de des folosită.",
    imageUrl: null,
    points: 4,
    data: { type: "long", minWords: 40, maxWords: 150, rubric: "2 p. — cel puțin trei exemple concrete; 1 p. — explicația proprietăților cercului; 1 p. — exprimare corectă." },
  },
];

const biology: EditorQuestion[] = [
  {
    id: id(),
    prompt: "Где в клетке растения происходит фотосинтез?",
    imageUrl: null,
    points: 1,
    data: { type: "short", accepted: ["в хлоропластах", "хлоропласты", "хлоропласт"], caseSensitive: false, ignoreDiacritics: true },
  },
  {
    id: id(),
    prompt: "Объясните своими словами, почему осенью листья меняют цвет.",
    imageUrl: null,
    points: 5,
    data: { type: "long", minWords: 50, maxWords: 200, rubric: "2 б. — роль хлорофилла; 2 б. — другие пигменты; 1 б. — связь с погодой и светом." },
  },
];

async function main() {
  await db.delete(schema.attemptEvents);
  await db.delete(schema.attempts);
  await db.delete(schema.questions);
  await db.delete(schema.tests);
  await db.delete(schema.sessions);
  await db.delete(schema.users);
  await db.delete(schema.schools);

  const schools = await db.insert(schema.schools).values(schoolsData).returning();
  const passwordHash = await hash(PASSWORD, { memoryCost: 19456, timeCost: 2, parallelism: 1 });

  const [teacher] = await db
    .insert(schema.users)
    .values({
      role: "teacher",
      email: "profesor@demo.md",
      passwordHash,
      firstName: "Elena",
      lastName: "Munteanu",
      schoolId: schools[0].id,
      schoolName: schools[0].name,
      teacherVerified: true,
      locale: "ro",
    })
    .returning();

  const students = [
    ["elev1@demo.md", "Andrei", "Ciobanu"],
    ["elev2@demo.md", "Ana", "Rusu"],
    ["elev3@demo.md", "Mihai", "Popa"],
  ];
  for (const [email, firstName, lastName] of students) {
    await db.insert(schema.users).values({
      role: "student",
      email,
      passwordHash,
      firstName,
      lastName,
      schoolId: schools[0].id,
      schoolName: schools[0].name,
      className: "8A",
      locale: "ro",
    });
  }

  const standard = { ...defaultSettings(), aiTrap: { enabled: true, mode: "auto" as const, hiddenText: "", keywords: [] } };
  const trapSettings = applyPreset({ ...defaultSettings(), timeLimitMinutes: 30 }, "ai_trap");

  const make = async (title: string, subject: string, language: "ro" | "ru", code: string, settings: schema.Test["settings"], qs: EditorQuestion[]) => {
    const [test] = await db
      .insert(schema.tests)
      .values({ ownerId: teacher.id, title, subject, language, status: "published", accessCode: code, settings, publishedAt: new Date() })
      .returning();
    await db.insert(schema.questions).values(
      qs.map((q, position) => ({ id: q.id, testId: test.id, position, type: q.data.type, prompt: q.prompt, imageUrl: q.imageUrl, points: q.points, data: q.data })),
    );
    return test;
  };

  await make("Geometrie: cercul și aria", "Matematică", "ro", "GEM8AB", standard, geometry);
  await make("Фотосинтез и цвет листьев", "Биология", "ru", "BTR7RU", trapSettings, biology);

  const [check] = await db.select().from(schema.users).where(eq(schema.users.email, "profesor@demo.md"));
  console.log(`Seeded. Teacher: ${check.email} / ${PASSWORD}. Students: elev1..3@demo.md / ${PASSWORD}. Test codes: GEM8AB, BTR7RU`);
}

await main();
await client.end();
