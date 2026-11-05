/** Profilul MPass păstrat temporar (cookie semnat) până când utilizatorul își finalizează înregistrarea. */
export type MpassPending = { subject: string; firstName: string; lastName: string };
export const MPASS_PENDING_COOKIE = "mpass_pending";
