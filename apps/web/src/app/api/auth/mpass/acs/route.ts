import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { mpassClient, mpassEnabled, mpassIdentity } from "@/lib/auth/mpass";
import { hmac, signPayload } from "@/lib/auth/crypto";
import { createSession, homeFor } from "@/lib/auth/session";
import { MPASS_PENDING_COOKIE } from "@/lib/auth/mpass-pending";

/** Adresa la care MPass trimite răspunsul SAML (HTTP-POST). */
export async function POST(req: NextRequest) {
  if (!mpassEnabled()) return NextResponse.redirect(new URL("/autentificare", req.url), 303);
  const form = await req.formData();
  const SAMLResponse = String(form.get("SAMLResponse") ?? "");
  const relay = String(form.get("RelayState") ?? "");

  try {
    const { profile } = await mpassClient().validatePostResponseAsync({ SAMLResponse });
    if (!profile?.nameID) throw new Error("missing NameID");
    const identity = mpassIdentity(profile);
    // Nu păstrăm IDNP-ul: doar o amprentă HMAC, suficientă pentru a recunoaște același cont.
    const subject = hmac(`mpass:${identity.nameId}`);

    const [user] = await db.select().from(users).where(eq(users.mpassSubject, subject)).limit(1);
    if (user) {
      await createSession(user.id);
      const target = relay.startsWith("/") && !relay.startsWith("//") ? relay : homeFor(user.role);
      return NextResponse.redirect(new URL(target, req.url), 303);
    }

    const res = NextResponse.redirect(new URL("/inregistrare?mpass=1", req.url), 303);
    res.cookies.set(
      MPASS_PENDING_COOKIE,
      signPayload({ subject, firstName: identity.firstName, lastName: identity.lastName }, 15 * 60),
      { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 15 * 60 },
    );
    return res;
  } catch (err) {
    console.error("MPass login failed", err);
    return NextResponse.redirect(new URL("/autentificare?error=mpass", req.url), 303);
  }
}
