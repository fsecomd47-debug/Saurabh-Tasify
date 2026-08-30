import { TaskDifficulty, TaskRarity } from "@/types";
import { ECONOMY } from "./config";

const DIFFICULTY_XP: Record<TaskDifficulty, number> = {
  easy: ECONOMY.xp.easy,
  medium: ECONOMY.xp.medium,
  hard: ECONOMY.xp.hard,
  elite: ECONOMY.xp.elite,
};

const RARITY_XP_BONUS: Record<TaskRarity, number> = {
  common: 0,
  rare: 15,
  epic: 40,
  legendary: 100,
};

export const calculateXP = (params: {
  difficulty: TaskDifficulty;
  rarity: TaskRarity;
  streakBonus?: number;
  momentumBonus?: number;
}): number => {
  const { difficulty, rarity, streakBonus = 0, momentumBonus = 0 } = params;
  let xp = DIFFICULTY_XP[difficulty] + RARITY_XP_BONUS[rarity];
  xp += streakBonus;
  xp += momentumBonus;
  return Math.round(xp);
};

export const XP_TO_ST_RATIO = ECONOMY.xpToStRatio;

const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 850, 1300, 1900, 2650, 3600, 4800,
  6300, 8100, 10200, 12700, 15700, 19200, 23300, 28100, 33700, 40200,
  47700, 56400, 66500, 78200, 91800, 107500, 125700, 146800, 171200, 199500,
];

export const getLevelFromXP = (totalXP: number) => {
  let level = 1;
  let prevThreshold = 0;

  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXP < LEVEL_THRESHOLDS[i]) {
      level = i;
      prevThreshold = LEVEL_THRESHOLDS[i - 1];
      break;
    }
    if (i === LEVEL_THRESHOLDS.length - 1) {
      level = LEVEL_THRESHOLDS.length;
      prevThreshold = LEVEL_THRESHOLDS[i - 1];
    }
  }

  const requiredXP = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const currentXP = totalXP - prevThreshold;
  const xpForNext = requiredXP - prevThreshold;
  const progress = xpForNext > 0 ? currentXP / xpForNext : 1;

  return { level, currentXP, requiredXP, progress: Math.min(progress, 1) };
};

export const getXPForLevel = (level: number): number => {
  return LEVEL_THRESHOLDS[Math.min(level, LEVEL_THRESHOLDS.length - 1)];
};
