import { ECONOMY } from "./config";

export const getStreakMultiplier = (streak: number): number => {
  const thresholds = ECONOMY.streakBonus.thresholds;
  const max = ECONOMY.streakBonus.maxMultiplier;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (streak >= thresholds[i].streak) {
      return Math.min(thresholds[i].multiplier, max);
    }
  }
  return 1;
};

export const getMomentumMultiplier = (tasksCompletedToday: number): number => {
  const thresholds = ECONOMY.momentumBonus.thresholds;
  const max = ECONOMY.momentumBonus.maxMultiplier;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (tasksCompletedToday >= thresholds[i].tasks) {
      return Math.min(thresholds[i].multiplier, max);
    }
  }
  return 1;
};

export const getStreakStatus = (streak: number): {
  label: string;
  color: string;
  icon: string;
} => {
  if (streak >= 30) return { label: "Legendary", color: "#FFD700", icon: "👑" };
  if (streak >= 21) return { label: "On Fire", color: "#F59E0B", icon: "🔥" };
  if (streak >= 14) return { label: "Dominating", color: "#EF4444", icon: "⚡" };
  if (streak >= 7) return { label: "Strong", color: "#10B981", icon: "💪" };
  if (streak >= 3) return { label: "Building", color: "#6366F1", icon: "📈" };
  return { label: "Starting", color: "#94A3B8", icon: "🌱" };
};

export const getDaysUntilShield = (streak: number): number => {
  if (streak >= 14) return 1;
  if (streak >= 7) return 2;
  return 3;
};

export const getNextStreakMilestone = (streak: number): { streak: number; multiplier: number; label: string } | null => {
  const thresholds = ECONOMY.streakBonus.thresholds;
  for (const t of thresholds) {
    if (streak < t.streak) {
      return { streak: t.streak, multiplier: t.multiplier, label: getStreakStatus(t.streak).label };
    }
  }
  return null;
};
