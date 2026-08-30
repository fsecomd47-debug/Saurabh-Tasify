/**
 * Delete duplicate/incomplete accounts, keep only fsecomd47@gmail.com (588 ST).
 * Run: node scripts/cleanup-duplicate-accounts.mjs
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
  // The account to KEEP
  const keepEmail = "fsecomd47@gmail.com";

  // Find all non-bot user IDs
  const allUsers = await sql`
    SELECT id, email FROM users WHERE is_bot = false
  `;

  const keepUser = allUsers.find((u) => u.email === keepEmail);
  if (!keepUser) {
    console.error(`Keep account ${keepEmail} not found!`);
    await sql.end();
    process.exit(1);
  }

  const deleteUsers = allUsers.filter((u) => u.id !== keepUser.id);
  console.log(`Keeping: ${keepUser.email} (${keepUser.id})`);
  console.log(`Deleting ${deleteUsers.length} accounts:`);

  for (const u of deleteUsers) {
    console.log(`  - ${u.email} (${u.id})`);

    // Delete dependent data in correct order (respect FK constraints)
    // 1. Sessions
    await sql`DELETE FROM sessions WHERE user_id = ${u.id}`;
    // 2. Wallet transactions
    await sql`DELETE FROM wallet_transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id = ${u.id})`;
    // 3. Wallets
    await sql`DELETE FROM wallets WHERE user_id = ${u.id}`;
    // 4. Player progress
    await sql`DELETE FROM player_progress WHERE user_id = ${u.id}`;
    // 5. Streaks
    await sql`DELETE FROM streaks WHERE user_id = ${u.id}`;
    // 6. Inventory
    await sql`DELETE FROM inventory WHERE user_id = ${u.id}`;
    // 7. Pet ownerships + mining
    await sql`DELETE FROM pet_mining_settlements WHERE user_id = ${u.id}`;
    await sql`DELETE FROM pet_ownerships WHERE user_id = ${u.id}`;
    // 8. Player achievements
    await sql`DELETE FROM player_achievements WHERE user_id = ${u.id}`;
    // 9. Quest progress
    await sql`DELETE FROM quest_progress WHERE user_id = ${u.id}`;
    // 10. Daily rewards
    await sql`DELETE FROM daily_reward_claims WHERE user_id = ${u.id}`;
    await sql`DELETE FROM daily_rewards WHERE user_id = ${u.id}`;
    // 11. Activity events
    await sql`DELETE FROM activity_events WHERE user_id = ${u.id}`;
    // 12. Onboarding
    await sql`DELETE FROM onboarding_profiles WHERE user_id = ${u.id}`;
    // 13. Profiles
    await sql`DELETE FROM profiles WHERE user_id = ${u.id}`;
    // 14. Active boosts
    await sql`DELETE FROM active_boosts WHERE user_id = ${u.id}`;
    // 15. Wishlists
    await sql`DELETE FROM wishlists WHERE user_id = ${u.id}`;
    // 16. User row last
    await sql`DELETE FROM users WHERE id = ${u.id}`;

    console.log(`    ✓ Deleted`);
  }

  console.log(`\nDone. Only ${keepEmail} remains.`);
  await sql.end();
}

main().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
