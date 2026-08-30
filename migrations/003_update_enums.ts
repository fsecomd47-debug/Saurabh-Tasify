/**
 * PDR-4.1 Database Migration: Update Enums
 * Run this to add new enum values to PostgreSQL.
 * 
 * Usage: npx tsx migrations/003_update_enums.ts
 */

import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = postgres(connectionString);

async function migrate() {
  console.log("Starting enum migration...");

  // Add new activity_type values
  // PostgreSQL 9.1+ supports IF NOT EXISTS for ALTER TYPE ADD VALUE
  const activityTypes = ["visual_result", "external_result", "simple"];
  for (const val of activityTypes) {
    try {
      await sql.unsafe(`ALTER TYPE activity_type ADD VALUE IF NOT EXISTS '${val}'`);
      console.log(`  Added activity_type: ${val}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("already exists")) {
        console.log(`  activity_type ${val} already exists, skipping`);
      } else {
        console.error(`  Failed to add activity_type ${val}:`, msg);
      }
    }
  }

  // Add new verification_mode values
  const verificationModes = ["activity_signal", "review", "photo"];
  for (const val of verificationModes) {
    try {
      await sql.unsafe(`ALTER TYPE verification_mode ADD VALUE IF NOT EXISTS '${val}'`);
      console.log(`  Added verification_mode: ${val}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("already exists")) {
        console.log(`  verification_mode ${val} already exists, skipping`);
      } else {
        console.error(`  Failed to add verification_mode ${val}:`, msg);
      }
    }
  }

  // Add low to confidence_class
  try {
    await sql.unsafe(`ALTER TYPE confidence_class ADD VALUE IF NOT EXISTS 'low'`);
    console.log(`  Added confidence_class: low`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("already exists")) {
      console.log(`  confidence_class low already exists, skipping`);
    } else {
      console.error(`  Failed to add confidence_class low:`, msg);
    }
  }

  console.log("Migration complete!");
  await sql.end();
}

migrate().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
