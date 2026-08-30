CREATE TYPE "public"."pet_archetype" AS ENUM('miner', 'scholar', 'scout', 'balanced', 'specialist');--> statement-breakpoint
CREATE TYPE "public"."pet_rarity" AS ENUM('common', 'rare', 'epic', 'legendary', 'mythic');--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "pet_definitions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"emoji" text NOT NULL,
	"description" text NOT NULL,
	"personality" text NOT NULL,
	"level" integer DEFAULT 0 NOT NULL,
	"rarity" "pet_rarity" DEFAULT 'common' NOT NULL,
	"price_st" integer NOT NULL,
	"mining_rate_per_minute" real DEFAULT 1 NOT NULL,
	"xp_boost_percent" real DEFAULT 0 NOT NULL,
	"archetype" "pet_archetype" DEFAULT 'balanced' NOT NULL,
	"xp_per_level" integer DEFAULT 100 NOT NULL,
	"mining_rate_growth" real DEFAULT 0.2 NOT NULL,
	"xp_boost_growth" real DEFAULT 0.5 NOT NULL,
	"unlock_player_level" integer DEFAULT 1 NOT NULL,
	"asset_gradient" text DEFAULT '#8B5CF6 → #6366F1' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pet_mining_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"pet_ownership_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pet_mining_settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mining_session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"eligible_minutes" integer NOT NULL,
	"st_amount" integer NOT NULL,
	"wallet_transaction_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pet_ownerships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"pet_definition_id" text NOT NULL,
	"pet_level" integer DEFAULT 0 NOT NULL,
	"pet_xp" integer DEFAULT 0 NOT NULL,
	"equipped" boolean DEFAULT false NOT NULL,
	"acquired_at" timestamp with time zone DEFAULT now() NOT NULL,
	"equipped_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pet_xp_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"pet_ownership_id" uuid NOT NULL,
	"xp_amount" integer NOT NULL,
	"source" text NOT NULL,
	"mission_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_reward_claims" ADD CONSTRAINT "daily_reward_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_rewards" ADD CONSTRAINT "daily_rewards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_mining_sessions" ADD CONSTRAINT "pet_mining_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_mining_sessions" ADD CONSTRAINT "pet_mining_sessions_pet_ownership_id_pet_ownerships_id_fk" FOREIGN KEY ("pet_ownership_id") REFERENCES "public"."pet_ownerships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_mining_settlements" ADD CONSTRAINT "pet_mining_settlements_mining_session_id_pet_mining_sessions_id_fk" FOREIGN KEY ("mining_session_id") REFERENCES "public"."pet_mining_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_mining_settlements" ADD CONSTRAINT "pet_mining_settlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_ownerships" ADD CONSTRAINT "pet_ownerships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_xp_events" ADD CONSTRAINT "pet_xp_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_xp_events" ADD CONSTRAINT "pet_xp_events_pet_ownership_id_pet_ownerships_id_fk" FOREIGN KEY ("pet_ownership_id") REFERENCES "public"."pet_ownerships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_xp_events" ADD CONSTRAINT "pet_xp_events_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_reward_claim_user_day_uq" ON "daily_reward_claims" USING btree ("user_id","day");--> statement-breakpoint
CREATE INDEX "daily_reward_claims_user_idx" ON "daily_reward_claims" USING btree ("user_id","claimed_at");--> statement-breakpoint
CREATE INDEX "daily_rewards_user_idx" ON "daily_rewards" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pet_mining_user_idx" ON "pet_mining_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pet_mining_status_idx" ON "pet_mining_sessions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "pet_settlement_session_uq" ON "pet_mining_settlements" USING btree ("mining_session_id");--> statement-breakpoint
CREATE INDEX "pet_settlement_user_idx" ON "pet_mining_settlements" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pet_ownership_user_pet_uq" ON "pet_ownerships" USING btree ("user_id","pet_definition_id");--> statement-breakpoint
CREATE INDEX "pet_ownership_user_idx" ON "pet_ownerships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pet_xp_user_idx" ON "pet_xp_events" USING btree ("user_id","created_at");