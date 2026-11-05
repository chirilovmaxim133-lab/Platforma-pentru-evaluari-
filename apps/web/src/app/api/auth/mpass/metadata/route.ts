import { mpassClient, mpassEnabled } from "@/lib/auth/mpass";

/** Metadatele furnizorului de servicii (SP), cerute de AGE la înregistrarea în MPass. */
export function GET() {
  if (!mpassEnabled()) return new Response("MPass is not configured", { status: 404 });
  const cert = process.env.MPASS_SP_CERT?.replace(/\\n/g, "\n") ?? null;
  const xml = mpassClient().generateServiceProviderMetadata(null, cert);
  return new Response(xml, { headers: { "Content-Type": "application/samlmetadata+xml" } });
}
