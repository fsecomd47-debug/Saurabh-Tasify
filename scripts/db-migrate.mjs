/* Apply Drizzle migrations — run: npm run db:migrate */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { readFileSync } from "node:fs";

const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const line = raw.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
const url = process.env.DATABASE_URL ?? line.slice('DATABASE_URL="'.length, -1);

const sql = postgres(url, { prepare: false, max: 1 });
const db = drizzle(sql, {});

try {
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("MIGRATIONS APPLIED");
  const tables = await sql`select table_name from information_schema.tables where table_schema='public' order by table_name`;
  console.log("TABLES(", tables.length, "):", tables.map((t) => t.table_name).join(", "));
} catch (e) {
  console.error("MIGRATION FAILED:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
