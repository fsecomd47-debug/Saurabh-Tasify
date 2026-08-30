import { TaskDifficulty, TaskRarity } from "@/types";
import { ECONOMY } from "./config";

const DIFFICULTY_MULTIPLIERS: Record<TaskDifficulty, number> = {
  easy: 1,
  medium: 1.5,
  hard: 2.5,
  elite: 4,
};

const RARITY_MULTIPLIERS: Record<TaskRarity, number> = {
  common: 1,
  rare: 1.2,
  epic: 1.5,
  legendary: 2,
};

export const calculateReward = (params: {
  baseReward: number;
  difficulty: TaskDifficulty;
  rarity: TaskRarity;
  streakMultiplier: number;
  momentumMultiplier: number;
  isEarlyBird?: boolean;
  isPerfectDay?: boolean;
}): number => {
  const {
    baseReward,
    difficulty,
    rarity,
    streakMultiplier,
    momentumMultiplier,
    isEarlyBird = false,
    isPerfectDay = false,
  } = params;

  let reward = baseReward;
  reward *= DIFFICULTY_MULTIPLIERS[difficulty];
  reward *= RARITY_MULTIPLIERS[rarity];
  reward *= streakMultiplier;
  reward *= momentumMultiplier;

  if (isEarlyBird) reward *= ECONOMY.earlyBirdBonus;
  if (isPerfectDay) reward *= ECONOMY.perfectDayBonus;

  return Math.round(reward);
};

export const getDifficultyLabel = (difficulty: TaskDifficulty): string => {
  const labels: Record<TaskDifficulty, string> = {
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
    elite: "Elite",
  };
  return labels[difficulty];
};

export const getRarityLabel = (rarity: TaskRarity): string => {
  const labels: Record<TaskRarity, string> = {
    common: "Common",
    rare: "Rare",
    epic: "Epic",
    legendary: "Legendary",
  };
  return labels[rarity];
};
