import postgres from "postgres";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnvFile() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch (e) { console.error("Failed to load .env.local:", e.message); }
}
loadEnvFile();

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL is not set"); process.exit(1); }
console.log("Connecting to:", url.substring(0, 50) + "...");
const sql = postgres(url);

async function run() {
  // Check if table already exists
  const exists = await sql`SELECT EXISTS (
    SELECT FROM information_schema.tables WHERE table_name = 'daily_rewards'
  ) as exists`;

  if (exists[0]?.exists) {
    console.log("daily_rewards table already exists, skipping.");
    await sql.end();
    return;
  }

  await sql.unsafe(`
    CREATE TABLE "daily_reward_claims" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" uuid NOT NULL,
      "day" integer NOT NULL,
      "cycle_day" integer NOT NULL,
      "st_amount" integer NOT NULL,
      "xp_amount" integer NOT NULL,
      "streak_bonus" boolean DEFAULT false NOT NULL,
      "wallet_transaction_id" uuid,
      "claimed_at" timestamp with time zone DEFAULT now() NOT NULL
    );
    CREATE TABLE "daily_rewards" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" uuid NOT NULL,
      "current_day" integer DEFAULT 1 NOT NULL,
      "cycle_started_at" timestamp with time zone DEFAULT now() NOT NULL,
      "last_claimed_at" timestamp with time zone,
      "total_cycles_completed" integer DEFAULT 0 NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "daily_rewards_user_id_unique" UNIQUE("user_id")
    );
    ALTER TABLE "daily_reward_claims" ADD CONSTRAINT "daily_reward_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;
    ALTER TABLE "daily_rewards" ADD CONSTRAINT "daily_rewards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;
    CREATE UNIQUE INDEX "daily_reward_claim_user_day_uq" ON "daily_reward_claims" USING btree ("user_id","day");
    CREATE INDEX "daily_reward_claims_user_idx" ON "daily_reward_claims" USING btree ("user_id","claimed_at");
    CREATE INDEX "daily_rewards_user_idx" ON "daily_rewards" USING btree ("user_id");
  `);

  console.log("daily_rewards tables created successfully!");
  await sql.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
