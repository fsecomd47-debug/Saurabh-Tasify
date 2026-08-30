import postgres from "postgres";
import { readFileSync } from "node:fs";

const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const line = raw.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
const url = line.slice('DATABASE_URL="'.length, -1);

const sql = postgres(url, { prepare: false, max: 1 });
try {
  await sql`ALTER TYPE mission_status ADD VALUE IF NOT EXISTS 'settled'`;
  console.log("SUCCESS: Added 'settled' to mission_status enum");
} catch (e) {
  console.error("ERROR:", e.message);
} finally {
  await sql.end();
}
