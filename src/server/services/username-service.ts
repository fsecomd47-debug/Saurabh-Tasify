import "server-only";
import { sql, eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";

/**
 * Check if a display name is available (case-insensitive).
 * Returns { available: true } or { available: false, takenBy: "..." }.
 * Excludes a specific userId (for profile updates where user keeps their own name).
 */
export async function checkDisplayNameAvailable(
  name: string,
  excludeUserId?: string
): Promise<{ available: boolean; takenBy?: string }> {
  const trimmed = name.trim();
  if (trimmed.length < 2) return { available: false };
  if (trimmed.length > 24) return { available: false };

  const existing = await db
    .select({ userId: profiles.userId, displayName: profiles.displayName })
    .from(profiles)
    .where(sql`lower(${profiles.displayName}) = lower(${trimmed})`)
    .limit(1);

  if (!existing[0]) return { available: true };

  // If the existing row is the same user (profile update), it's fine
  if (excludeUserId && existing[0].userId === excludeUserId) {
    return { available: true };
  }

  return { available: false, takenBy: existing[0].displayName };
}
