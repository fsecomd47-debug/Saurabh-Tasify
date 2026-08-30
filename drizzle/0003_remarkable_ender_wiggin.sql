ALTER TYPE "public"."verification_mode" ADD VALUE 'activity_signal';--> statement-breakpoint
ALTER TYPE "public"."verification_mode" ADD VALUE 'review';--> statement-breakpoint
ALTER TYPE "public"."verification_mode" ADD VALUE 'photo';--> statement-breakpoint
CREATE TABLE "settlement_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mission_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"st_base" integer NOT NULL,
	"xp_base" integer NOT NULL,
	"confidence_score" real NOT NULL,
	"multipliers" jsonb NOT NULL,
	"st_final" integer NOT NULL,
	"xp_final" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vision_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mission_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"type" text NOT NULL,
	"timestamp" integer NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vision_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mission_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"content_hash" text NOT NULL,
	"evidence_type" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"consumed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vision_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mission_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text NOT NULL,
	"evidence_class" text NOT NULL,
	"confidence_score" real NOT NULL,
	"metrics" jsonb DEFAULT '{}'::jsonb,
	"reason_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vision_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mission_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_types" text[] DEFAULT '{}' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "missions" ALTER COLUMN "activity_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "task_analyses" ALTER COLUMN "activity_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."activity_type";--> statement-breakpoint
CREATE TYPE "public"."activity_type" AS ENUM('repetition', 'focus', 'timer', 'visual_result', 'external_result', 'simple');--> statement-breakpoint
ALTER TABLE "missions" ALTER COLUMN "activity_type" SET DATA TYPE "public"."activity_type" USING "activity_type"::"public"."activity_type";--> statement-breakpoint
ALTER TABLE "task_analyses" ALTER COLUMN "activity_type" SET DATA TYPE "public"."activity_type" USING "activity_type"::"public"."activity_type";--> statement-breakpoint
ALTER TABLE "verification_results" ALTER COLUMN "confidence_class" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."confidence_class";--> statement-breakpoint
CREATE TYPE "public"."confidence_class" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
ALTER TABLE "verification_results" ALTER COLUMN "confidence_class" SET DATA TYPE "public"."confidence_class" USING "confidence_class"::"public"."confidence_class";--> statement-breakpoint
ALTER TABLE "settlement_audit" ADD CONSTRAINT "settlement_audit_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_audit" ADD CONSTRAINT "settlement_audit_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vision_events" ADD CONSTRAINT "vision_events_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vision_events" ADD CONSTRAINT "vision_events_session_id_vision_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."vision_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vision_events" ADD CONSTRAINT "vision_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vision_evidence" ADD CONSTRAINT "vision_evidence_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vision_evidence" ADD CONSTRAINT "vision_evidence_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vision_results" ADD CONSTRAINT "vision_results_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vision_results" ADD CONSTRAINT "vision_results_session_id_vision_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."vision_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vision_results" ADD CONSTRAINT "vision_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vision_sessions" ADD CONSTRAINT "vision_sessions_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vision_sessions" ADD CONSTRAINT "vision_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "settlement_audit_user_idx" ON "settlement_audit" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "vision_events_session_idx" ON "vision_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "vision_events_mission_idx" ON "vision_events" USING btree ("mission_id");--> statement-breakpoint
CREATE INDEX "vision_evidence_mission_idx" ON "vision_evidence" USING btree ("mission_id");--> statement-breakpoint
CREATE INDEX "vision_evidence_hash_idx" ON "vision_evidence" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "vision_results_mission_idx" ON "vision_results" USING btree ("mission_id");--> statement-breakpoint
CREATE INDEX "vision_results_user_idx" ON "vision_results" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "vision_sessions_mission_idx" ON "vision_sessions" USING btree ("mission_id");--> statement-breakpoint
CREATE INDEX "vision_sessions_user_idx" ON "vision_sessions" USING btree ("user_id");