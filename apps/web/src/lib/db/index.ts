import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "postgres://postgres@localhost:5432/evaluari";

// Un singur pool per proces; în dezvoltare supraviețuiește reîncărcărilor de modul.
const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };

const client =
  globalForDb.pg ??
  postgres(url, {
    max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
    idle_timeout: 20,
    // Necesar când baza de date stă în spatele unui PgBouncer în mod "transaction".
    prepare: process.env.DATABASE_PGBOUNCER === "true" ? false : true,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema });
export { schema };
