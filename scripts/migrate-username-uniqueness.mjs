/**
 * Add unique constraint on display_name (case-insensitive).
 * Run: node scripts/migrate-username-uniqueness.mjs
 */
import { readFileSync } from "fs";
import postgres from "postgres";

function loadDbUrl() {
  const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const match = env.match(/^DATABASE_URL=(.+)$/m);
  if (!match) throw new Error("DATABASE_URL not found");
  return match[1].trim().replace(/^["']|["']$/g, "");
}

const sql = postgres(loadDbUrl(), { max: 1 });

async function main() {
  // 1. Drop the old non-unique index
  console.log("Dropping old index profiles_display_name_idx...");
  await sql`DROP INDEX IF EXISTS profiles_display_name_idx`;

  // 2. Deduplicate existing names — append numeric suffix to duplicates
  //    Keep the first occurrence (lowest created_at), rename the rest.
  console.log("Deduplicating existing display names...");
  const dupes = await sql`
    SELECT p.user_id, p.display_name, p.created_at,
           ROW_NUMBER() OVER (PARTITION BY lower(p.display_name) ORDER BY p.created_at ASC) AS rn
    FROM profiles p
  `;

  let renamed = 0;
  for (const row of dupes) {
    if (row.rn > 1) {
      const newName = `${row.display_name}_${row.rn}`;
      await sql`UPDATE profiles SET display_name = ${newName} WHERE user_id = ${row.user_id}`;
      console.log(`  Renamed "${row.display_name}" → "${newName}" (${row.user_id})`);
      renamed++;
    }
  }
  console.log(`  Renamed ${renamed} duplicate accounts.`);

  // 3. Create unique case-insensitive index
  console.log("Creating unique index profiles_display_name_lower_uniq...");
  await sql`CREATE UNIQUE INDEX profiles_display_name_lower_uniq ON profiles (lower(display_name))`;

  // 4. Verify
  const idx = await SQL_CHECK_INDEX();
  console.log(`\nDone. Index status:`, idx);

  await sql.end();
}

async function SQL_CHECK_INDEX() {
  // Just query to confirm the index exists
  const result = await sql`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'profiles' AND indexname = 'profiles_display_name_lower_uniq'
  `;
  return result.length > 0 ? "✓ Created" : "✗ Failed";
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
