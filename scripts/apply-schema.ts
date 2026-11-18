// Applies db/schema.sql (idempotent: creates missing tables and columns, touches no data).
// Usage: DATABASE_URL=... npm run db:schema
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const sql = postgres(url, { max: 1, prepare: false });
await sql.unsafe(readFileSync("db/schema.sql", "utf8"));
const [row] = await sql<{ rls: boolean }[]>`select relrowsecurity as rls from pg_class where relname = 'events'`;
console.log(`Schema applied. events table RLS: ${row?.rls ? "on" : "MISSING"}`);
await sql.end();
