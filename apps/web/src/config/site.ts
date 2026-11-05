/** Numele de lucru al platformei — se schimbă aici, într-un singur loc. */
export const SITE = {
  name: "Zece",
  domain: "zece.md",
};

export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
