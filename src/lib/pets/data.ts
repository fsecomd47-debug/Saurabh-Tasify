/**
 * SaurabhTask Pet Definitions — authoritative server-defined pet configuration.
 * Plain data only so both client and server can consume it.
 * Prices, mining rates, and XP boosts here are THE values.
 */

export type PetRarity = "common" | "rare" | "epic" | "legendary" | "mythic";
export type PetArchetype = "miner" | "scholar" | "scout" | "balanced" | "specialist";

export type PetDefinition = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  personality: string;
  level: number;
  rarity: PetRarity;
  priceSt: number;
  miningRatePerMinute: number;
  xpBoostPercent: number;
  archetype: PetArchetype;
  xpPerLevel: number;
  miningRateGrowth: number;
  xpBoostGrowth: number;
  unlockPlayerLevel: number;
  assetGradient: string;
};

export const PET_DEFINITIONS: PetDefinition[] = [
  // ── Level 0 — Starter Pets ──────────────────────────────────
  {
    id: "pet-kitty",
    name: "Kitty",
    emoji: "🐱",
    description: "A tiny companion with a big heart for ST.",
    personality: "Small paws. Big hustle.",
    level: 0,
    rarity: "common",
    priceSt: 200,
    miningRatePerMinute: 0.8,
    xpBoostPercent: 6,
    archetype: "scholar",
    xpPerLevel: 80,
    miningRateGrowth: 0.15,
    xpBoostGrowth: 0.8,
    unlockPlayerLevel: 1,
    assetGradient: "#F472B6 → #EC4899",
  },
  {
    id: "pet-duckie",
    name: "Duckie",
    emoji: "🦆",
    description: "A cheerful worker who never misses a day.",
    personality: "Waddle. Mine. Repeat.",
    level: 0,
    rarity: "common",
    priceSt: 250,
    miningRatePerMinute: 1.0,
    xpBoostPercent: 3,
    archetype: "balanced",
    xpPerLevel: 80,
    miningRateGrowth: 0.18,
    xpBoostGrowth: 0.5,
    unlockPlayerLevel: 1,
    assetGradient: "#FBBF24 → #F59E0B",
  },
  {
    id: "pet-bunny",
    name: "Bunny",
    emoji: "🐰",
    description: "Fast ears, faster progress.",
    personality: "Quick feet. Quick ST.",
    level: 0,
    rarity: "common",
    priceSt: 200,
    miningRatePerMinute: 0.7,
    xpBoostPercent: 5,
    archetype: "scout",
    xpPerLevel: 80,
    miningRateGrowth: 0.12,
    xpBoostGrowth: 0.7,
    unlockPlayerLevel: 1,
    assetGradient: "#A78BFA → #8B5CF6",
  },
  {
    id: "pet-penguin",
    name: "Penguin",
    emoji: "🐧",
    description: "Steady miner who finds ST in the cold.",
    personality: "Cool head. Warm ST.",
    level: 0,
    rarity: "common",
    priceSt: 300,
    miningRatePerMinute: 1.2,
    xpBoostPercent: 1,
    archetype: "miner",
    xpPerLevel: 80,
    miningRateGrowth: 0.22,
    xpBoostGrowth: 0.3,
    unlockPlayerLevel: 1,
    assetGradient: "#60A5FA → #3B82F6",
  },
  {
    id: "pet-pup",
    name: "Pup",
    emoji: "🐶",
    description: "Loyal friend, reliable worker.",
    personality: "Always by your side.",
    level: 0,
    rarity: "common",
    priceSt: 250,
    miningRatePerMinute: 1.0,
    xpBoostPercent: 3,
    archetype: "balanced",
    xpPerLevel: 80,
    miningRateGrowth: 0.18,
    xpBoostGrowth: 0.5,
    unlockPlayerLevel: 1,
    assetGradient: "#FB923C → #F97316",
  },

  // ── Level 1 — Advanced Pets ─────────────────────────────────
  {
    id: "pet-bear",
    name: "Bear",
    emoji: "🐻",
    description: "A powerhouse that mines through anything.",
    personality: "Strong arms. Strong ST.",
    level: 1,
    rarity: "rare",
    priceSt: 1200,
    miningRatePerMinute: 1.8,
    xpBoostPercent: 2,
    archetype: "miner",
    xpPerLevel: 120,
    miningRateGrowth: 0.25,
    xpBoostGrowth: 0.4,
    unlockPlayerLevel: 3,
    assetGradient: "#A16207 → #854D0E",
  },
  {
    id: "pet-foxxie",
    name: "Foxxie",
    emoji: "🦊",
    description: "Clever and quick. Stacks ST while you work.",
    personality: "Quietly stacking ST.",
    level: 1,
    rarity: "rare",
    priceSt: 1500,
    miningRatePerMinute: 2.0,
    xpBoostPercent: 4,
    archetype: "balanced",
    xpPerLevel: 120,
    miningRateGrowth: 0.22,
    xpBoostGrowth: 0.6,
    unlockPlayerLevel: 3,
    assetGradient: "#F97316 → #EA580C",
  },
  {
    id: "pet-guingguin",
    name: "Guingguin",
    emoji: "🐧",
    description: "A distinguished penguin with elite mining skills.",
    personality: "Formal. Focused. Fast.",
    level: 1,
    rarity: "rare",
    priceSt: 1400,
    miningRatePerMinute: 2.2,
    xpBoostPercent: 2,
    archetype: "miner",
    xpPerLevel: 120,
    miningRateGrowth: 0.28,
    xpBoostGrowth: 0.35,
    unlockPlayerLevel: 3,
    assetGradient: "#0EA5E9 → #0284C7",
  },
  {
    id: "pet-tiger",
    name: "Tiger",
    emoji: "🐯",
    description: "Fierce focus. Maximum XP acceleration.",
    personality: "Fast learner. Faster progress.",
    level: 1,
    rarity: "rare",
    priceSt: 1300,
    miningRatePerMinute: 1.5,
    xpBoostPercent: 7,
    archetype: "scholar",
    xpPerLevel: 120,
    miningRateGrowth: 0.18,
    xpBoostGrowth: 1.0,
    unlockPlayerLevel: 3,
    assetGradient: "#F59E0B → #D97706",
  },
  {
    id: "pet-koala",
    name: "Koala",
    emoji: "🐨",
    description: "Chill exterior. Serious mining core.",
    personality: "Slow and steady wins ST.",
    level: 1,
    rarity: "rare",
    priceSt: 1100,
    miningRatePerMinute: 1.6,
    xpBoostPercent: 5,
    archetype: "scout",
    xpPerLevel: 120,
    miningRateGrowth: 0.2,
    xpBoostGrowth: 0.7,
    unlockPlayerLevel: 3,
    assetGradient: "#78716C → #57534E",
  },

  // ── Level 2 — Elite Pets ────────────────────────────────────
  {
    id: "pet-wolf",
    name: "Wolf",
    emoji: "🐺",
    description: "Always working. Never stops.",
    personality: "Always working.",
    level: 2,
    rarity: "epic",
    priceSt: 3500,
    miningRatePerMinute: 2.8,
    xpBoostPercent: 5,
    archetype: "balanced",
    xpPerLevel: 160,
    miningRateGrowth: 0.3,
    xpBoostGrowth: 0.7,
    unlockPlayerLevel: 6,
    assetGradient: "#6366F1 → #4F46E5",
  },
  {
    id: "pet-panther",
    name: "Panther",
    emoji: "🐆",
    description: "Silent and deadly efficient at mining ST.",
    personality: "Silent but productive.",
    level: 2,
    rarity: "epic",
    priceSt: 3800,
    miningRatePerMinute: 3.0,
    xpBoostPercent: 3,
    archetype: "miner",
    xpPerLevel: 160,
    miningRateGrowth: 0.35,
    xpBoostGrowth: 0.4,
    unlockPlayerLevel: 6,
    assetGradient: "#1E293B → #0F172A",
  },

  // ── Level 3 — Legendary Pets ────────────────────────────────
  {
    id: "pet-dragon",
    name: "Dragon",
    emoji: "🐉",
    description: "Built for big goals. Mines legendary ST.",
    personality: "Built for big goals.",
    level: 3,
    rarity: "legendary",
    priceSt: 8000,
    miningRatePerMinute: 4.5,
    xpBoostPercent: 8,
    archetype: "specialist",
    xpPerLevel: 200,
    miningRateGrowth: 0.4,
    xpBoostGrowth: 1.0,
    unlockPlayerLevel: 10,
    assetGradient: "#DC2626 → #B91C1C",
  },
  {
    id: "pet-phoenix",
    name: "Phoenix",
    emoji: "🔥",
    description: "Rises with every mission. Maximum XP synergy.",
    personality: "Reborn through productivity.",
    level: 3,
    rarity: "legendary",
    priceSt: 7500,
    miningRatePerMinute: 3.5,
    xpBoostPercent: 12,
    archetype: "scholar",
    xpPerLevel: 200,
    miningRateGrowth: 0.3,
    xpBoostGrowth: 1.5,
    unlockPlayerLevel: 10,
    assetGradient: "#F97316 → #DC2626",
  },

  // ── Level 5 — Mythic Pet ────────────────────────────────────
  {
    id: "pet-unicorn",
    name: "Unicorn",
    emoji: "🦄",
    description: "The ultimate companion. Supreme mining and XP.",
    personality: "Magic in every ST.",
    level: 5,
    rarity: "mythic",
    priceSt: 20000,
    miningRatePerMinute: 6.0,
    xpBoostPercent: 15,
    archetype: "specialist",
    xpPerLevel: 300,
    miningRateGrowth: 0.5,
    xpBoostGrowth: 2.0,
    unlockPlayerLevel: 15,
    assetGradient: "#EC4899 → #8B5CF6",
  },
];

export const PET_BY_ID: Record<string, PetDefinition> = Object.fromEntries(
  PET_DEFINITIONS.map((p) => [p.id, p])
);

export const PET_RARITY_CONFIG: Record<PetRarity, { label: string; color: string; bg: string }> = {
  common: { label: "Common", color: "#94A3B8", bg: "#F1F5F9" },
  rare: { label: "Rare", color: "#3B82F6", bg: "#DBEAFE" },
  epic: { label: "Epic", color: "#8B5CF6", bg: "#EDE9FE" },
  legendary: { label: "Legendary", color: "#F59E0B", bg: "#FEF3C7" },
  mythic: { label: "Mythic", color: "#EF4444", bg: "#FEE2E2" },
};

export const PET_ARCHETYPE_CONFIG: Record<PetArchetype, { label: string; icon: string }> = {
  miner: { label: "Miner", icon: "⛏" },
  scholar: { label: "Scholar", icon: "⚡" },
  scout: { label: "Scout", icon: "🏃" },
  balanced: { label: "Balanced", icon: "◆" },
  specialist: { label: "Specialist", icon: "★" },
};

/** Max daily pet mining earnings cap (server-authoritative). */
export const PET_MINING_DAILY_CAP = 500;

/** Mining settlement interval in minutes. */
export const PET_MINING_SETTLE_INTERVAL = 5;

/** Max offline accumulation in hours. */
export const PET_MAX_OFFLINE_HOURS = 24;

/** XP granted to active pet per verified mission (proportional to mission XP). */
export const PET_MISSION_XP_RATIO = 0.1;
