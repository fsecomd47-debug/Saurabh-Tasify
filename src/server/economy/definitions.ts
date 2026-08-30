import "server-only";

/* ─────────────────────────── Quests ──────────────────────────────── */

export type QuestObjectiveDef = {
  key: string;
  type: "counter" | "profile_flag" | "live_streak";
  target: number;
  label: string;
};

export type QuestDef = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  objectives: QuestObjectiveDef[];
  reward: { st: number; xp: number };
};

export const WELCOME_QUEST_ID = "welcome-quest";
export const WEEKLY_GRIND_ID = "weekly-grind";

export const QUEST_DEFS: Record<string, QuestDef> = {
  [WELCOME_QUEST_ID]: {
    id: WELCOME_QUEST_ID,
    title: "Welcome Quest",
    description: "Your origin story. Complete these to claim your founding reward.",
    emoji: "🚀",
    objectives: [
      { key: "profile_created", type: "profile_flag", target: 1, label: "Create your profile" },
      { key: "tasks_completed", type: "counter", target: 1, label: "Complete your first task" },
      { key: "st_earned", type: "counter", target: 250, label: "Earn 250 ST" },
      { key: "first_streak", type: "live_streak", target: 2, label: "Protect your first streak" },
    ],
    reward: { st: 500, xp: 250 },
  },
  [WEEKLY_GRIND_ID]: {
    id: WEEKLY_GRIND_ID,
    title: "Weekly Grind",
    description: "Complete 10 missions this week for a massive payout.",
    emoji: "⚡",
    objectives: [{ key: "weekly_tasks", type: "counter", target: 10, label: "Complete 10 tasks this week" }],
    reward: { st: 2500, xp: 500 },
  },
};

/** ISO week end (Sunday 23:59 UTC) for the weekly quest window. */
export function weekEnd(from: Date = new Date()): Date {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const day = d.getUTCDay(); // 0=Sun
  const daysToSunday = (7 - day) % 7;
  d.setUTCDate(d.getUTCDate() + daysToSunday);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

/* ──────────────────────── Achievements ───────────────────────────── */

export type AchievementStats = {
  tasksCompleted: number;
  lifetimeEarned: number;
  streakCurrent: number;
  bestStreak: number;
  hardTasksCompleted: number;
  itemsBought: number;
  petsOwned: number;
  petLevel: number;
  miningTotal: number;
  missionsThisWeek: number;
  perfectDays: number;
  earlyBirdTasks: number;
  level: number;
  balance: number;
  friendsCount: number;
  challengesWon: number;
  challengesLost: number;
};

export type AchievementDef = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: "milestone" | "skill" | "wealth" | "streak" | "collection" | "social" | "secret";
  rarity: "common" | "rare" | "epic" | "legendary" | "mythic";
  rewardSt: number;
  rewardXp: number;
  check: (stats: AchievementStats) => boolean;
  progress: (stats: AchievementStats) => number; // 0..1
};

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // ═══════════════════════════════════════════════════════════════
  //  MILESTONE BADGES — Progress-based
  // ═══════════════════════════════════════════════════════════════
  {
    id: "starter-badge",
    name: "Identity Forged",
    description: "Complete onboarding and create your player profile.",
    emoji: "🎖️",
    category: "milestone",
    rarity: "common",
    rewardSt: 0,
    rewardXp: 0,
    check: () => true,
    progress: () => 1,
  },
  {
    id: "first-blood",
    name: "First Blood",
    description: "Complete your very first mission. The journey begins.",
    emoji: "🩸",
    category: "milestone",
    rarity: "common",
    rewardSt: 100,
    rewardXp: 50,
    check: (s) => s.tasksCompleted >= 1,
    progress: (s) => Math.min(1, s.tasksCompleted),
  },
  {
    id: "double-digit",
    name: "Double Digits",
    description: "Complete 10 missions. You're building momentum.",
    emoji: "🔟",
    category: "milestone",
    rarity: "common",
    rewardSt: 250,
    rewardXp: 100,
    check: (s) => s.tasksCompleted >= 10,
    progress: (s) => Math.min(1, s.tasksCompleted / 10),
  },
  {
    id: "half-century",
    name: "Half Century",
    description: "Complete 50 missions. Dedication personified.",
    emoji: "🏅",
    category: "milestone",
    rarity: "rare",
    rewardSt: 1500,
    rewardXp: 400,
    check: (s) => s.tasksCompleted >= 50,
    progress: (s) => Math.min(1, s.tasksCompleted / 50),
  },
  {
    id: "centurion",
    name: "Centurion",
    description: "Complete 100 missions. A true warrior of productivity.",
    emoji: "⚔️",
    category: "milestone",
    rarity: "epic",
    rewardSt: 5000,
    rewardXp: 1000,
    check: (s) => s.tasksCompleted >= 100,
    progress: (s) => Math.min(1, s.tasksCompleted / 100),
  },
  {
    id: "legend",
    name: "Living Legend",
    description: "Complete 250 missions. Your name echoes through the halls.",
    emoji: "🏆",
    category: "milestone",
    rarity: "legendary",
    rewardSt: 15000,
    rewardXp: 3000,
    check: (s) => s.tasksCompleted >= 250,
    progress: (s) => Math.min(1, s.tasksCompleted / 250),
  },

  // ═══════════════════════════════════════════════════════════════
  //  STREAK BADGES — Consistency-based
  // ═══════════════════════════════════════════════════════════════
  {
    id: "hot-streak",
    name: "On Fire",
    description: "Maintain a 7-day streak. The flame ignites.",
    emoji: "🔥",
    category: "streak",
    rarity: "common",
    rewardSt: 300,
    rewardXp: 150,
    check: (s) => s.bestStreak >= 7,
    progress: (s) => Math.min(1, s.bestStreak / 7),
  },
  {
    id: "two-week-warrior",
    name: "Two Week Warrior",
    description: "Maintain a 14-day streak. Consistency is power.",
    emoji: "⚡",
    category: "streak",
    rarity: "rare",
    rewardSt: 800,
    rewardXp: 300,
    check: (s) => s.bestStreak >= 14,
    progress: (s) => Math.min(1, s.bestStreak / 14),
  },
  {
    id: "unstoppable",
    name: "Unstoppable",
    description: "Reach a 30-day streak. Legendary territory.",
    emoji: "👑",
    category: "streak",
    rarity: "legendary",
    rewardSt: 2000,
    rewardXp: 500,
    check: (s) => s.bestStreak >= 30,
    progress: (s) => Math.min(1, s.bestStreak / 30),
  },
  {
    id: "iron-will",
    name: "Iron Will",
    description: "Reach a 60-day streak. Your discipline is unbreakable.",
    emoji: "🛡️",
    category: "streak",
    rarity: "mythic",
    rewardSt: 10000,
    rewardXp: 2000,
    check: (s) => s.bestStreak >= 60,
    progress: (s) => Math.min(1, s.bestStreak / 60),
  },
  {
    id: "perfect-week",
    name: "Perfect Week",
    description: "Complete at least one mission every day for 7 days straight.",
    emoji: "✨",
    category: "streak",
    rarity: "rare",
    rewardSt: 750,
    rewardXp: 200,
    check: (s) => s.perfectDays >= 7,
    progress: (s) => Math.min(1, s.perfectDays / 7),
  },

  // ═══════════════════════════════════════════════════════════════
  //  WEALTH BADGES — Economy-based
  // ═══════════════════════════════════════════════════════════════
  {
    id: "money-maker",
    name: "Money Maker",
    description: "Earn a lifetime total of 10,000 ST.",
    emoji: "💰",
    category: "wealth",
    rarity: "rare",
    rewardSt: 1000,
    rewardXp: 250,
    check: (s) => s.lifetimeEarned >= 10000,
    progress: (s) => Math.min(1, s.lifetimeEarned / 10000),
  },
  {
    id: "vault-digger",
    name: "Vault Digger",
    description: "Earn a lifetime total of 50,000 ST. Wealth flows to you.",
    emoji: "⛏️",
    category: "wealth",
    rarity: "epic",
    rewardSt: 3000,
    rewardXp: 600,
    check: (s) => s.lifetimeEarned >= 50000,
    progress: (s) => Math.min(1, s.lifetimeEarned / 50000),
  },
  {
    id: "diamond-hands",
    name: "Diamond Hands",
    description: "Accumulate a balance of 25,000 ST without spending.",
    emoji: "💎",
    category: "wealth",
    rarity: "epic",
    rewardSt: 2500,
    rewardXp: 500,
    check: (s) => s.balance >= 25000,
    progress: (s) => Math.min(1, s.balance / 25000),
  },
  {
    id: "tycoon",
    name: "Tycoon",
    description: "Earn a lifetime total of 500,000 ST. An empire builder.",
    emoji: "🏦",
    category: "wealth",
    rarity: "mythic",
    rewardSt: 25000,
    rewardXp: 5000,
    check: (s) => s.lifetimeEarned >= 500000,
    progress: (s) => Math.min(1, s.lifetimeEarned / 500000),
  },

  // ═══════════════════════════════════════════════════════════════
  //  SKILL BADGES — Difficulty-based
  // ═══════════════════════════════════════════════════════════════
  {
    id: "hard-hitter",
    name: "Hard Hitter",
    description: "Complete 10 hard or elite difficulty missions.",
    emoji: "🔨",
    category: "skill",
    rarity: "rare",
    rewardSt: 1000,
    rewardXp: 300,
    check: (s) => s.hardTasksCompleted >= 10,
    progress: (s) => Math.min(1, s.hardTasksCompleted / 10),
  },
  {
    id: "early-bird",
    name: "Early Bird",
    description: "Complete 5 missions before 8 AM. Rise and grind.",
    emoji: "🌅",
    category: "skill",
    rarity: "rare",
    rewardSt: 500,
    rewardXp: 200,
    check: (s) => s.earlyBirdTasks >= 5,
    progress: (s) => Math.min(1, s.earlyBirdTasks / 5),
  },
  {
    id: "speed-demon",
    name: "Speed Demon",
    description: "Complete 5 missions in a single day.",
    emoji: "💨",
    category: "skill",
    rarity: "rare",
    rewardSt: 600,
    rewardXp: 250,
    check: (s) => s.missionsThisWeek >= 5,
    progress: (s) => Math.min(1, s.missionsThisWeek / 5),
  },

  // ═══════════════════════════════════════════════════════════════
  //  COLLECTION BADGES — Pet & item collection
  // ═══════════════════════════════════════════════════════════════
  {
    id: "collector",
    name: "Collector",
    description: "Own 5 items from the Vault.",
    emoji: "💎",
    category: "collection",
    rarity: "common",
    rewardSt: 500,
    rewardXp: 150,
    check: (s) => s.itemsBought >= 5,
    progress: (s) => Math.min(1, s.itemsBought / 5),
  },
  {
    id: "pet-tamer",
    name: "Pet Tamer",
    description: "Own 3 different pets. They sense your dedication.",
    emoji: "🐾",
    category: "collection",
    rarity: "common",
    rewardSt: 400,
    rewardXp: 150,
    check: (s) => s.petsOwned >= 3,
    progress: (s) => Math.min(1, s.petsOwned / 3),
  },
  {
    id: "pack-leader",
    name: "Pack Leader",
    description: "Own 8 different pets. A true companion of the wild.",
    emoji: "🐺",
    category: "collection",
    rarity: "rare",
    rewardSt: 1200,
    rewardXp: 400,
    check: (s) => s.petsOwned >= 8,
    progress: (s) => Math.min(1, s.petsOwned / 8),
  },
  {
    id: "master-breeder",
    name: "Master Breeder",
    description: "Own 12 different pets. Your zoo is legendary.",
    emoji: "🐉",
    category: "collection",
    rarity: "epic",
    rewardSt: 3000,
    rewardXp: 800,
    check: (s) => s.petsOwned >= 12,
    progress: (s) => Math.min(1, s.petsOwned / 12),
  },
  {
    id: "pet-max",
    name: "Max Level Pet",
    description: "Reach pet level 10. Your companion is unstoppable.",
    emoji: "🌟",
    category: "collection",
    rarity: "epic",
    rewardSt: 2000,
    rewardXp: 600,
    check: (s) => s.petLevel >= 10,
    progress: (s) => Math.min(1, s.petLevel / 10),
  },
  {
    id: "mining-mogul",
    name: "Mining Mogul",
    description: "Mine 10,000 ST total from pet mining.",
    emoji: "⛏️",
    category: "wealth",
    rarity: "epic",
    rewardSt: 2000,
    rewardXp: 500,
    check: (s) => s.miningTotal >= 10000,
    progress: (s) => Math.min(1, s.miningTotal / 10000),
  },

  // ═══════════════════════════════════════════════════════════════
  //  SOCIAL BADGES — Social engagement
  // ═══════════════════════════════════════════════════════════════
  {
    id: "first-friend",
    name: "First Friend",
    description: "Add your first friend. The grind is better together.",
    emoji: "🤝",
    category: "social",
    rarity: "common",
    rewardSt: 100,
    rewardXp: 50,
    check: (s) => s.friendsCount >= 1,
    progress: (s) => Math.min(1, s.friendsCount),
  },
  {
    id: "first-challenge",
    name: "First Challenge",
    description: "Win your first challenge. Competition fuels growth.",
    emoji: "⚔️",
    category: "social",
    rarity: "common",
    rewardSt: 150,
    rewardXp: 75,
    check: (s) => s.challengesWon >= 1,
    progress: (s) => Math.min(1, s.challengesWon),
  },
  {
    id: "challenge-champ",
    name: "Challenge Champ",
    description: "Win 10 challenges. A true competitor.",
    emoji: "🏆",
    category: "social",
    rarity: "rare",
    rewardSt: 1000,
    rewardXp: 300,
    check: (s) => s.challengesWon >= 10,
    progress: (s) => Math.min(1, s.challengesWon / 10),
  },
  {
    id: "social-butterfly",
    name: "Social Butterfly",
    description: "Have 10 friends. A thriving network.",
    emoji: "🦋",
    category: "social",
    rarity: "rare",
    rewardSt: 500,
    rewardXp: 200,
    check: (s) => s.friendsCount >= 10,
    progress: (s) => Math.min(1, s.friendsCount / 10),
  },
  {
    id: "unstoppable-rival",
    name: "Unstoppable Rival",
    description: "Win 25 challenges. Your rivals fear you.",
    emoji: "👑",
    category: "social",
    rarity: "epic",
    rewardSt: 3000,
    rewardXp: 800,
    check: (s) => s.challengesWon >= 25,
    progress: (s) => Math.min(1, s.challengesWon / 25),
  },
];

export const ACHIEVEMENTS_BY_ID: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENT_DEFS.map((a) => [a.id, a])
);

/* ─────────────────── Quest view helpers (pure) ───────────────────── */

export type CompletedQuestView = {
  id: string;
  title: string;
  emoji: string;
  objectives: { label: string; target: number; current: number; completed: boolean }[];
  progressPct: number;
  completed: boolean;
};

function objectiveCurrent(o: QuestObjectiveDef, counters: Record<string, number>, liveStreak: number): number {
  if (o.type === "profile_flag") return 1;
  if (o.type === "live_streak") return liveStreak;
  return counters[o.key] ?? 0;
}

export function questIsComplete(def: QuestDef, counters: Record<string, number>, liveStreak: number): boolean {
  return def.objectives.every((o) => objectiveCurrent(o, counters, liveStreak) >= o.target);
}

export function questView(
  def: QuestDef,
  counters: Record<string, number>,
  liveStreak: number,
  completed: boolean
): CompletedQuestView {
  const objectives = def.objectives.map((o) => {
    const current = Math.min(objectiveCurrent(o, counters, liveStreak), o.target);
    return { label: o.label, target: o.target, current, completed: current >= o.target };
  });
  const pct = objectives.reduce((acc, o) => acc + Math.min(o.current / o.target, 1), 0) / objectives.length;
  return { id: def.id, title: def.title, emoji: def.emoji, objectives, progressPct: Math.round(pct * 100), completed };
}
