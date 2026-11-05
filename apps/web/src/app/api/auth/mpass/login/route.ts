import { NextResponse, type NextRequest } from "next/server";
import { mpassClient, mpassEnabled } from "@/lib/auth/mpass";

export async function GET(req: NextRequest) {
  if (!mpassEnabled()) return NextResponse.redirect(new URL("/autentificare", req.url));
  const next = req.nextUrl.searchParams.get("next") ?? "";
  const relayState = next.startsWith("/") && !next.startsWith("//") ? next : "";
  const url = await mpassClient().getAuthorizeUrlAsync(relayState, req.nextUrl.host, {});
  return NextResponse.redirect(url);
}
