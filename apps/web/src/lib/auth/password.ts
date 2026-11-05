import { hash, verify } from "@node-rs/argon2";

// Argon2id rulează în afara firului principal, deci multe autentificări simultane nu blochează serverul.
export function hashPassword(password: string): Promise<string> {
  return hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
}

export async function verifyPassword(stored: string, password: string): Promise<boolean> {
  try {
    return await verify(stored, password);
  } catch {
    return false;
  }
}
