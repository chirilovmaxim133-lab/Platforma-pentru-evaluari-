import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { attempts } from "@/lib/db/schema";
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
  const [qs, [anyAttempt]] = await Promise.all([
    loadQuestions(id),
    db.select({ id: attempts.id }).from(attempts).where(eq(attempts.testId, id)).limit(1),
  ]);

  const initial: EditorPayload = {
    title: test.title,
    description: test.description,
    subject: test.subject,
    language: test.language,
    settings: test.settings,
    questions: qs.map((q) => ({ id: q.id, prompt: q.prompt, imageUrl: q.imageUrl, points: q.points, data: q.data })),
  };

  return <TestEditor testId={id} initial={initial} status={test.status} locked={!!anyAttempt} llmAvailable={llmConfigured()} />;
}
