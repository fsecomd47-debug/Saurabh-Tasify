export type TaskCategory = "study" | "work" | "fitness" | "reading" | "health" | "creative" | "personal" | "finance" | "other";
export type TaskStatus = "available" | "active" | "completed" | "failed";
export type TaskDifficulty = "easy" | "medium" | "hard" | "elite";
export type Difficulty = TaskDifficulty;
export type TaskRarity = "common" | "rare" | "epic" | "legendary";

export type Task = {
  id: string;
  title: string;
  description?: string;
  reward: number;
  xp: number;
  status: TaskStatus;
  category: TaskCategory;
  difficulty: TaskDifficulty;
  rarity: TaskRarity;
  streakEligible: boolean;
  multiplier?: number;
  createdAt: string;
  completedAt?: string;
  deadline?: string;
  isDecaying?: boolean;
};

export type Wallet = {
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
};

export type TransactionType = "earning" | "spending" | "transfer" | "bounty" | "achievement" | "quest" | "levelup";

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  title: string;
  context?: string;
  createdAt: string;
  category?: TaskCategory;
  avatar?: string;
  playerName?: string;
  isCriticalHit?: boolean;
  xpEarned?: number;
};

export type PlayerTier = "Bronze Beginner" | "Silver Scholar" | "Gold Hustler" | "Platinum Whale" | "Diamond Mogul";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconComponent = React.ComponentType<any>;

export type Player = {
  id: string;
  name: string;
  totalAssets: number;
  xp: number;
  level: number;
  avatar: string;
  streak: number;
  tier: PlayerTier;
  rank: number;
  rankChange?: number;
  lifetimeEarned: number;
  achievements: string[];
  equippedFrame?: string;
  equippedTitle?: string;
  equippedBadge?: string;
  isCurrentUser?: boolean;
};

export type LeaderboardEntry = Player;

export type ShopItemCategory = "customize" | "boost" | "status" | "experience" | "collection" | "community";
export type ShopItemRarity = "common" | "rare" | "epic" | "legendary" | "mythic";

export type ShopItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ShopItemCategory;
  rarity: ShopItemRarity;
  icon: IconComponent;
  owned: boolean;
  equipped: boolean;
  consumable: boolean;
  limited: boolean;
  featured: boolean;
  availableUntil?: string;
  collectionId?: string;
  requiredLevel?: number;
  boostType?: "stMultiplier" | "xpMultiplier" | "streakShield" | "dailyBonus";
  boostDuration?: number;
  boostValue?: number;
};

export type Collection = {
  id: string;
  name: string;
  description: string;
  icon: string;
  items: string[];
  reward: { st: number; xp: number; badge?: string };
  completed: boolean;
};

export type Bounty = {
  id: string;
  fromPlayer: string;
  toPlayer: string;
  amount: number;
  task: string;
  deadline: string;
  status: "pending" | "completed" | "failed";
};

export type QuestObjectiveType = "complete_tasks" | "earn_st" | "maintain_streak" | "hard_tasks" | "daily_tasks";

export type QuestObjective = {
  type: QuestObjectiveType;
  target: number;
  current: number;
  label: string;
  completed: boolean;
};

export type Quest = {
  id: string;
  title: string;
  description: string;
  icon: IconComponent;
  objectives: QuestObjective[];
  reward: { st: number; xp: number; badge?: string };
  status: "active" | "completed" | "expired";
  deadline?: string;
};

export type DailyMission = {
  id: string;
  title: string;
  target: number;
  current: number;
  reward: number;
  icon: IconComponent;
  completed: boolean;
};

export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: IconComponent;
  category: "milestone" | "skill" | "wealth" | "streak" | "social";
  unlockedAt?: string;
  progress: number;
  requirement: { type: string; value: number };
};

export type ActivityFeedItem = {
  id: string;
  playerId: string;
  playerName: string;
  playerAvatar: string;
  action: "completed_task" | "earned_st" | "reached_level" | "unlocked_achievement" | "won_bounty" | "sent_bounty";
  details: string;
  amount?: number;
  createdAt: string;
};

export type PlayerStats = {
  tasksCompleted: number;
  totalEarned: number;
  streak: number;
  leaderboardRank: number;
  dailyTasks: number;
  hardTasks: number;
  bountiesSent: number;
  itemsBought: number;
  earlyTasks: number;
};

/* ──────────────────── PDR-4.1 Types ─────────────────────────────── */

export type VerificationMode =
  | "self_reported"
  | "timed"
  | "focus"
  | "pose"
  | "repetition"
  | "interactive"
  | "evidence"
  | "hybrid"
  | "activity_signal"
  | "review"
  | "photo"
  | "compound";

/* ──────────────────── Compound Mission Types ──────────────────────── */

export type CompoundMissionStep = {
  stepId: string;
  taskId: string;
  taskTitle: string;
  verificationMode: VerificationMode;
  targetRepetitions?: number;
  durationSeconds?: number;
  rewardStPreview: number;
  rewardXpPreview: number;
  orderIndex: number;
};

export type CompoundMissionConfig = {
  steps: CompoundMissionStep[];
  totalSteps: number;
  currentStepIndex: number;
  allStepsRequired: boolean;
};

export type MissionStatus =
  | "draft"
  | "analyzing"
  | "ready"
  | "starting"
  | "active"
  | "verifying"
  | "passed"
  | "settled"
  | "failed"
  | "review"
  | "expired"
  | "cancelled";

export type ActivityType =
  | "repetition"
  | "focus"
  | "timer"
  | "visual_result"
  | "external_result"
  | "simple";

export type ConfidenceClass = "high" | "medium" | "low";

export type Mission = {
  id: string;
  taskId: string;
  userId: string;
  activityType: ActivityType;
  verificationMode: VerificationMode;
  status: MissionStatus;
  difficulty: TaskDifficulty;
  durationSeconds?: number;
  targetRepetitions?: number;
  rewardStPreview: number;
  rewardXpPreview: number;
  verificationRules: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type MissionSession = {
  id: string;
  missionId: string;
  status: "active" | "paused" | "completed" | "failed";
  startedAt: string;
  endedAt?: string;
  pausedAt?: string;
  totalPausedMs: number;
};

export type MissionEvent = {
  id: string;
  missionId: string;
  sessionId?: string;
  type: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

export type VerificationResult = {
  id: string;
  missionId: string;
  status: "passed" | "failed" | "uncertain";
  confidenceClass: ConfidenceClass;
  confidenceScore: number;
  durationSeconds?: number;
  repetitionCount?: number;
  presenceSamples?: number;
  reasonCode: string;
  metadata?: Record<string, unknown>;
};

export type TaskAnalysisResult = {
  category: TaskCategory;
  difficulty: TaskDifficulty;
  estimatedMinutes: number;
  activityType: ActivityType;
  verificationMode: VerificationMode;
  verificationRequirements: Record<string, unknown>;
  normalizedTitle: string;
  confidence: number;
};

/* ──────────────────── PDR-5 Feature-6: Social ──────────────────── */

export type SocialRelationship = "none" | "requested" | "incoming_request" | "friends" | "blocked";

export type SocialEventType =
  | "MISSION_COMPLETED"
  | "QUEST_COMPLETED"
  | "LEVEL_UP"
  | "PET_LEVEL_UP"
  | "PET_UNLOCKED"
  | "BADGE_UNLOCKED"
  | "RANK_MILESTONE"
  | "STREAK_MILESTONE"
  | "GOAL_COMPLETED"
  | "CHALLENGE_WON"
  | "CHALLENGE_COMPLETED";

export type SocialFeedEvent = {
  id: string;
  actorId: string;
  actorName: string;
  actorAvatar: string;
  actorTitle: string;
  eventType: SocialEventType;
  visibility: "public" | "friends" | "private";
  payload: Record<string, unknown>;
  reactionCounts: Record<string, number>;
  commentCount: number;
  myReaction: string | null;
  createdAt: string;
};

export type PlayerCard = {
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
  socialRelationship: SocialRelationship;
};

export type FriendLeaderboardRow = {
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

export type ChallengeType = "verified_st" | "missions" | "focus_minutes" | "fitness_missions";

export type ChallengeStatus = "pending" | "active" | "completed" | "expired" | "declined";

export type ChallengeView = {
  id: string;
  title: string;
  creator: PlayerCard;
  invitee: PlayerCard;
  metric: ChallengeType;
  status: ChallengeStatus;
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

export type SocialNotification = {
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

export type DirectMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  body: string;
  read: boolean;
  createdAt: string;
};

export type ConversationPreview = {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
};
