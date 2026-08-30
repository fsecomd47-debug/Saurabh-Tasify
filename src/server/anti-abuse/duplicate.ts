import "server-only";
import { eq, and, sql, gte } from "drizzle-orm";
import { db } from "@/db";
import { missions } from "@/db/schema";

const DUPLICATE_WINDOW_MS = 3600_000; // 1 hour
const MAX_DUPLICATE_COMPLETIONS = 3;

/**
 * Check if a user is repeatedly completing the same normalized task.
 * Used to detect farming behavior.
 */
export async function checkDuplicateFarming(
  userId: string,
  taskId: string
): Promise<{ isFarming: boolean; count: number }> {
  const windowStart = new Date(Date.now() - DUPLICATE_WINDOW_MS);

  const recentCompletions = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(missions)
    .where(and(
      eq(missions.userId, userId),
      eq(missions.taskId, taskId),
      eq(missions.status, "passed"),
      gte(missions.completedAt, windowStart)
    ));

  const count = recentCompletions[0]?.count ?? 0;
  return {
    isFarming: count >= MAX_DUPLICATE_COMPLETIONS,
    count,
  };
}

/**
 * Get reward reduction multiplier for repeated missions.
 * Diminishing returns for identical tasks.
 */
export function getRepeatMultiplier(completionsInWindow: number): number {
  if (completionsInWindow <= 1) return 1.0;
  if (completionsInWindow === 2) return 0.8;
  if (completionsInWindow === 3) return 0.6;
  return 0.4; // Cap at 40% for 4+ completions
}
