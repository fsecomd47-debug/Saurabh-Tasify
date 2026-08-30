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
  const rows = await sql`
    SELECT u.id, u.email, u.is_bot, p.display_name, p.avatar_id, w.balance, pp.xp
    FROM users u
    JOIN profiles p ON p.user_id = u.id
    LEFT JOIN wallets w ON w.user_id = u.id
    LEFT JOIN player_progress pp ON pp.user_id = u.id
    WHERE u.is_bot = false
    ORDER BY w.balance DESC
  `;
  for (const r of rows) {
    console.log(`  ${r.display_name} | ${r.email} | balance=${r.balance} | xp=${r.xp} | id=${r.id}`);
  }
  await sql.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
