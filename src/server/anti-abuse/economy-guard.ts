import "server-only";
import { eq, and, sql, gte } from "drizzle-orm";
import { db } from "@/db";
import { walletTransactions } from "@/db/schema";

const DAILY_EARNING_CAP = 5000; // Maximum ST earnable per day
const MAX_REWARD_PER_MISSION = 1500; // Maximum ST for a single mission
const MIN_REWARD_FLOOR = 20; // Minimum ST for any mission

/**
 * Clamp a reward to the allowed economy bounds.
 */
export function clampReward(st: number): number {
  return Math.max(MIN_REWARD_FLOOR, Math.min(MAX_REWARD_PER_MISSION, st));
}

/**
 * Check if a user has hit their daily earning cap.
 */
export async function checkDailyCap(
  walletId: string
): Promise<{ exceeded: boolean; earnedToday: number; remaining: number }> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const result = await db
    .select({ total: sql<number>`coalesce(sum(${walletTransactions.amount}), 0)::int` })
    .from(walletTransactions)
    .where(and(
      eq(walletTransactions.walletId, walletId),
      eq(walletTransactions.type, "earning"),
      gte(walletTransactions.createdAt, todayStart)
    ));

  const earnedToday = result[0]?.total ?? 0;
  return {
    exceeded: earnedToday >= DAILY_EARNING_CAP,
    earnedToday,
    remaining: Math.max(0, DAILY_EARNING_CAP - earnedToday),
  };
}

/**
 * Apply economy guard to a reward amount.
 * Returns the clamped amount and whether it was capped.
 */
export function applyEconomyGuard(
  proposedSt: number,
  earnedToday: number
): { st: number; wasCapped: boolean; reason?: string } {
  let st = clampReward(proposedSt);

  // Check daily cap
  const remaining = Math.max(0, DAILY_EARNING_CAP - earnedToday);
  if (st > remaining) {
    return {
      st: Math.max(0, remaining),
      wasCapped: true,
      reason: remaining === 0 ? "DAILY_CAP_REACHED" : "DAILY_CAP_PARTIAL",
    };
  }

  return { st, wasCapped: false };
}
