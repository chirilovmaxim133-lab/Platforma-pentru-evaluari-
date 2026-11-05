/** Numele de lucru al platformei — se schimbă aici, într-un singur loc. */
export const SITE = {
  name: "Zece",
  domain: "zece.md",
};

export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Cookie-urile „Secure” și antetele stricte se activează când platforma rulează pe HTTPS.
 * Pe http (calculatorul propriu, rețeaua de acasă) autentificarea funcționează în continuare.
 */
export function isHttps(): boolean {
  return appUrl().startsWith("https://");
}
