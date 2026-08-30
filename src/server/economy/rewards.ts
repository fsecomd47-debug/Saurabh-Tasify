import "server-only";
import { ECONOMY } from "@/lib/economy/config";
import type { TaskRarity } from "@/types";

const RARITY_MULT: Record<TaskRarity, number> = { common: 1, rare: 1.2, epic: 1.5, legendary: 2 };
const RARITY_XP_BONUS: Record<TaskRarity, number> = { common: 0, rare: 15, epic: 40, legendary: 100 };

/** Authoritative face-value reward for a new task (server-side only). */
export function faceValueReward(difficulty: keyof typeof ECONOMY.taskRewards, rarity: TaskRarity): number {
  return Math.round(ECONOMY.taskRewards[difficulty] * RARITY_MULT[rarity]);
}

/** Authoritative face-value XP for a new task. */
export function faceValueXP(difficulty: keyof typeof ECONOMY.xp, rarity: TaskRarity): number {
  return ECONOMY.xp[difficulty] + RARITY_XP_BONUS[rarity];
}

export type CompletionRewardInput = {
  baseReward: number; // server-stored task.reward (face value)
  baseXP: number; // server-stored task.xpReward
  streak: number;
  tasksCompletedToday: number;
  activeStBoostValue: number | null;
  activeXpBoostValue: number | null;
  localHour: number; // hour in the user's timezone
  critRoll?: number; // injectable for tests
};

export type CompletionReward = {
  stGained: number;
  xpGained: number;
  criticalHit: boolean;
  earlyBird: boolean;
  streakMultiplier: number;
  momentumMultiplier: number;
  boostMultiplier: number;
};

function thresholdMultiplier<T extends { multiplier: number }>(
  value: number,
  thresholds: readonly T[],
  pick: (t: T) => number
): number {
  let m = 1;
  for (const t of thresholds) if (value >= pick(t)) m = t.multiplier;
  return m;
}

/**
 * THE authoritative reward calculation for task completion (spec §35, §40).
 * Runs exclusively inside the server transaction — the client never supplies
 * any of these numbers. Mirrors PDR-1's tuned economy math exactly.
 */
export function computeCompletionReward(input: CompletionRewardInput): CompletionReward {
  const streakMultiplier = thresholdMultiplier(input.streak, ECONOMY.streakBonus.thresholds, (t) => t.streak);
  const momentumMultiplier = thresholdMultiplier(
    input.tasksCompletedToday,
    ECONOMY.momentumBonus.thresholds,
    (t) => t.tasks
  );
  const boostMultiplier = input.activeStBoostValue ?? 1;

  const isEarlyBird = input.localHour < 9;

  let st = input.baseReward;
  st *= streakMultiplier;
  st *= momentumMultiplier;
  if (input.activeStBoostValue != null) st *= input.activeStBoostValue;
  if (isEarlyBird) st *= ECONOMY.earlyBirdBonus;

  const criticalHit = (input.critRoll ?? Math.random()) < ECONOMY.criticalHitChance;
  if (criticalHit) st *= ECONOMY.criticalHitMultiplier;

  let xp = input.baseXP;
  if (input.activeXpBoostValue != null) xp *= input.activeXpBoostValue;

  return {
    stGained: Math.round(st),
    xpGained: Math.max(1, Math.round(xp)),
    criticalHit,
    earlyBird: isEarlyBird,
    streakMultiplier,
    momentumMultiplier,
    boostMultiplier,
  };
}

/** Level thresholds shared with the client XP engine (single source of truth). */
export const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 850, 1300, 1900, 2650, 3600, 4800, 6300, 8100, 10200, 12700,
  15700, 19200, 23300, 28100, 33700, 40200, 47700, 56400, 66500, 78200, 91800,
  107500, 125700, 146800, 171200, 199500,
];

export function levelFromXP(totalXP: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXP < LEVEL_THRESHOLDS[i]) break;
    level = i + 1;
  }
  return level;
}
