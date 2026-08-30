/* DB connectivity check — run: node scripts/check-db.mjs */
import { readFileSync } from "node:fs";
import postgres from "postgres";

let url = process.env.DATABASE_URL;
if (!url) {
  try {
    const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    const line = raw.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
    if (line) {
      url = line.slice('DATABASE_URL="'.length, -1);
    }
  } catch {
    // .env.local not readable — rely on process.env
  }
}
if (!url) {
  console.error("No DATABASE_URL found in environment or .env.local");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1 });
try {
  const [{ version }] = await sql`select version()`;
  console.log("CONNECTED:", version.split(",")[0]);
  const tables = await sql`
    select table_name from information_schema.tables
    where table_schema = 'public' order by table_name`;
  console.log("TABLES(", tables.length, "):", tables.map((t) => t.table_name).join(", ") || "(none)");
} catch (e) {
  console.error("FAILED:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
