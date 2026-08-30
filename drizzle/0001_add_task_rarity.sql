CREATE TYPE "public"."task_rarity" AS ENUM('common', 'rare', 'epic', 'legendary');--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "rarity" "task_rarity" DEFAULT 'common' NOT NULL;