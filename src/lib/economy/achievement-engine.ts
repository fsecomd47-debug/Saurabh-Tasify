import { Achievement } from "@/types";
import { Trophy, Zap, Flame, Target, Coins, TrendingUp, Crown, Star, CircleDollarSign, Shield, Users, Gift, Award } from "lucide-react";

export const ACHIEVEMENT_DEFINITIONS: Achievement[] = [
  { id: "first-blood", name: "First Blood", description: "Complete your first task", icon: Target, category: "milestone", unlockedAt: undefined, progress: 0, requirement: { type: "tasks_completed", value: 1 } },
  { id: "early-grinder", name: "Early Grinder", description: "Complete 5 tasks before 9 AM", icon: Star, category: "skill", unlockedAt: undefined, progress: 0, requirement: { type: "early_tasks", value: 5 } },
  { id: "centurion", name: "Centurion", description: "Earn 100 ST", icon: Coins, category: "wealth", unlockedAt: undefined, progress: 0, requirement: { type: "total_earned", value: 100 } },
  { id: "money-maker", name: "Money Maker", description: "Earn 10,000 ST", icon: CircleDollarSign, category: "wealth", unlockedAt: undefined, progress: 0, requirement: { type: "total_earned", value: 10000 } },
  { id: "unstoppable", name: "Unstoppable", description: "30-day streak", icon: Flame, category: "streak", unlockedAt: undefined, progress: 0, requirement: { type: "streak", value: 30 } },
  { id: "top-10", name: "Top 10", description: "Reach top 10 leaderboard", icon: Trophy, category: "social", unlockedAt: undefined, progress: 0, requirement: { type: "leaderboard_rank", value: 10 } },
  { id: "speed-demon", name: "Speed Demon", description: "Complete 5 tasks in one day", icon: Zap, category: "skill", unlockedAt: undefined, progress: 0, requirement: { type: "daily_tasks", value: 5 } },
  { id: "hard-hitter", name: "Hard Hitter", description: "Complete 10 hard tasks", icon: Shield, category: "skill", unlockedAt: undefined, progress: 0, requirement: { type: "hard_tasks", value: 10 } },
  { id: "social-butterfly", name: "Social Butterfly", description: "Send 5 bounties", icon: Users, category: "social", unlockedAt: undefined, progress: 0, requirement: { type: "bounties_sent", value: 5 } },
  { id: "collector", name: "Collector", description: "Buy 5 items from shop", icon: Gift, category: "wealth", unlockedAt: undefined, progress: 0, requirement: { type: "items_bought", value: 5 } },
];

export const checkAchievement = (achievement: Achievement, stats: {
  tasksCompleted: number;
  totalEarned: number;
  streak: number;
  leaderboardRank: number;
  dailyTasks: number;
  hardTasks: number;
  bountiesSent: number;
  itemsBought: number;
  earlyTasks: number;
}): { unlocked: boolean; progress: number } => {
  let current = 0;
  const target = achievement.requirement.value;

  switch (achievement.requirement.type) {
    case "tasks_completed": current = stats.tasksCompleted; break;
    case "total_earned": current = stats.totalEarned; break;
    case "streak": current = stats.streak; break;
    case "leaderboard_rank": current = stats.leaderboardRank; break;
    case "daily_tasks": current = stats.dailyTasks; break;
    case "hard_tasks": current = stats.hardTasks; break;
    case "bounties_sent": current = stats.bountiesSent; break;
    case "items_bought": current = stats.itemsBought; break;
    case "early_tasks": current = stats.earlyTasks; break;
  }

  return {
    unlocked: current >= target,
    progress: Math.min(current / target, 1),
  };
};
