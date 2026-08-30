import { Trophy, Zap, Flame, Target, Coins, TrendingUp, Crown, Star, CircleDollarSign, Shield, Users, Gift, Film, Gamepad2 } from "lucide-react";
import { Quest, DailyMission, Achievement, ActivityFeedItem, ShopItem } from "@/types";

export const MOCK_QUESTS: Quest[] = [
  {
    id: "quest-1",
    title: "7-Day Productivity Quest",
    description: "Complete tasks consistently for a week",
    icon: Trophy,
    objectives: [
      { type: "complete_tasks", target: 10, current: 7, label: "Complete 10 tasks", completed: false },
      { type: "earn_st", target: 3000, current: 2100, label: "Earn 3,000 ST", completed: false },
      { type: "maintain_streak", target: 7, current: 5, label: "Maintain 7-day streak", completed: false },
    ],
    reward: { st: 2500, xp: 500, badge: "quest-master" },
    status: "active",
  },
  {
    id: "quest-2",
    title: "Hard Worker Challenge",
    description: "Prove your dedication with tough tasks",
    icon: Zap,
    objectives: [
      { type: "hard_tasks", target: 5, current: 3, label: "Complete 5 hard tasks", completed: false },
      { type: "earn_st", target: 5000, current: 3200, label: "Earn 5,000 ST", completed: false },
    ],
    reward: { st: 3000, xp: 750, badge: "hard-hitter" },
    status: "active",
  },
];

export const MOCK_DAILY_MISSIONS: DailyMission[] = [
  { id: "daily-1", title: "Complete 3 tasks", target: 3, current: 1, reward: 200, icon: Target, completed: false },
  { id: "daily-2", title: "Earn 500 ST today", target: 500, current: 250, reward: 100, icon: Coins, completed: false },
  { id: "daily-3", title: "Finish one hard task", target: 1, current: 0, reward: 150, icon: Zap, completed: false },
];

export const MOCK_ACHIEVEMENTS: Achievement[] = [
  { id: "first-blood", name: "First Blood", description: "Complete your first task", icon: Target, category: "milestone", unlockedAt: "2026-01-15", progress: 1, requirement: { type: "tasks_completed", value: 1 } },
  { id: "centurion", name: "Centurion", description: "Earn 100 ST", icon: Coins, category: "wealth", unlockedAt: "2026-01-20", progress: 1, requirement: { type: "total_earned", value: 100 } },
  { id: "unstoppable", name: "Unstoppable", description: "30-day streak", icon: Flame, category: "streak", unlockedAt: undefined, progress: 0.47, requirement: { type: "streak", value: 30 } },
  { id: "money-maker", name: "Money Maker", description: "Earn 10,000 ST", icon: CircleDollarSign, category: "wealth", unlockedAt: undefined, progress: 0.85, requirement: { type: "total_earned", value: 10000 } },
  { id: "speed-demon", name: "Speed Demon", description: "Complete 5 tasks in one day", icon: Zap, category: "skill", unlockedAt: undefined, progress: 0.6, requirement: { type: "daily_tasks", value: 5 } },
  { id: "hard-hitter", name: "Hard Hitter", description: "Complete 10 hard tasks", icon: Flame, category: "skill", unlockedAt: undefined, progress: 0.3, requirement: { type: "hard_tasks", value: 10 } },
  { id: "top-10", name: "Top 10", description: "Reach top 10 leaderboard", icon: Trophy, category: "social", unlockedAt: undefined, progress: 0.7, requirement: { type: "leaderboard_rank", value: 10 } },
  { id: "social-butterfly", name: "Social Butterfly", description: "Send 5 bounties", icon: Users, category: "social", unlockedAt: undefined, progress: 0.2, requirement: { type: "bounties_sent", value: 5 } },
];

export const MOCK_ACTIVITY_FEED: ActivityFeedItem[] = [
  { id: "feed-1", playerId: "player-3", playerName: "Warren", playerAvatar: "W", action: "completed_task", details: "Finish UI Design", amount: 500, createdAt: "2026-08-21T10:00:00Z" },
  { id: "feed-2", playerId: "player-5", playerName: "Sofia", playerAvatar: "S", action: "reached_level", details: "Level 19", createdAt: "2026-08-21T09:30:00Z" },
  { id: "feed-3", playerId: "player-2", playerName: "Alex", playerAvatar: "A", action: "unlocked_achievement", details: "Speed Demon", createdAt: "2026-08-21T08:15:00Z" },
  { id: "feed-4", playerId: "player-4", playerName: "Edwards", playerAvatar: "E", action: "completed_task", details: "Budget Review", amount: 200, createdAt: "2026-08-21T07:45:00Z" },
  { id: "feed-5", playerId: "user-1", playerName: "Saurabh", playerAvatar: "S", action: "earned_st", details: "500 ST from Deep Work", amount: 500, createdAt: "2026-08-21T07:00:00Z" },
];

export const MOCK_SHOP_ITEMS: ShopItem[] = [
  { id: "shop-1", name: "Order Pizza", description: "Treat yourself to a pizza night", price: 500, category: "experience", icon: Gift, owned: false, equipped: false, consumable: false, limited: false, rarity: "common", featured: false },
  { id: "shop-2", name: "Movie Night", description: "Stream any movie you want", price: 300, category: "experience", icon: Film, owned: false, equipped: false, consumable: false, limited: false, rarity: "common", featured: false },
  { id: "shop-3", name: "Gaming Session", description: "2 hours of guilt-free gaming", price: 400, category: "experience", icon: Gamepad2, owned: false, equipped: false, consumable: false, limited: false, rarity: "common", featured: false },
  { id: "shop-4", name: "2x Yield Boost", description: "Double rewards for 24 hours", price: 1000, category: "boost", icon: Zap, owned: false, equipped: false, consumable: true, limited: false, rarity: "rare", featured: false },
  { id: "shop-5", name: "Streak Shield", description: "Protect your streak for 1 day", price: 750, category: "boost", icon: Shield, owned: false, equipped: false, consumable: true, limited: false, rarity: "rare", featured: false },
  { id: "shop-6", name: "Golden Avatar Frame", description: "Exclusive golden frame", price: 2000, category: "customize", icon: Crown, owned: false, equipped: false, consumable: false, limited: false, rarity: "epic", featured: false },
];

export const INITIAL_USER = {
  id: "user-1",
  name: "Saurabh",
  avatar: "S",
  streak: 14,
  tier: "Gold Hustler" as const,
};

export const INITIAL_WALLET = {
  balance: 52860,
  lifetimeEarned: 128450,
  lifetimeSpent: 75590,
};

export const TIER_CONFIG = {
  "Bronze Beginner": { min: 0, max: 9999, color: "#CD7F32", icon: Shield },
  "Silver Scholar": { min: 10000, max: 29999, color: "#C0C0C0", icon: Shield },
  "Gold Hustler": { min: 30000, max: 59999, color: "#FFD700", icon: Trophy },
  "Platinum Whale": { min: 60000, max: 99999, color: "#E5E4E2", icon: Star },
  "Diamond Mogul": { min: 100000, max: Infinity, color: "#B9F2FF", icon: Crown },
};

export const DIFFICULTY_CONFIG = {
  easy: { label: "Easy", multiplier: 1, color: "#10B981", icon: Target },
  medium: { label: "Medium", multiplier: 1.5, color: "#F59E0B", icon: Zap },
  hard: { label: "Hard", multiplier: 2.5, color: "#EF4444", icon: Flame },
  elite: { label: "Elite", multiplier: 4, color: "#8B5CF6", icon: Crown },
};

export const RARITY_CONFIG = {
  common: { label: "Common", color: "#94A3B8", bg: "#F1F5F9", icon: CircleDollarSign },
  rare: { label: "Rare", color: "#3B82F6", bg: "#DBEAFE", icon: Star },
  epic: { label: "Epic", color: "#8B5CF6", bg: "#EDE9FE", icon: Trophy },
  legendary: { label: "Legendary", color: "#F59E0B", bg: "#FEF3C7", icon: Crown },
  mythic: { label: "Mythic", color: "#EF4444", bg: "#FEE2E2", icon: Flame },
};
