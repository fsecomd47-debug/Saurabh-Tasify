import "server-only";

/* ═══════════════════════════════════════════════════════════════
   QUEST ENGINE — Definitions, Evaluation, Rotation
   ═══════════════════════════════════════════════════════════════ */

export type QuestCategory = "daily" | "weekly" | "chain" | "special";
export type QuestDifficulty = "easy" | "medium" | "hard" | "elite";
export type QuestEventType =
  | "MISSION_COMPLETED"
  | "ST_EARNED"
  | "XP_EARNED"
  | "PET_XP_EARNED"
  | "PET_PURCHASED"
  | "DAILY_REWARD_CLAIMED"
  | "STREAK_UPDATED";

export type QuestObjectiveDef = {
  key: string;
  type: "counter" | "profile_flag" | "live_streak";
  target: number;
  label: string;
  /** Source filter — only events from this source count. Null = any. */
  source?: string;
};

export type QuestRewardDef = {
  st: number;
  xp: number;
  petXp?: number;
  badgeId?: string;
  titleId?: string;
};

export type QuestDef = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
  objectives: QuestObjectiveDef[];
  reward: QuestRewardDef;
  /** Duration in ms. Undefined = persistent until completed. */
  durationMs?: number;
  /** Level required to see this quest. */
  minLevel?: number;
  /** Chain position — for ordered quest chains. */
  chainIndex?: number;
  chainId?: string;
};

/* ──── Daily Quest Pool ─────────────────────────────────────── */

const DAILY_QUEST_POOL: QuestDef[] = [
  {
    id: "daily:first-mission",
    title: "First Step",
    description: "Complete 1 mission today.",
    emoji: "🌅",
    category: "daily",
    difficulty: "easy",
    objectives: [{ key: "missions_completed", type: "counter", target: 1, label: "Complete 1 mission", source: "mission" }],
    reward: { st: 100, xp: 50 },
    durationMs: 24 * 60 * 60 * 1000,
  },
  {
    id: "daily:double-down",
    title: "Double Down",
    description: "Complete 2 missions today.",
    emoji: "⚡",
    category: "daily",
    difficulty: "easy",
    objectives: [{ key: "missions_completed", type: "counter", target: 2, label: "Complete 2 missions", source: "mission" }],
    reward: { st: 200, xp: 80 },
    durationMs: 24 * 60 * 60 * 1000,
  },
  {
    id: "daily:triple-threat",
    title: "Triple Threat",
    description: "Complete 3 missions today.",
    emoji: "🔥",
    category: "daily",
    difficulty: "medium",
    objectives: [{ key: "missions_completed", type: "counter", target: 3, label: "Complete 3 missions", source: "mission" }],
    reward: { st: 350, xp: 120 },
    durationMs: 24 * 60 * 60 * 1000,
  },
  {
    id: "daily:streak-warrior",
    title: "Streak Warrior",
    description: "Complete a mission while your streak is active.",
    emoji: "🛡️",
    category: "daily",
    difficulty: "easy",
    objectives: [{ key: "streak_mission", type: "counter", target: 1, label: "Complete 1 mission with active streak", source: "mission" }],
    reward: { st: 150, xp: 60 },
    durationMs: 24 * 60 * 60 * 1000,
  },
  {
    id: "daily:focus-session",
    title: "Lock In",
    description: "Complete 1 focus mission.",
    emoji: "🎯",
    category: "daily",
    difficulty: "easy",
    objectives: [{ key: "focus_missions", type: "counter", target: 1, label: "Complete 1 focus mission", source: "mission" }],
    reward: { st: 150, xp: 75 },
    durationMs: 24 * 60 * 60 * 1000,
  },
  {
    id: "daily:earner",
    title: "Coin Collector",
    description: "Earn 300 ST from missions today.",
    emoji: "💰",
    category: "daily",
    difficulty: "medium",
    objectives: [{ key: "st_earned", type: "counter", target: 300, label: "Earn 300 ST", source: "mission" }],
    reward: { st: 200, xp: 80 },
    durationMs: 24 * 60 * 60 * 1000,
  },
  {
    id: "daily:fitness",
    title: "Move Your Body",
    description: "Complete 1 fitness mission.",
    emoji: "🏋️",
    category: "daily",
    difficulty: "easy",
    objectives: [{ key: "fitness_missions", type: "counter", target: 1, label: "Complete 1 fitness mission", source: "mission" }],
    reward: { st: 120, xp: 60 },
    durationMs: 24 * 60 * 60 * 1000,
  },
  {
    id: "daily:hard-hitter",
    title: "Hard Hitter",
    description: "Complete 1 hard or elite mission.",
    emoji: "🔨",
    category: "daily",
    difficulty: "hard",
    objectives: [{ key: "hard_missions", type: "counter", target: 1, label: "Complete 1 hard mission", source: "mission" }],
    reward: { st: 400, xp: 150 },
    durationMs: 24 * 60 * 60 * 1000,
  },
];

/* ──── Weekly Quest Pool ────────────────────────────────────── */

const WEEKLY_QUEST_POOL: QuestDef[] = [
  {
    id: "weekly:grinder",
    title: "Weekly Grinder",
    description: "Complete 5 missions this week.",
    emoji: "⚡",
    category: "weekly",
    difficulty: "medium",
    objectives: [{ key: "weekly_missions", type: "counter", target: 5, label: "Complete 5 missions", source: "mission" }],
    reward: { st: 800, xp: 300 },
    durationMs: 7 * 24 * 60 * 60 * 1000,
  },
  {
    id: "weekly:elite",
    title: "Elite Week",
    description: "Complete 3 hard or elite missions this week.",
    emoji: "🏆",
    category: "weekly",
    difficulty: "hard",
    objectives: [{ key: "weekly_hard", type: "counter", target: 3, label: "Complete 3 hard missions", source: "mission" }],
    reward: { st: 1200, xp: 400 },
    durationMs: 7 * 24 * 60 * 60 * 1000,
  },
  {
    id: "weekly:earner",
    title: "Wealth Builder",
    description: "Earn 2,000 ST from missions this week.",
    emoji: "💰",
    category: "weekly",
    difficulty: "medium",
    objectives: [{ key: "weekly_st", type: "counter", target: 2000, label: "Earn 2,000 ST", source: "mission" }],
    reward: { st: 1000, xp: 350 },
    durationMs: 7 * 24 * 60 * 60 * 1000,
  },
  {
    id: "weekly:consistency",
    title: "Show Up",
    description: "Complete a mission 4 different days this week.",
    emoji: "🔥",
    category: "weekly",
    difficulty: "medium",
    objectives: [{ key: "weekly_active_days", type: "counter", target: 4, label: "Mission on 4 different days", source: "mission" }],
    reward: { st: 700, xp: 250 },
    durationMs: 7 * 24 * 60 * 60 * 1000,
  },
  {
    id: "weekly:focus-master",
    title: "Focus Master",
    description: "Complete 4 focus missions this week.",
    emoji: "🎯",
    category: "weekly",
    difficulty: "medium",
    objectives: [{ key: "weekly_focus", type: "counter", target: 4, label: "Complete 4 focus missions", source: "mission" }],
    reward: { st: 900, xp: 320 },
    durationMs: 7 * 24 * 60 * 60 * 1000,
  },
  {
    id: "weekly:mover",
    title: "Fitness Streak",
    description: "Complete 3 fitness missions this week.",
    emoji: "🏋️",
    category: "weekly",
    difficulty: "medium",
    objectives: [{ key: "weekly_fitness", type: "counter", target: 3, label: "Complete 3 fitness missions", source: "mission" }],
    reward: { st: 750, xp: 280 },
    durationMs: 7 * 24 * 60 * 60 * 1000,
  },
  {
    id: "weekly:pet-care",
    title: "Raise Your Companion",
    description: "Earn 300 Pet XP this week.",
    emoji: "🐾",
    category: "weekly",
    difficulty: "easy",
    objectives: [{ key: "weekly_pet_xp", type: "counter", target: 300, label: "Earn 300 Pet XP", source: "pet" }],
    reward: { st: 500, xp: 200, petXp: 100 },
    durationMs: 7 * 24 * 60 * 60 * 1000,
  },
];

/* ──── Chain Quest Definitions ──────────────────────────────── */

const CHAIN_QUESTS: QuestDef[] = [
  {
    id: "chain:builder-1",
    title: "First Step",
    description: "Complete your first mission.",
    emoji: "🌱",
    category: "chain",
    difficulty: "easy",
    chainId: "the-builder",
    chainIndex: 0,
    objectives: [{ key: "missions_completed", type: "counter", target: 1, label: "Complete 1 mission", source: "mission" }],
    reward: { st: 100, xp: 50 },
  },
  {
    id: "chain:builder-2",
    title: "Momentum",
    description: "Complete 3 missions.",
    emoji: "🔥",
    category: "chain",
    difficulty: "easy",
    chainId: "the-builder",
    chainIndex: 1,
    objectives: [{ key: "missions_completed", type: "counter", target: 3, label: "Complete 3 missions", source: "mission" }],
    reward: { st: 250, xp: 100 },
  },
  {
    id: "chain:builder-3",
    title: "The Grind",
    description: "Earn 500 ST from missions.",
    emoji: "💰",
    category: "chain",
    difficulty: "medium",
    chainId: "the-builder",
    chainIndex: 2,
    objectives: [{ key: "st_earned", type: "counter", target: 500, label: "Earn 500 ST", source: "mission" }],
    reward: { st: 400, xp: 150 },
  },
  {
    id: "chain:builder-4",
    title: "Consistency",
    description: "Reach a 3-day streak.",
    emoji: "🛡️",
    category: "chain",
    difficulty: "medium",
    chainId: "the-builder",
    chainIndex: 3,
    objectives: [{ key: "streak_days", type: "live_streak", target: 3, label: "Reach a 3-day streak" }],
    reward: { st: 500, xp: 200 },
  },
  {
    id: "chain:builder-5",
    title: "Builder",
    description: "Complete 10 missions total.",
    emoji: "🏗️",
    category: "chain",
    difficulty: "hard",
    chainId: "the-builder",
    chainIndex: 4,
    objectives: [{ key: "missions_completed", type: "counter", target: 10, label: "Complete 10 missions", source: "mission" }],
    reward: { st: 800, xp: 300, badgeId: "quest-builder" },
  },
];

/* ──── All Definitions Lookup ───────────────────────────────── */

export const ALL_QUEST_DEFS: Record<string, QuestDef> = {};
for (const q of [...DAILY_QUEST_POOL, ...WEEKLY_QUEST_POOL, ...CHAIN_QUESTS]) {
  ALL_QUEST_DEFS[q.id] = q;
}

export const DAILY_POOL = DAILY_QUEST_POOL;
export const WEEKLY_POOL = WEEKLY_QUEST_POOL;
export const CHAIN_DEFS = CHAIN_QUESTS;

/* ──── Evaluation ───────────────────────────────────────────── */

export function evaluateObjective(
  obj: QuestObjectiveDef,
  counters: Record<string, number>,
  liveStreak: number
): number {
  if (obj.type === "profile_flag") return 1;
  if (obj.type === "live_streak") return liveStreak;
  return counters[obj.key] ?? 0;
}

export function isQuestComplete(
  def: QuestDef,
  counters: Record<string, number>,
  liveStreak: number
): boolean {
  return def.objectives.every(
    (o) => evaluateObjective(o, counters, liveStreak) >= o.target
  );
}

export function questProgressPct(
  def: QuestDef,
  counters: Record<string, number>,
  liveStreak: number
): number {
  if (def.objectives.length === 0) return 0;
  const sum = def.objectives.reduce((acc, o) => {
    const current = Math.min(evaluateObjective(o, counters, liveStreak), o.target);
    return acc + current / o.target;
  }, 0);
  return Math.round((sum / def.objectives.length) * 100);
}

/* ──── Rotation Selection ───────────────────────────────────── */

/** Pick N unique quests from a pool, avoiding recently-seen IDs. */
function pickQuests(
  pool: QuestDef[],
  count: number,
  excludeIds: Set<string>,
  minLevel: number = 0
): QuestDef[] {
  const eligible = pool.filter(
    (q) => !excludeIds.has(q.id) && (q.minLevel ?? 0) <= minLevel
  );
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function selectDailyQuests(
  recentlyCompleted: Set<string>,
  playerLevel: number = 1
): QuestDef[] {
  return pickQuests(DAILY_POOL, 3, recentlyCompleted, playerLevel);
}

export function selectWeeklyQuests(
  recentlyCompleted: Set<string>,
  playerLevel: number = 1
): QuestDef[] {
  return pickQuests(WEEKLY_POOL, 4, recentlyCompleted, playerLevel);
}

export function getChainQuest(chainId: string, index: number): QuestDef | undefined {
  return CHAIN_QUESTS.find((q) => q.chainId === chainId && q.chainIndex === index);
}

export function getNextChainQuest(chainId: string, completedIndex: number): QuestDef | undefined {
  return CHAIN_QUESTS.find((q) => q.chainId === chainId && q.chainIndex === completedIndex + 1);
}

/* ──── Daily/Weekly Key Helpers ─────────────────────────────── */

export function getDailyQuestKey(date: Date = new Date()): string {
  return `daily:${date.toISOString().slice(0, 10)}`;
}

export function getWeeklyQuestKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const daysToMonday = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - daysToMonday);
  return `weekly:${d.toISOString().slice(0, 10)}`;
}

export function getDayBoundaryMs(date: Date = new Date()): number {
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  return end.getTime() - date.getTime();
}

export function getWeekEndMs(date: Date = new Date()): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const daysToSunday = (7 - day) % 7;
  d.setUTCDate(d.getUTCDate() + daysToSunday);
  d.setUTCHours(23, 59, 59, 999);
  return d.getTime() - date.getTime();
}
