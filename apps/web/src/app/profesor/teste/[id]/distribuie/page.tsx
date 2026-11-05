import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { attempts } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { appUrl } from "@/config/site";
import { getOwnedTest } from "@/lib/tests/service";
import { ShareView } from "./ShareView";

export default async function SharePage({ params }: PageProps<"/profesor/teste/[id]/distribuie">) {
  const { id } = await params;
  const user = await requireUser("teacher");
  const test = await getOwnedTest(id, user);
  if (!test) notFound();

  const url = test.accessCode ? `${appUrl()}/t/${test.accessCode}` : null;
  const qrSvg = url
    ? await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#14182b", light: "#ffffff" } })
    : null;
  const [counts] = await db
    .select({
      joined: sql<number>`count(*)::int`,
      inProgress: sql<number>`count(*) filter (where ${attempts.status} = 'in_progress')::int`,
      submitted: sql<number>`count(*) filter (where ${attempts.status} = 'submitted')::int`,
    })
    .from(attempts)
    .where(eq(attempts.testId, id));

  return (
    <ShareView
      testId={id}
      title={test.title}
      status={test.status}
      code={test.accessCode}
      url={url}
      host={appUrl().replace(/^https?:\/\//, "")}
      qrSvg={qrSvg}
      initialCounts={counts}
    />
  );
}
