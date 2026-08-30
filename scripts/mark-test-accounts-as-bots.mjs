/**
 * Mark @test.local accounts as bots so they don't appear on the leaderboard.
 * Run: node scripts/mark-test-accounts-as-bots.mjs
 */
import { readFileSync } from "fs";
import postgres from "postgres";

function loadDbUrl() {
  const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const match = env.match(/^DATABASE_URL=(.+)$/m);
  if (!match) throw new Error("DATABASE_URL not found in .env.local");
  return match[1].trim().replace(/^["']|["']$/g, "");
}

const sql = postgres(loadDbUrl(), { max: 1 });

async function main() {
  // Find non-bot accounts with @test.local emails
  const candidates = await sql`
    SELECT u.id, u.email, u.is_bot
    FROM users u
    WHERE u.is_bot = false AND u.email ILIKE '%@test.local'
  `;

  if (candidates.length === 0) {
    console.log("No @test.local accounts found.");
    await sql.end();
    return;
  }

  console.log(`Found ${candidates.length} @test.local accounts:`);
  for (const c of candidates) {
    console.log(`  - ${c.email}`);
  }

  const result = await sql`
    UPDATE users
    SET is_bot = true
    WHERE is_bot = false AND email ILIKE '%@test.local'
    RETURNING id, email
  `;

  console.log(`\nMarked ${result.length} accounts as bots.`);
  await sql.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
