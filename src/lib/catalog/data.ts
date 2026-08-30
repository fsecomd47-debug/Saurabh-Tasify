/**
 * SaurabhTask Store Catalog — authoritative server-defined configuration.
 * Plain data only (no React/UI imports) so both client and server can consume it.
 * Prices here are THE prices. The client may never submit one.
 */

export type CatalogCategory = "customize" | "boost" | "status" | "experience";
export type CatalogRarity = "common" | "rare" | "epic" | "legendary" | "mythic";
export type EquipSlot = "frame" | "theme" | "nameplate" | "title";
export type BoostType = "stMultiplier" | "xpMultiplier" | "streakShield" | "dailyBonus" | "mysteryBox";

export type CatalogItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: CatalogCategory;
  rarity: CatalogRarity;
  slot?: EquipSlot;
  consumable: boolean;
  featured?: boolean;
  limited?: boolean;
  collectionId?: string;
  requiredLevel?: number;
  boostType?: BoostType;
  boostDurationMinutes?: number;
  boostValue?: number;
};

export const CATALOG: CatalogItem[] = [
  // ── Featured ──────────────────────────────────────────────
  { id: "item-gold-crown", name: "Golden Crown", description: "The ultimate symbol of productivity royalty. Wear it with pride.", price: 7500, category: "status", rarity: "legendary", slot: "title", consumable: false, featured: true, collectionId: "col-champion" },
  { id: "item-neon-night", name: "Neon Night Theme", description: "Transform your interface into a sleek midnight workspace.", price: 2500, category: "customize", rarity: "epic", slot: "theme", consumable: false, featured: true, collectionId: "col-nightowl" },

  // ── Limited drop ─────────────────────────────────────────
  { id: "item-cherry-blossom", name: "Cherry Blossom Frame", description: "A delicate frame that blooms with every task completed.", price: 1200, category: "customize", rarity: "rare", slot: "frame", consumable: false, limited: true },

  // ── Frames ────────────────────────────────────────────────
  { id: "item-epic-frame", name: "Epic Avatar Frame", description: "A glowing purple frame that radiates energy.", price: 1800, category: "customize", rarity: "epic", slot: "frame", consumable: false, collectionId: "col-productivity" },
  { id: "item-diamond-frame", name: "Diamond Frame", description: "Crystalline perfection for the dedicated grinder.", price: 4500, category: "customize", rarity: "legendary", slot: "frame", consumable: false },
  { id: "item-fire-frame", name: "Inferno Frame", description: "Burn through your tasks with this blazing frame.", price: 3200, category: "customize", rarity: "epic", slot: "frame", consumable: false },
  { id: "item-moon-frame", name: "Moonlight Frame", description: "For the night owls who grind while others sleep.", price: 1500, category: "customize", rarity: "rare", slot: "frame", consumable: false, collectionId: "col-nightowl" },
  { id: "item-gold-aura", name: "Animated Gold Aura", description: "A floating particle ring around your profile picture. Pure prestige.", price: 5000, category: "customize", rarity: "legendary", slot: "frame", consumable: false, requiredLevel: 25 },

  // ── Themes ────────────────────────────────────────────────
  { id: "item-minimal-theme", name: "Minimal Theme", description: "Clean, focused, distraction-free. Pure productivity.", price: 1000, category: "customize", rarity: "common", slot: "theme", consumable: false, collectionId: "col-productivity" },
  { id: "item-midnight-theme", name: "Midnight Theme", description: "Dark mode elevated. Deep blacks and soft purples.", price: 2000, category: "customize", rarity: "rare", slot: "theme", consumable: false, collectionId: "col-nightowl" },
  { id: "item-sunset-theme", name: "Sunset Gradient", description: "Warm gradients that make every session feel golden.", price: 1800, category: "customize", rarity: "rare", slot: "theme", consumable: false },
  { id: "item-cyberpunk-theme", name: "Cyberpunk Neon Theme", description: "Reskins the entire app into dark neon. The ultimate flex.", price: 2500, category: "customize", rarity: "epic", slot: "theme", consumable: false, requiredLevel: 18 },

  // ── Nameplates & titles ───────────────────────────────────
  { id: "item-elite-nameplate", name: "Elite Nameplate", description: "A premium name bar that signals dedication.", price: 2200, category: "customize", rarity: "epic", slot: "nameplate", consumable: false, collectionId: "col-champion" },
  { id: "item-neon-nameplate", name: "Neon Nameplate", description: "Electric purple glow for your player name.", price: 1500, category: "customize", rarity: "rare", slot: "nameplate", consumable: false },
  { id: "status-founder", name: "Founder Badge", description: "Early adopter status. You were here from the beginning.", price: 5000, category: "status", rarity: "mythic", slot: "title", consumable: false, limited: true },
  { id: "status-unstoppable", name: "Unstoppable Title", description: "For those who maintain 30+ day streaks.", price: 8000, category: "status", rarity: "legendary", slot: "title", consumable: false, requiredLevel: 20 },
  { id: "status-elite-grinder", name: "Elite Grinder Title", description: "A title that says: I don't just participate, I dominate.", price: 10000, category: "status", rarity: "legendary", slot: "title", consumable: false, requiredLevel: 22, collectionId: "col-champion" },
  { id: "status-top10-badge", name: "Top 10 Badge", description: "Only visible to the global elite. Earn it through performance.", price: 15000, category: "status", rarity: "mythic", slot: "title", consumable: false, limited: true, requiredLevel: 28 },

  // ── Boosts (consumable, activate on purchase) ────────────
  { id: "boost-2x-st", name: "2X ST Boost", description: "Double your ST rewards for 30 minutes. Stacks with streak bonuses.", price: 750, category: "boost", rarity: "rare", consumable: true, boostType: "stMultiplier", boostDurationMinutes: 30, boostValue: 2, collectionId: "col-productivity" },
  { id: "boost-xp-50", name: "+50% XP Boost", description: "Earn 50% more XP for 60 minutes. Level up faster.", price: 500, category: "boost", rarity: "common", consumable: true, boostType: "xpMultiplier", boostDurationMinutes: 60, boostValue: 1.5, collectionId: "col-productivity" },
  { id: "boost-xp-overdrive", name: "XP Overdrive", description: "+50% XP bonus on all missions for 6 hours. Massive level gains.", price: 600, category: "boost", rarity: "epic", consumable: true, boostType: "xpMultiplier", boostDurationMinutes: 360, boostValue: 1.5 },
  { id: "boost-2x-st-60", name: "2X ST Boost (60m)", description: "Double ST rewards for a full hour. Maximum grind session.", price: 1200, category: "boost", rarity: "epic", consumable: true, boostType: "stMultiplier", boostDurationMinutes: 60, boostValue: 2 },
  { id: "boost-streak-shield", name: "Streak Shield", description: "Protect your streak from one missed day. Use it wisely.", price: 1200, category: "boost", rarity: "epic", consumable: true, boostType: "streakShield", boostValue: 1 },
  { id: "boost-daily-bonus", name: "Daily Bonus", description: "Instantly claim a +500 ST wealth injection.", price: 400, category: "boost", rarity: "common", consumable: true, boostType: "dailyBonus", boostValue: 500 },

  // ── Experience / IRL rewards ─────────────────────────────
  { id: "exp-mystery-box", name: "Mystery Reward", description: "Contains a random ST payout between 100 and 900. What will you get?", price: 500, category: "experience", rarity: "rare", consumable: true, boostType: "mysteryBox" },
  { id: "irl-coffee", name: "Coffee Treat", description: "Redeem for a real coffee. You earned it, grinder.", price: 800, category: "experience", rarity: "common", consumable: true },
  { id: "irl-pizza", name: "Pizza Night", description: "A whole pizza, on the house. Celebrate your wins.", price: 1500, category: "experience", rarity: "rare", consumable: true, requiredLevel: 12 },
  { id: "irl-spotify", name: "1-Month Spotify Premium", description: "A full month of music. Grind to the beat.", price: 3000, category: "experience", rarity: "epic", consumable: true, requiredLevel: 16 },
];

/** Fast id → item lookup. */
export const CATALOG_BY_ID: Record<string, CatalogItem> = Object.fromEntries(
  CATALOG.map((i) => [i.id, i])
);

export type CatalogCollection = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  items: string[];
  reward: { st: number; xp: number; badge?: string };
};

export const COLLECTIONS: CatalogCollection[] = [
  {
    id: "col-champion",
    name: "Champion Collection",
    description: "For the top performers who dominate the leaderboard.",
    emoji: "🏆",
    items: ["item-gold-crown", "item-diamond-frame", "status-elite-grinder", "status-top10-badge", "item-elite-nameplate"],
    reward: { st: 5000, xp: 1000, badge: "champion-collector" },
  },
  {
    id: "col-productivity",
    name: "Productivity Collection",
    description: "Essential tools for the focused grinder.",
    emoji: "⚡",
    items: ["item-epic-frame", "item-minimal-theme", "boost-2x-st", "boost-xp-50"],
    reward: { st: 2500, xp: 500 },
  },
  {
    id: "col-nightowl",
    name: "Night Owl Collection",
    description: "For those who grind while the world sleeps.",
    emoji: "🌙",
    items: ["item-neon-night", "item-moon-frame", "item-midnight-theme"],
    reward: { st: 3000, xp: 750 },
  },
];

/* ── Onboarding avatars ─────────────────────────────────────── */

export type AvatarDef = {
  id: string;
  emoji: string;
  label: string;
  gradient: string;
};

export const AVATARS: AvatarDef[] = [
  { id: "avatar-wolf", emoji: "🐺", label: "Wolf", gradient: "#7C5CFF → #4C1D95" },
  { id: "avatar-tiger", emoji: "🐯", label: "Tiger", gradient: "#F59E0B → #EF4444" },
  { id: "avatar-ninja", emoji: "🥷", label: "Ninja", gradient: "#334155 → #0F172A" },
  { id: "avatar-wizard", emoji: "🧙", label: "Wizard", gradient: "#8B5CF6 → #6366F1" },
  { id: "avatar-rocket", emoji: "🚀", label: "Rocket", gradient: "#06B6D4 → #3B82F6" },
  { id: "avatar-fire", emoji: "🔥", label: "Flame", gradient: "#F97316 → #EF4444" },
  { id: "avatar-star", emoji: "⭐", label: "Star", gradient: "#F59E0B → #FBBF24" },
  { id: "avatar-brain", emoji: "🧠", label: "Mind", gradient: "#EC4899 → #8B5CF6" },
  { id: "avatar-dev", emoji: "💻", label: "Builder", gradient: "#10B981 → #059669" },
  { id: "avatar-crown", emoji: "👑", label: "Royalty", gradient: "#FFD700 → #B8860B" },
];

export const AVATARS_BY_ID: Record<string, AvatarDef> = Object.fromEntries(
  AVATARS.map((a) => [a.id, a])
);

export function getAvatarEmoji(avatarId: string): string {
  return AVATARS_BY_ID[avatarId]?.emoji ?? "👤";
}

/* ── Leaderboard tiers ──────────────────────────────────────── */

export const TIERS = [
  { name: "Bronze Beginner", min: 0, color: "#CD7F32" },
  { name: "Silver Scholar", min: 10000, color: "#94A3B8" },
  { name: "Gold Hustler", min: 30000, color: "#EAB308" },
  { name: "Platinum Whale", min: 60000, color: "#22D3EE" },
  { name: "Diamond Mogul", min: 100000, color: "#67E8F9" },
] as const;

export function tierFor(totalAssets: number): string {
  let tier = TIERS[0].name as string;
  for (const t of TIERS) if (totalAssets >= t.min) tier = t.name;
  return tier;
}

/** Starter economy constants (spec §23/§24/§59). */
export const STARTER = {
  welcomeBonusST: 100,
  firstMissionReward: 100,
  firstMissionXP: 50,
} as const;

export const EQUIP_SLOTS: EquipSlot[] = ["frame", "theme", "nameplate", "title"];
