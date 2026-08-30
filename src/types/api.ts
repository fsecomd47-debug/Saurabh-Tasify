/* Client-facing DTOs mirroring the server envelope contract (spec §68). */

import type { TaskCategory, TaskDifficulty, TaskRarity } from "./index";

export type ApiError = { code: string; message: string; shortfall?: number; itemPrice?: number };

export type ApiResult<T> = Promise<T>;

export class ApiRequestError extends Error {
  code: string;
  status: number;
  meta?: Record<string, unknown>;
  constructor(code: string, message: string, status: number, meta?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.status = status;
    this.meta = meta;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiRequestError("TIMEOUT", "The request took too long. Please try again.", 0);
    }
    throw new ApiRequestError("NETWORK_FAILURE", "You appear to be offline. Reconnect and try again.", 0);
  }
  clearTimeout(timeoutId);

  let body: { data: T | null; error: ApiError | null };
  try {
    body = await res.json();
  } catch {
    throw new ApiRequestError("NETWORK_FAILURE", "The server sent an unreadable response.", res.status);
  }

  if (!res.ok || body.error) {
    throw new ApiRequestError(
      body.error?.code ?? "INTERNAL",
      body.error?.message ?? "Something went wrong.",
      res.status,
      body.error as Record<string, unknown> | undefined
    );
  }
  return body.data as T;
}

export const httpClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, payload?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(payload ?? {}) }),
  patch: <T>(path: string, payload?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(payload ?? {}) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

/* ───────────────────────── DTO shapes ─────────────────────────── */

export type SessionInfo = {
  authenticated: boolean;
  emailVerified?: boolean;
  onboardingComplete?: boolean;
  displayName?: string;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  category: TaskCategory;
  difficulty: TaskDifficulty;
  rarity: TaskRarity;
  reward: number;
  xpReward: number;
  status: "available" | "active" | "completed" | "failed";
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type CreateTaskInput = {
  title: string;
  description?: string | null;
  category: TaskCategory;
  difficulty: TaskDifficulty;
  rarity: TaskRarity;
};

export type CompletedQuestView = {
  id: string;
  title: string;
  emoji: string;
  objectives: { label: string; target: number; current: number; completed: boolean }[];
  progressPct: number;
  completed: boolean;
};

export type CompletionResult = {
  alreadyCompleted: boolean;
  task: { id: string; title: string };
  reward: {
    stGained: number;
    xpGained: number;
    criticalHit: boolean;
    earlyBird: boolean;
    streakMultiplier: number;
    momentumMultiplier: number;
    boostStMultiplier: number;
    boostXpMultiplier: number;
  };
  wallet: { balance: number; lifetimeEarned: number };
  progress: { xpTotal: number; levelBefore: number; levelAfter: number; levelUp: boolean };
  streak: { before: number; after: number; extended: boolean; milestone: number | null };
  quests: CompletedQuestView[];
  newAchievements: { id: string; name: string; description: string; emoji: string; rewardSt: number; rewardXp: number }[];
};

export type SnapshotData = {
  email: string;
  emailVerified: boolean;
  profile: {
    displayName: string;
    avatarId: string;
    avatarEmoji: string;
    timezone: string;
    goalItemId: string | null;
  };
  wallet: { balance: number; lifetimeEarned: number; lifetimeSpent: number };
  transactions: { id: string; type: string; amount: number; title: string; context: string | null; createdAt: string }[];
  progress: {
    xpTotal: number;
    level: number;
    tasksCompleted: number;
    hardTasksCompleted: number;
    itemsBought: number;
    earlyTasksCompleted: number;
  };
  streak: { current: number; best: number; shields: number };
  activeBoosts: { boostType: string; value: number; expiresAt: string }[];
  quests: CompletedQuestView[];
  achievements: {
    id: string;
    name: string;
    description: string;
    emoji: string;
    category: string;
    unlockedAt: string | null;
    progressPct: number;
  }[];
  inventory: { itemId: string; equipped: boolean; consumable: boolean }[];
  wishlist: string[];
  leaderboardRank: number | null;
  totalAssets: number;
};

export type CatalogItemDTO = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "customize" | "boost" | "status" | "experience";
  rarity: "common" | "rare" | "epic" | "legendary" | "mythic";
  slot?: "frame" | "theme" | "nameplate" | "title";
  consumable: boolean;
  featured?: boolean;
  limited?: boolean;
  collectionId?: string;
  requiredLevel?: number;
  boostType?: string;
  boostDurationMinutes?: number;
  boostValue?: number;
  owned: boolean;
  equipped: boolean;
  inWishlist: boolean;
};

export type LeaderboardMode = "global" | "weekly";

export type LeaderboardRow = {
  userId: string;
  displayName: string;
  avatarEmoji: string;
  level: number;
  xp: number;
  balance: number;
  totalAssets: number;
  weeklyEarned: number;
  streak: number;
  tier: string;
  rank: number;
  isCurrentUser: boolean;
  rankChange: number | null;
};

export type LeaderboardPage = {
  rows: LeaderboardRow[];
  me: LeaderboardRow;
  neighbors: LeaderboardRow[];
  totalPlayers: number;
  weekId: string | null;
  nextCursor: string | null;
};

export type PlayerDetail = {
  userId: string;
  displayName: string;
  avatarEmoji: string;
  level: number;
  xp: number;
  balance: number;
  totalAssets: number;
  weeklyEarned: number;
  streak: number;
  tier: string;
  rank: number;
  weeklyRank: number;
  tasksCompleted: number;
  joinedAt: string;
};

export type ActivityItem = {
  id: string;
  type: string;
  playerName: string;
  playerAvatar: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

/* ──────────────────── PDR-5: Pets ─────────────────────────── */

export type PetCatalogItem = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  personality: string;
  level: number;
  rarity: string;
  archetype: string;
  priceSt: number;
  miningRatePerMinute: number;
  xpBoostPercent: number;
  xpPerLevel: number;
  unlockPlayerLevel: number;
  assetGradient: string;
  owned: boolean;
  equipped: boolean;
  userPetLevel: number | null;
};

export type PetOwnership = {
  id: string;
  petDefinitionId: string;
  name: string;
  emoji: string;
  description: string;
  personality: string;
  level: number;
  rarity: string;
  archetype: string;
  petLevel: number;
  petXp: number;
  xpToNextLevel: number;
  miningRate: number;
  xpBoost: number;
  equipped: boolean;
  acquiredAt: string;
  equippedAt: string | null;
  priceSt: number;
  assetGradient: string;
  unlockPlayerLevel: number;
};

/* ──────────────────── PDR-5 Feature-2: Profile ──────────────────── */

export type ProfileView = {
  user: {
    displayName: string;
    avatarId: string;
    avatarEmoji: string;
    title: string;
    level: number;
    xp: number;
    xpToNextLevel: number;
    xpProgress: number;
  };
  stats: {
    stBalance: number;
    lifetimeStEarned: number;
    lifetimeStSpent: number;
    streak: number;
    bestStreak: number;
    rank: number | null;
    missionsCompleted: number;
    hardMissionsCompleted: number;
    totalTasks: number;
    itemsBought: number;
    earlyTasksCompleted: number;
  };
  activePet: {
    id: string;
    petDefinitionId: string;
    name: string;
    emoji: string;
    rarity: string;
    petLevel: number;
    petXp: number;
    xpToNextLevel: number;
    miningRate: number;
    xpBoost: number;
    todayMined: number;
  } | null;
  collection: {
    petsOwned: number;
    totalPets: number;
    badgesEarned: number;
    totalBadges: number;
    recentBadges: {
      id: string;
      name: string;
      emoji: string;
      description: string;
      category: string;
      rarity: string;
      unlockedAt: string;
    }[];
  };
  recentWins: {
    type: string;
    title: string;
    amount: number;
    createdAt: string;
  }[];
  goal: {
    itemId: string | null;
    itemName: string | null;
    itemEmoji: string | null;
    itemPrice: number | null;
    currentSt: number;
  } | null;
  journey: {
    level: number;
    label: string;
    date: string | null;
  }[];
};

export type MiningStatus = {
  active: boolean;
  petName: string;
  petEmoji: string;
  miningRate: number;
  todayMined: number;
  dailyCap: number;
  sessionStartedAt: string | null;
  lastSettlementAt: string | null;
  returnSummary: {
    stMined: number;
    petXpGained: number;
    petLevel: number;
    elapsed: string;
  } | null;
};

/* ──────────────────── PDR-5 Feature-3: Daily Rewards ────────────── */

export type DailyRewardTier = {
  day: number;
  st: number;
  xp: number;
  label: string;
  emoji: string;
};

export type DailyRewardStatus = {
  available: boolean;
  currentDay: number;
  totalCyclesCompleted: number;
  lastClaimedAt: string | null;
  cycleStartedAt: string;
  tiers: DailyRewardTier[];
  claimedDays: number[];
  timeUntilNext: string | null;
  streakActive: boolean;
};

export type DailyRewardClaimResult = {
  claimed: boolean;
  day: number;
  stAwarded: number;
  xpAwarded: number;
  streakBonus: boolean;
  levelUp: boolean;
  newLevel: number;
  cycleComplete: boolean;
  nextReward: DailyRewardTier | null;
};

/* ─────────────────────────── Quests ────────────────────────────── */

export type QuestObjectiveView = {
  key: string;
  label: string;
  target: number;
  current: number;
  completed: boolean;
};

export type QuestView = {
  id: string;
  questDefId: string;
  title: string;
  description: string;
  emoji: string;
  category: string;
  difficulty: string;
  objectives: QuestObjectiveView[];
  progressPct: number;
  status: "active" | "completed" | "claimed" | "expired";
  reward: { st: number; xp: number; petXp?: number; badgeId?: string };
  startedAt: string;
  expiresAt: string | null;
  completedAt: string | null;
  claimedAt: string | null;
  chainId?: string;
  chainIndex?: number;
  pinned?: boolean;
};

export type QuestBoard = {
  daily: QuestView[];
  weekly: QuestView[];
  chain: QuestView[];
  pinned: string | null;
};

export type QuestClaimResult = {
  st: number;
  xp: number;
  petXp?: number;
  badgeId?: string;
  questTitle: string;
};

/* ──────────────────── PDR-5 Feature-6: Social ──────────────────── */

export type PlayerCardDTO = {
  userId: string;
  displayName: string;
  avatarEmoji: string;
  title: string;
  level: number;
  streak: number;
  petEmoji: string | null;
  petName: string | null;
  petLevel: number | null;
  rank: number | null;
  tier: string;
  socialRelationship: "none" | "requested" | "incoming_request" | "friends" | "blocked";
};

export type SocialFeedEventDTO = {
  id: string;
  actorId: string;
  actorName: string;
  actorAvatar: string;
  actorTitle: string;
  eventType: string;
  visibility: "public" | "friends" | "private";
  payload: Record<string, unknown>;
  reactionCounts: Record<string, number>;
  commentCount: number;
  myReaction: string | null;
  createdAt: string;
};

export type SocialFeedPage = {
  events: SocialFeedEventDTO[];
  nextCursor: string | null;
};

export type FriendLeaderboardRowDTO = {
  userId: string;
  displayName: string;
  avatarEmoji: string;
  level: number;
  weeklyEarned: number;
  streak: number;
  rank: number;
  isCurrentUser: boolean;
  isRival: boolean;
};

export type ChallengeDTO = {
  id: string;
  title: string;
  creator: PlayerCardDTO;
  invitee: PlayerCardDTO;
  metric: string;
  status: string;
  creatorScore: number;
  inviteeScore: number;
  startsAt: string;
  endsAt: string;
  rewardSt: number;
  rewardXp: number;
  winnerId: string | null;
  timeRemaining: string | null;
  isMe: boolean;
};

export type SocialNotificationDTO = {
  id: string;
  type: string;
  actorName: string;
  actorAvatar: string;
  body: string;
  entityId: string | null;
  entityType: string | null;
  read: boolean;
  createdAt: string;
};

export type ConversationPreviewDTO = {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
};

export type DirectMessageDTO = {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  body: string;
  read: boolean;
  createdAt: string;
};

export type ConversationPage = {
  messages: DirectMessageDTO[];
  nextCursor: string | null;
};
