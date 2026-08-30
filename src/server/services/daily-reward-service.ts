import "server-only";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  dailyRewards,
  dailyRewardClaims,
  wallets,
  walletTransactions,
  playerProgress,
  activityEvents,
  profiles,
} from "@/db/schema";
import { AppError, logSecurity } from "@/server/http";
import { localDateStr } from "@/server/economy/streaks";
import { levelFromXP } from "@/server/economy/rewards";

/* ──────────────────── Reward definitions ───────────────────────── */

export type DailyRewardTier = {
  day: number;
  st: number;
  xp: number;
  label: string;
  emoji: string;
};

export const DAILY_REWARD_TIERS: DailyRewardTier[] = [
  { day: 1, st: 50, xp: 25, label: "Day 1", emoji: "🌅" },
  { day: 2, st: 75, xp: 40, label: "Day 2", emoji: "🔥" },
  { day: 3, st: 100, xp: 60, label: "Day 3", emoji: "⚡" },
  { day: 4, st: 125, xp: 75, label: "Day 4", emoji: "💎" },
  { day: 5, st: 150, xp: 100, label: "Day 5", emoji: "🌟" },
  { day: 6, st: 200, xp: 125, label: "Day 6", emoji: "🏆" },
  { day: 7, st: 500, xp: 300, label: "Jackpot", emoji: "👑" },
];

export const STREAK_BONUS_MULTIPLIER = 1.5;
export const COMEBACK_WINDOW_DAYS = 3;
export const CYCLE_RESET_HOURS = 24;

/* ──────────────────── Types ────────────────────────────────────── */

export type DailyRewardStatus = {
  available: boolean;
  currentDay: number;
  totalCyclesCompleted: number;
  lastClaimedAt: string | null;
  cycleStartedAt: string;
  tiers: DailyRewardTier[];
  claimedDays: number[];
  timeUntilNext: string | null;
  streakActive: boolean;
};

export type DailyRewardClaimResult = {
  claimed: boolean;
  day: number;
  stAwarded: number;
  xpAwarded: number;
  streakBonus: boolean;
  levelUp: boolean;
  newLevel: number;
  cycleComplete: boolean;
  nextReward: DailyRewardTier | null;
};

/* ──────────────────── Helpers ──────────────────────────────────── */

function getNextTier(currentDay: number): DailyRewardTier | null {
  if (currentDay > 7) return null;
  return DAILY_REWARD_TIERS[currentDay - 1];
}

function isStreakActive(lastClaimedAt: Date | null, timezone: string): boolean {
  if (!lastClaimedAt) return false;
  const now = new Date();
  const todayStr = localDateStr(now, timezone);
  const lastStr = localDateStr(lastClaimedAt, timezone);
  return todayStr === lastStr;
}

function isWithinComebackWindow(lastClaimedAt: Date | null, timezone: string): boolean {
  if (!lastClaimedAt) return true;
  const now = new Date();
  const diffMs = now.getTime() - lastClaimedAt.getTime();
  const diffDays = diffMs / (24 * 60 * 60 * 1000);
  return diffDays <= COMEBACK_WINDOW_DAYS;
}

function getTimeUntilNextClaim(lastClaimedAt: Date | null, timezone: string): string | null {
  if (!lastClaimedAt) return null;
  const nextAvailable = new Date(lastClaimedAt.getTime() + CYCLE_RESET_HOURS * 60 * 60 * 1000);
  const now = new Date();
  if (now >= nextAvailable) return null;
  const diffMs = nextAvailable.getTime() - now.getTime();
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  const mins = Math.floor((diffMs % (60 * 60 * 1000)) / 60000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

/* ──────────────────── Service ──────────────────────────────────── */

export async function getDailyRewardStatus(userId: string): Promise<DailyRewardStatus> {
  const now = new Date();

  try {
    const profile = await db
      .select({ timezone: profiles.timezone })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);
    const timezone = profile[0]?.timezone ?? "UTC";

    const [row] = await db
      .select()
      .from(dailyRewards)
      .where(eq(dailyRewards.userId, userId));

  if (!row) {
    return {
      available: true,
      currentDay: 1,
      totalCyclesCompleted: 0,
      lastClaimedAt: null,
      cycleStartedAt: now.toISOString(),
      tiers: DAILY_REWARD_TIERS,
      claimedDays: [],
      timeUntilNext: null,
      streakActive: false,
    };
  }

  const timeUntilNext = getTimeUntilNextClaim(row.lastClaimedAt, timezone);
  const streakActive = isStreakActive(row.lastClaimedAt, timezone);

  const claimedRows = await db
    .select({ day: dailyRewardClaims.day })
    .from(dailyRewardClaims)
    .where(eq(dailyRewardClaims.userId, userId))
    .orderBy(dailyRewardClaims.day);

  const claimedDays = claimedRows.map((r) => r.day);

  const nextTier = getNextTier(row.currentDay);
  const available = nextTier !== null && timeUntilNext === null;

  return {
    available,
    currentDay: row.currentDay,
    totalCyclesCompleted: row.totalCyclesCompleted,
    lastClaimedAt: row.lastClaimedAt?.toISOString() ?? null,
    cycleStartedAt: row.cycleStartedAt.toISOString(),
    tiers: DAILY_REWARD_TIERS,
    claimedDays,
    timeUntilNext,
    streakActive,
  };
  } catch {
    // Graceful fallback when table doesn't exist yet
    return {
      available: true,
      currentDay: 1,
      totalCyclesCompleted: 0,
      lastClaimedAt: null,
      cycleStartedAt: now.toISOString(),
      tiers: DAILY_REWARD_TIERS,
      claimedDays: [],
      timeUntilNext: null,
      streakActive: false,
    };
  }
}

export async function claimDailyReward(userId: string): Promise<DailyRewardClaimResult> {
  return db.transaction(async (tx) => {
    const now = new Date();
    const profile = await tx
      .select({ timezone: profiles.timezone })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);
    const timezone = profile[0]?.timezone ?? "UTC";

    let [rewardRow] = await tx
      .select()
      .from(dailyRewards)
      .where(eq(dailyRewards.userId, userId))
      .for("update");

    const currentDay = rewardRow?.currentDay ?? 1;
    const nextTier = getNextTier(currentDay);
    if (!nextTier) {
      throw new AppError("DAILY_REWARD_COMPLETE", "All daily rewards claimed. Come back tomorrow!");
    }

    const timeUntilNext = getTimeUntilNextClaim(rewardRow?.lastClaimedAt ?? null, timezone);
    if (timeUntilNext) {
      throw new AppError("RATE_LIMITED", `Next reward available in ${timeUntilNext}.`);
    }

    const streakActive = isStreakActive(rewardRow?.lastClaimedAt ?? null, timezone);
    const withinComeback = isWithinComebackWindow(rewardRow?.lastClaimedAt ?? null, timezone);
    const hasBonus = streakActive || withinComeback;

    const stBase = nextTier.st;
    const stFinal = hasBonus ? Math.round(stBase * STREAK_BONUS_MULTIPLIER) : stBase;
    const xpFinal = nextTier.xp;

    const [wallet] = await tx
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .for("update");
    if (!wallet) throw new AppError("INTERNAL", "Wallet not found.");

    const idempotencyKey = `daily_reward:${currentDay}`;
    const existing = await tx
      .select({ id: dailyRewardClaims.id })
      .from(dailyRewardClaims)
      .where(
        and(
          eq(dailyRewardClaims.userId, userId),
          eq(dailyRewardClaims.day, currentDay)
        )
      )
      .limit(1);

    if (existing[0]) {
      throw new AppError("DAILY_REWARD_ALREADY_CLAIMED", "Already claimed today's reward.");
    }

    const insertedClaim = await tx
      .insert(dailyRewardClaims)
      .values({
        userId,
        day: currentDay,
        cycleDay: currentDay,
        stAmount: stFinal,
        xpAmount: xpFinal,
        streakBonus: hasBonus,
        claimedAt: now,
      })
      .returning({ id: dailyRewardClaims.id });

    const insertedTxn = await tx
      .insert(walletTransactions)
      .values({
        walletId: wallet.id,
        type: "reward",
        amount: stFinal,
        title: `Daily Reward — ${nextTier.label}`,
        context: `Day ${currentDay} of 7${hasBonus ? " (streak bonus)" : ""}`,
        referenceType: "daily_reward",
        referenceId: insertedClaim[0].id,
        idempotencyKey,
        metadata: {
          day: currentDay,
          stBase,
          streakBonus: hasBonus,
          cycleComplete: currentDay === 7,
        },
      })
      .onConflictDoNothing()
      .returning({ id: walletTransactions.id });

    if (insertedTxn.length === 0) {
      logSecurity("daily_reward_race_detected", { userId, day: currentDay });
      throw new AppError("DAILY_REWARD_ALREADY_CLAIMED", "Already claimed today's reward.");
    }

    await tx
      .update(wallets)
      .set({
        balance: sql`${wallets.balance} + ${stFinal}`,
        lifetimeEarned: sql`${wallets.lifetimeEarned} + ${stFinal}`,
        updatedAt: now,
      })
      .where(eq(wallets.id, wallet.id));

    const [progress] = await tx
      .select()
      .from(playerProgress)
      .where(eq(playerProgress.userId, userId));
    const newXP = (progress?.xp ?? 0) + xpFinal;
    const newLevel = levelFromXP(newXP);
    const levelUp = newLevel > (progress?.level ?? 1);

    await tx
      .update(playerProgress)
      .set({
        xp: newXP,
        level: newLevel,
        updatedAt: now,
      })
      .where(eq(playerProgress.userId, userId));

    const cycleComplete = currentDay === 7;
    let nextDay: number;
    let totalCyclesCompleted = rewardRow?.totalCyclesCompleted ?? 0;

    if (cycleComplete) {
      nextDay = 1;
      totalCyclesCompleted += 1;
    } else {
      nextDay = currentDay + 1;
    }

    if (rewardRow) {
      await tx
        .update(dailyRewards)
        .set({
          currentDay: nextDay,
          lastClaimedAt: now,
          totalCyclesCompleted,
          updatedAt: now,
        })
        .where(eq(dailyRewards.userId, userId));
    } else {
      await tx.insert(dailyRewards).values({
        userId,
        currentDay: nextDay,
        cycleStartedAt: now,
        lastClaimedAt: now,
        totalCyclesCompleted,
      });
    }

    await tx.insert(activityEvents).values({
      userId,
      type: "DAILY_REWARD_CLAIMED",
      entityId: insertedClaim[0].id,
      metadata: {
        day: currentDay,
        stAwarded: stFinal,
        xpAwarded: xpFinal,
        streakBonus: hasBonus,
        cycleComplete,
      },
    });

    logSecurity("daily_reward_claimed", {
      userId,
      day: currentDay,
      st: stFinal,
      xp: xpFinal,
      streakBonus: hasBonus,
      cycleComplete,
    });

    const nextReward = cycleComplete ? DAILY_REWARD_TIERS[0] : DAILY_REWARD_TIERS[nextDay - 1];

    return {
      claimed: true,
      day: currentDay,
      stAwarded: stFinal,
      xpAwarded: xpFinal,
      streakBonus: hasBonus,
      levelUp,
      newLevel,
      cycleComplete,
      nextReward,
    };
  });
}
