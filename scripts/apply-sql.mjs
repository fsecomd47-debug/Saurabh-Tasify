import postgres from "postgres";
import { readFileSync } from "node:fs";

const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const line = raw.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
const url = process.env.DATABASE_URL ?? line.slice('DATABASE_URL="'.length, -1);

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/apply-sql.mjs <path-to.sql>");
  process.exit(1);
}

const statements = readFileSync(file, "utf8")
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean);

const sql = postgres(url, { prepare: false, max: 1 });

try {
  for (const stmt of statements) {
    try {
      await sql.unsafe(stmt);
      console.log("OK:", stmt.slice(0, 72).replace(/\s+/g, " "));
    } catch (e) {
      if (/already exists/i.test(e.message) || /does not exist/i.test(e.message)) {
        console.log("SKIP:", stmt.slice(0, 72).replace(/\s+/g, " "), "->", e.message.slice(0, 60));
      } else {
        throw e;
      }
    }
  }
  console.log("APPLIED:", file);
} catch (e) {
  console.error("FAILED:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
