import { Player } from "@/types";

export const MOCK_PLAYERS: Player[] = [
  { id: "user-1", name: "Saurabh", totalAssets: 52860, xp: 12500, level: 18, avatar: "👨‍💻", streak: 14, tier: "Gold Hustler", rank: 4, rankChange: 2, lifetimeEarned: 128450, achievements: ["first-blood", "centurion", "unstoppable"], isCurrentUser: true },
  { id: "player-2", name: "Alex", totalAssets: 48250, xp: 11200, level: 17, avatar: "🧑‍🎨", streak: 9, tier: "Gold Hustler", rank: 5, rankChange: -1, lifetimeEarned: 95000, achievements: ["first-blood", "centurion"] },
  { id: "player-3", name: "Warren", totalAssets: 55700, xp: 14800, level: 20, avatar: "👨‍💼", streak: 21, tier: "Platinum Whale", rank: 1, rankChange: 0, lifetimeEarned: 156000, achievements: ["first-blood", "centurion", "money-maker", "unstoppable"] },
  { id: "player-4", name: "Edwards", totalAssets: 42100, xp: 8900, level: 15, avatar: "👨‍🔬", streak: 5, tier: "Silver Scholar", rank: 6, rankChange: 1, lifetimeEarned: 78000, achievements: ["first-blood"] },
  { id: "player-5", name: "Sofia", totalAssets: 51200, xp: 13100, level: 19, avatar: "👩‍🎓", streak: 12, tier: "Gold Hustler", rank: 3, rankChange: 1, lifetimeEarned: 112000, achievements: ["first-blood", "centurion", "speed-demon"] },
  { id: "player-6", name: "Ingrid", totalAssets: 33410, xp: 6500, level: 13, avatar: "👩‍💻", streak: 3, tier: "Silver Scholar", rank: 7, rankChange: -1, lifetimeEarned: 52000, achievements: ["first-blood"] },
];
