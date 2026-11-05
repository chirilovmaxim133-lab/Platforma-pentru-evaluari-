import { SAML, type Profile } from "@node-saml/node-saml";
import { appUrl } from "@/config/site";

/**
 * Autentificare prin MPass (serviciul guvernamental de autentificare, SAML 2.0).
 * Rămâne oprită până când platforma primește de la AGE datele de integrare
 * (adresele MPass, certificatul MPass și înregistrarea certificatului nostru).
 */
export function mpassEnabled(): boolean {
  return (
    process.env.MPASS_ENABLED === "true" &&
    !!process.env.MPASS_ENTRY_POINT &&
    !!process.env.MPASS_ISSUER &&
    !!process.env.MPASS_IDP_CERT
  );
}

const pem = (v: string) => v.replace(/\\n/g, "\n");

export function mpassClient(): SAML {
  const privateKey = process.env.MPASS_SP_PRIVATE_KEY;
  return new SAML({
    entryPoint: process.env.MPASS_ENTRY_POINT,
    logoutUrl: process.env.MPASS_LOGOUT_URL || process.env.MPASS_ENTRY_POINT,
    issuer: process.env.MPASS_ISSUER!,
    callbackUrl: `${appUrl()}/api/auth/mpass/acs`,
    idpCert: pem(process.env.MPASS_IDP_CERT!),
    ...(privateKey
      ? {
          privateKey: pem(privateKey),
          publicCert: process.env.MPASS_SP_CERT ? pem(process.env.MPASS_SP_CERT) : undefined,
          signatureAlgorithm: "sha256" as const,
          digestAlgorithm: "sha256",
        }
      : {}),
    wantAssertionsSigned: true,
    acceptedClockSkewMs: 30_000,
    disableRequestedAuthnContext: true,
  });
}

/** Numele vin ca atribute SAML; denumirile exacte se confirmă la integrare, așa că le căutăm tolerant. */
function attribute(profile: Profile, patterns: RegExp[]): string {
  for (const [key, value] of Object.entries(profile)) {
    const short = key.split(/[/:#]/).pop() ?? key;
    if (patterns.some((p) => p.test(short)) && typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function mpassIdentity(profile: Profile) {
  return {
    nameId: profile.nameID,
    firstName: attribute(profile, [/^firstname$/i, /^givenname$/i, /^first_name$/i]),
    lastName: attribute(profile, [/^lastname$/i, /^surname$/i, /^familyname$/i, /^last_name$/i]),
  };
}
