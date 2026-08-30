import { ShopItem, Collection } from "@/types";
import { Crown, Sparkles, Heart, Gem, Flame, Star, Palette, Monitor, Tag, Zap, TrendingUp, Shield, Gift, Trophy, Award, Target, Coffee, Music, Pizza, Gamepad2, RefreshCw, Users, Swords, Clock } from "lucide-react";

export const STORE_CATALOG: ShopItem[] = [
  // FEATURED
  { id: "item-gold-crown", name: "Golden Crown", description: "The ultimate symbol of productivity royalty. Wear it with pride.", price: 7500, category: "status", rarity: "legendary", icon: Crown, owned: false, equipped: false, consumable: false, limited: false, featured: true, collectionId: "col-champion" },
  { id: "item-neon-night", name: "Neon Night Theme", description: "Transform your interface into a sleek midnight workspace.", price: 2500, category: "customize", rarity: "epic", icon: Sparkles, owned: false, equipped: false, consumable: false, limited: false, featured: true, collectionId: "col-nightowl" },

  // DAILY DROP
  { id: "item-cherry-blossom", name: "Cherry Blossom Frame", description: "A delicate frame that blooms with every task completed.", price: 1200, category: "customize", rarity: "rare", icon: Heart, owned: false, equipped: false, consumable: false, limited: true, featured: false },

  // CUSTOMIZE - Avatar Frames
  { id: "item-epic-frame", name: "Epic Avatar Frame", description: "A glowing purple frame that radiates energy.", price: 1800, category: "customize", rarity: "epic", icon: Sparkles, owned: false, equipped: false, consumable: false, limited: false, featured: false, collectionId: "col-productivity" },
  { id: "item-diamond-frame", name: "Diamond Frame", description: "Crystalline perfection for the dedicated grinder.", price: 4500, category: "customize", rarity: "legendary", icon: Gem, owned: false, equipped: false, consumable: false, limited: false, featured: false },
  { id: "item-fire-frame", name: "Inferno Frame", description: "Burn through your tasks with this blazing frame.", price: 3200, category: "customize", rarity: "epic", icon: Flame, owned: false, equipped: false, consumable: false, limited: false, featured: false },
  { id: "item-moon-frame", name: "Moonlight Frame", description: "For the night owls who grind while others sleep.", price: 1500, category: "customize", rarity: "rare", icon: Star, owned: false, equipped: false, consumable: false, limited: false, featured: false, collectionId: "col-nightowl" },
  { id: "item-gold-aura", name: "Animated Gold Aura", description: "A floating particle ring around your profile picture. Pure prestige.", price: 5000, category: "customize", rarity: "legendary", icon: Sparkles, owned: false, equipped: false, consumable: false, limited: false, featured: false, requiredLevel: 25 },
  { id: "item-cyberpunk-theme", name: "Cyberpunk Neon Theme", description: "Reskins the entire app into dark neon. The ultimate flex.", price: 2500, category: "customize", rarity: "epic", icon: Monitor, owned: false, equipped: false, consumable: false, limited: false, featured: false, requiredLevel: 18 },

  // CUSTOMIZE - Themes
  { id: "item-minimal-theme", name: "Minimal Theme", description: "Clean, focused, distraction-free. Pure productivity.", price: 1000, category: "customize", rarity: "common", icon: Palette, owned: false, equipped: false, consumable: false, limited: false, featured: false, collectionId: "col-productivity" },
  { id: "item-midnight-theme", name: "Midnight Theme", description: "Dark mode elevated. Deep blacks and soft purples.", price: 2000, category: "customize", rarity: "rare", icon: Monitor, owned: false, equipped: false, consumable: false, limited: false, featured: false, collectionId: "col-nightowl" },
  { id: "item-sunset-theme", name: "Sunset Gradient", description: "Warm gradients that make every session feel golden.", price: 1800, category: "customize", rarity: "rare", icon: Sparkles, owned: false, equipped: false, consumable: false, limited: false, featured: false },

  // CUSTOMIZE - Nameplates
  { id: "item-elite-nameplate", name: "Elite Nameplate", description: "A premium name bar that signals dedication.", price: 2200, category: "customize", rarity: "epic", icon: Tag, owned: false, equipped: false, consumable: false, limited: false, featured: false },
  { id: "item-neon-nameplate", name: "Neon Nameplate", description: "Electric purple glow for your player name.", price: 1500, category: "customize", rarity: "rare", icon: Tag, owned: false, equipped: false, consumable: false, limited: false, featured: false },
  { id: "item-custom-title", name: "Custom Leaderboard Title", description: "Display 'The Unstoppable' or 'Task Overlord' under your name.", price: 3500, category: "status", rarity: "epic", icon: Award, owned: false, equipped: false, consumable: false, limited: false, featured: false, requiredLevel: 20 },

  // BOOSTS
  { id: "boost-2x-st", name: "2X ST Boost", description: "Double your ST rewards for 30 minutes. Stack with streak bonuses.", price: 750, category: "boost", rarity: "rare", icon: Zap, owned: false, equipped: false, consumable: true, limited: false, featured: false, boostType: "stMultiplier", boostDuration: 30, boostValue: 2 },
  { id: "boost-xp-50", name: "+50% XP Boost", description: "Earn 50% more XP for 60 minutes. Level up faster.", price: 500, category: "boost", rarity: "common", icon: TrendingUp, owned: false, equipped: false, consumable: true, limited: false, featured: false, boostType: "xpMultiplier", boostDuration: 60, boostValue: 1.5 },
  { id: "boost-xp-overdrive", name: "XP Overdrive", description: "+50% XP bonus on all missions for 6 hours. Massive level gains.", price: 600, category: "boost", rarity: "epic", icon: TrendingUp, owned: false, equipped: false, consumable: true, limited: false, featured: false, boostType: "xpMultiplier", boostDuration: 360, boostValue: 1.5 },
  { id: "boost-streak-shield", name: "Streak Shield", description: "Protect your streak from one missed day. Use it wisely.", price: 1200, category: "boost", rarity: "epic", icon: Shield, owned: false, equipped: false, consumable: true, limited: false, featured: false, boostType: "streakShield", boostDuration: 1, boostValue: 1 },
  { id: "boost-streak-shield-3x", name: "3X Streak Shield Bundle", description: "Protects your streak for up to 3 missed days. Maximum security.", price: 1800, category: "boost", rarity: "epic", icon: Shield, owned: false, equipped: false, consumable: true, limited: false, featured: false, boostType: "streakShield", boostDuration: 3, boostValue: 3, requiredLevel: 15 },
  { id: "boost-daily-bonus", name: "Daily Bonus", description: "Claim an extra 500 ST bonus on your next daily check-in.", price: 400, category: "boost", rarity: "common", icon: Gift, owned: false, equipped: false, consumable: true, limited: false, featured: false, boostType: "dailyBonus", boostDuration: 1, boostValue: 500 },
  { id: "boost-2x-st-60", name: "2X ST Boost (60m)", description: "Double ST rewards for a full hour. Maximum grind session.", price: 1200, category: "boost", rarity: "epic", icon: Flame, owned: false, equipped: false, consumable: true, limited: false, featured: false, boostType: "stMultiplier", boostDuration: 60, boostValue: 2 },
  { id: "boost-mission-reroll", name: "Mission Reroll Ticket", description: "Instantly swap out an unwanted daily mission for a new one.", price: 150, category: "boost", rarity: "common", icon: RefreshCw, owned: false, equipped: false, consumable: true, limited: false, featured: false },

  // STATUS
  { id: "status-elite-grinder", name: "Elite Grinder Title", description: "A title that says: I don't just participate, I dominate.", price: 10000, category: "status", rarity: "legendary", icon: Trophy, owned: false, equipped: false, consumable: false, limited: false, featured: false, requiredLevel: 22 },
  { id: "status-founder", name: "Founder Badge", description: "Early adopter status. You were here from the beginning.", price: 5000, category: "status", rarity: "mythic", icon: Award, owned: false, equipped: false, consumable: false, limited: true, featured: false },
  { id: "status-unstoppable", name: "Unstoppable Title", description: "For those who maintain 30+ day streaks.", price: 8000, category: "status", rarity: "legendary", icon: Flame, owned: false, equipped: false, consumable: false, limited: false, featured: false, requiredLevel: 20 },
  { id: "status-top10-badge", name: "Top 10 Badge", description: "Only visible to the global elite. Earn it through performance.", price: 15000, category: "status", rarity: "mythic", icon: Star, owned: false, equipped: false, consumable: false, limited: true, featured: false, requiredLevel: 28 },

  // EXPERIENCE
  { id: "exp-mystery-box", name: "Mystery Reward", description: "Contains a random item from Common to Legendary. What will you get?", price: 500, category: "experience", rarity: "rare", icon: Gem, owned: false, equipped: false, consumable: true, limited: false, featured: false },
  { id: "exp-bonus-mission", name: "Bonus Mission Pass", description: "Unlock a special high-reward mission worth 2X normal yield.", price: 800, category: "experience", rarity: "rare", icon: Target, owned: false, equipped: false, consumable: true, limited: false, featured: false },

  // IRL REWARDS
  { id: "irl-coffee", name: "Coffee Treat", description: "Redeem for a real coffee. You earned it, grinder.", price: 800, category: "experience", rarity: "common", icon: Coffee, owned: false, equipped: false, consumable: true, limited: false, featured: false },
  { id: "irl-pizza", name: "Pizza Night", description: "A whole pizza, on the house. Celebrate your wins.", price: 1500, category: "experience", rarity: "rare", icon: Pizza, owned: false, equipped: false, consumable: true, limited: false, featured: false, requiredLevel: 12 },
  { id: "irl-spotify", name: "1-Month Spotify Premium", description: "A full month of music. Grind to the beat.", price: 3000, category: "experience", rarity: "epic", icon: Music, owned: false, equipped: false, consumable: true, limited: false, featured: false, requiredLevel: 16 },

  // COMMUNITY
  { id: "com-gift-500", name: "Gift 500 ST", description: "Send 500 ST to a friend. Spread the productivity wealth.", price: 500, category: "community", rarity: "common", icon: Heart, owned: false, equipped: false, consumable: true, limited: false, featured: false },
  { id: "com-celebration", name: "Celebration Effect", description: "Trigger a confetti celebration when a friend completes a task.", price: 300, category: "community", rarity: "common", icon: Sparkles, owned: false, equipped: false, consumable: true, limited: false, featured: false },
];

export const STORE_COLLECTIONS: Collection[] = [
  {
    id: "col-champion",
    name: "Champion Collection",
    description: "For the top performers who dominate the leaderboard.",
    icon: "🏆",
    items: ["item-gold-crown", "item-diamond-frame", "status-elite-grinder", "status-top10-badge", "item-elite-nameplate"],
    reward: { st: 5000, xp: 1000, badge: "champion-collector" },
    completed: false,
  },
  {
    id: "col-productivity",
    name: "Productivity Collection",
    description: "Essential tools for the focused grinder.",
    icon: "⚡",
    items: ["item-epic-frame", "item-minimal-theme", "boost-2x-st", "boost-xp-50"],
    reward: { st: 2500, xp: 500 },
    completed: false,
  },
  {
    id: "col-nightowl",
    name: "Night Owl Collection",
    description: "For those who grind while the world sleeps.",
    icon: "🌙",
    items: ["item-neon-night", "item-moon-frame", "item-midnight-theme"],
    reward: { st: 3000, xp: 750 },
    completed: false,
  },
];

export const DAILY_DROP_ITEM: ShopItem = {
  id: "item-cherry-blossom",
  name: "Cherry Blossom Frame",
  description: "A delicate frame that blooms with every task completed. Today's exclusive drop.",
  price: 1200,
  category: "customize",
  rarity: "rare",
  icon: Heart,
  owned: false,
  equipped: false,
  consumable: false,
  limited: true,
  featured: false,
};

export const FLASH_SALE_ITEM: ShopItem = {
  id: "boost-2x-st-60",
  name: "2X ST Boost (60m)",
  description: "Double ST rewards for a full hour. Flash sale — 40% off!",
  price: 720,
  category: "boost",
  rarity: "epic",
  icon: Zap,
  owned: false,
  equipped: false,
  consumable: true,
  limited: true,
  featured: false,
  boostType: "stMultiplier",
  boostDuration: 60,
  boostValue: 2,
};

export const FEATURED_ITEM: ShopItem = STORE_CATALOG.find(i => i.id === "item-gold-crown")!;
