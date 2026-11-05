import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { attempts, classes } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { llmConfigured } from "@/lib/ai/llm";
import { getOwnedTest, loadQuestions } from "@/lib/tests/service";
import type { EditorPayload } from "@/lib/tests/types";
import { TestEditor } from "./TestEditor";

export default async function EditTestPage({ params }: PageProps<"/profesor/teste/[id]">) {
  const { id } = await params;
  const user = await requireUser("teacher");
  const test = await getOwnedTest(id, user);
  if (!test) notFound();
  const [qs, [anyAttempt], myClasses] = await Promise.all([
    loadQuestions(id),
    db.select({ id: attempts.id }).from(attempts).where(eq(attempts.testId, id)).limit(1),
    db.select({ id: classes.id, name: classes.name, subject: classes.subject }).from(classes).where(eq(classes.ownerId, test.ownerId)).orderBy(asc(classes.name)),
  ]);

  const initial: EditorPayload = {
    title: test.title,
    description: test.description,
    subject: test.subject,
    language: test.language,
    classId: test.classId,
    settings: test.settings,
    questions: qs.map((q) => ({ id: q.id, prompt: q.prompt, imageUrl: q.imageUrl, points: q.points, data: q.data })),
  };

  return (
    <TestEditor
      testId={id}
      initial={initial}
      status={test.status}
      locked={!!anyAttempt}
      llmAvailable={llmConfigured()}
      classes={myClasses}
    />
  );
}
