import "server-only";
import { eq, and, sql, gte } from "drizzle-orm";
import { db } from "@/db";
import { missions } from "@/db/schema";
import { logSecurity } from "@/server/http";
import type { ActivityType } from "@/types";

const MISSION_COOLDOWN_MS = 60_000; // 1 minute between missions of same type
const MAX_MISSIONS_PER_HOUR = 10;
const MAX_MISSIONS_PER_DAY = 30;

export type VelocityCheckResult = {
  allowed: boolean;
  reason?: string;
  waitMs?: number;
};

/**
 * Check if a user can start a new mission based on completion velocity.
 */
export async function checkMissionVelocity(
  userId: string,
  activityType: ActivityType
): Promise<VelocityCheckResult> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 3600_000);
  const oneDayAgo = new Date(now.getTime() - 86400_000);
  const cooldownAgo = new Date(now.getTime() - MISSION_COOLDOWN_MS);

  // Check cooldown — same activity type
  const recentSameType = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(missions)
    .where(and(
      eq(missions.userId, userId),
      eq(missions.activityType, activityType),
      gte(missions.completedAt, cooldownAgo)
    ));

  if ((recentSameType[0]?.count ?? 0) > 0) {
    logSecurity("mission_velocity_cooldown", { userId, activityType });
    return {
      allowed: false,
      reason: "COOLDOWN",
      waitMs: MISSION_COOLDOWN_MS,
    };
  }

  // Check hourly limit
  const hourlyCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(missions)
    .where(and(
      eq(missions.userId, userId),
      gte(missions.completedAt, oneHourAgo)
    ));

  if ((hourlyCount[0]?.count ?? 0) >= MAX_MISSIONS_PER_HOUR) {
    logSecurity("mission_velocity_hourly_limit", { userId, count: hourlyCount[0]?.count });
    return {
      allowed: false,
      reason: "HOURLY_LIMIT",
      waitMs: 3600_000,
    };
  }

  // Check daily limit
  const dailyCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(missions)
    .where(and(
      eq(missions.userId, userId),
      gte(missions.completedAt, oneDayAgo)
    ));

  if ((dailyCount[0]?.count ?? 0) >= MAX_MISSIONS_PER_DAY) {
    logSecurity("mission_velocity_daily_limit", { userId, count: dailyCount[0]?.count });
    return {
      allowed: false,
      reason: "DAILY_LIMIT",
      waitMs: 86400_000,
    };
  }

  return { allowed: true };
}
