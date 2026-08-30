/* Seed bot rivals so the leaderboard feels alive. Run: npm run db:seed */
import postgres from "postgres";
import { readFileSync } from "node:fs";

const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const line = raw.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
const url = process.env.DATABASE_URL ?? line.slice('DATABASE_URL="'.length, -1);

const sql = postgres(url, { prepare: false, max: 1 });

const BOTS = [
  { email: "bot-alex@saurabhtask.local", name: "AlexRival", avatar: "avatar-tiger", balance: 48200, xp: 14200, streak: 12 },
  { email: "bot-priya@saurabhtask.local", name: "Priya", avatar: "avatar-wizard", balance: 31750, xp: 9800, streak: 21 },
  { email: "bot-marcus@saurabhtask.local", name: "Marcus", avatar: "avatar-ninja", balance: 22400, xp: 6300, streak: 5 },
  { email: "bot-elena@saurabhtask.local", name: "Elena", avatar: "avatar-fire", balance: 15900, xp: 3600, streak: 3 },
  { email: "bot-dev@saurabhtask.local", name: "Devon", avatar: "avatar-dev", balance: 8600, xp: 1300, streak: 2 },
  { email: "bot-zoe@saurabhtask.local", name: "Zoe", avatar: "avatar-star", balance: 4100, xp: 500, streak: 1 },
  { email: "bot-kofi@saurabhtask.local", name: "Kofi", avatar: "avatar-rocket", balance: 1250, xp: 250, streak: 0 },
];

const FEATURE_FLAGS = [
  { key: "MISSION_VERIFICATION_ENABLED", enabled: true, rolloutPct: 100 },
  { key: "FOCUS_VERIFICATION_ENABLED", enabled: true, rolloutPct: 100 },
  { key: "POSE_VERIFICATION_ENABLED", enabled: true, rolloutPct: 100 },
  { key: "AI_ANALYSIS_ENABLED", enabled: true, rolloutPct: 100 },
  { key: "ANTI_ABUSE_ENABLED", enabled: true, rolloutPct: 100 },
];

try {
  // Seed feature flags
  for (const flag of FEATURE_FLAGS) {
    await sql`
      insert into feature_flags (key, enabled, rollout_pct)
      values (${flag.key}, ${flag.enabled}, ${flag.rolloutPct})
      on conflict (key) do update set enabled = ${flag.enabled}, rollout_pct = ${flag.rolloutPct}`;
    console.log("seeded flag:", flag.key);
  }

  for (const b of BOTS) {
    const [u] = await sql`
      insert into users (email, password_hash, is_bot, email_verified_at)
      values (${b.email}, '!', true, now())
      on conflict do nothing
      returning id`;
    if (!u) continue;
    await sql`insert into profiles (user_id, display_name, avatar_id) values (${u.id}, ${b.name}, ${b.avatar})`;
    await sql`insert into wallets (user_id, balance, lifetime_earned) values (${u.id}, ${b.balance}, ${b.balance})`;
    await sql`insert into player_progress (user_id, xp, level) values (${u.id}, ${b.xp}, 1)`;
    await sql`insert into streaks (user_id, current, best) values (${u.id}, ${b.streak}, ${b.streak})`;
    await sql`insert into onboarding_profiles (user_id, completed, completed_at) values (${u.id}, true, now())`;
    console.log("seeded:", b.name);
  }
  console.log("SEED DONE");
} catch (e) {
  console.error("SEED FAILED:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
