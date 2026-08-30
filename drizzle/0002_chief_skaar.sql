CREATE TYPE "public"."activity_type" AS ENUM('focus', 'repetition', 'timer', 'evidence', 'hybrid');--> statement-breakpoint
CREATE TYPE "public"."confidence_class" AS ENUM('high', 'medium', 'insufficient');--> statement-breakpoint
CREATE TYPE "public"."mission_status" AS ENUM('draft', 'analyzing', 'ready', 'starting', 'active', 'verifying', 'passed', 'failed', 'review', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."verification_mode" AS ENUM('self_reported', 'timed', 'focus', 'pose', 'repetition', 'interactive', 'evidence', 'hybrid');--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"key" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"rollout_pct" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mission_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mission_id" uuid NOT NULL,
	"session_id" uuid,
	"type" text NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mission_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mission_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"paused_at" timestamp with time zone,
	"total_paused_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "missions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"activity_type" "activity_type" NOT NULL,
	"verification_mode" "verification_mode" NOT NULL,
	"status" "mission_status" DEFAULT 'draft' NOT NULL,
	"difficulty" "task_difficulty" NOT NULL,
	"duration_seconds" integer,
	"target_repetitions" integer,
	"reward_st_preview" integer NOT NULL,
	"reward_xp_preview" integer NOT NULL,
	"verification_rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"normalized_input" text NOT NULL,
	"category" "task_category" NOT NULL,
	"difficulty" "task_difficulty" NOT NULL,
	"activity_type" "activity_type" NOT NULL,
	"verification_mode" "verification_mode" NOT NULL,
	"estimated_minutes" integer NOT NULL,
	"base_reward_st" integer NOT NULL,
	"base_reward_xp" integer NOT NULL,
	"ai_provider" text,
	"confidence" real DEFAULT 0.8 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mission_id" uuid NOT NULL,
	"status" text NOT NULL,
	"confidence_class" "confidence_class" NOT NULL,
	"confidence_score" real NOT NULL,
	"duration_seconds" integer,
	"repetition_count" integer,
	"presence_samples" integer,
	"reason_code" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "onboarding_profiles" ADD COLUMN "playstyle" text;--> statement-breakpoint
ALTER TABLE "mission_events" ADD CONSTRAINT "mission_events_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_events" ADD CONSTRAINT "mission_events_session_id_mission_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."mission_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_sessions" ADD CONSTRAINT "mission_sessions_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_results" ADD CONSTRAINT "verification_results_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mission_events_mission_idx" ON "mission_events" USING btree ("mission_id");--> statement-breakpoint
CREATE INDEX "mission_events_session_idx" ON "mission_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "mission_sessions_mission_idx" ON "mission_sessions" USING btree ("mission_id");--> statement-breakpoint
CREATE INDEX "missions_user_status_idx" ON "missions" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "missions_task_idx" ON "missions" USING btree ("task_id");--> statement-breakpoint
CREATE UNIQUE INDEX "task_analyses_input_uq" ON "task_analyses" USING btree ("normalized_input");--> statement-breakpoint
CREATE INDEX "verification_results_mission_idx" ON "verification_results" USING btree ("mission_id");