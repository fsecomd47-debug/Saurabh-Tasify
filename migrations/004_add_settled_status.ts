/**
 * Migration 004: Add "settled" to mission_status enum.
 * "settled" indicates a mission has been verified AND the reward has been claimed.
 */
import type { Sql } from "postgres";

export default async function up(sql: Sql) {
  await sql.unsafe(`ALTER TYPE mission_status ADD VALUE IF NOT EXISTS 'settled'`);
  console.log("Added 'settled' to mission_status enum");
}

export async function down(sql: Sql) {
  // PostgreSQL doesn't support removing enum values safely.
  // A full enum replacement would be needed for rollback.
  console.log("Rollback not supported for enum value removal");
}
