ALTER TYPE "public"."mission_status" ADD VALUE 'settled' BEFORE 'failed';--> statement-breakpoint
DROP INDEX "vision_evidence_hash_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "vision_evidence_user_content_uq" ON "vision_evidence" USING btree ("user_id","content_hash");