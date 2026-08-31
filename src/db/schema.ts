import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  date,
  jsonb,
  real,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/* ───────────────────────────── Enums ───────────────────────────── */

export const taskCategoryEnum = pgEnum("task_category", [
  "study",
  "work",
  "fitness",
  "reading",
  "health",
  "creative",
  "personal",
  "finance",
  "other",
]);

export const taskDifficultyEnum = pgEnum("task_difficulty", [
  "easy",
  "medium",
  "hard",
  "elite",
]);

export const taskRarityEnum = pgEnum("task_rarity", [
  "common",
  "rare",
  "epic",
  "legendary",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "available",
  "active",
  "completed",
  "failed",
]);

export const txnTypeEnum = pgEnum("txn_type", [
  "earning",
  "spending",
  "transfer",
  "reward",
  "purchase",
  "adjustment",
]);

export const tokenTypeEnum = pgEnum("auth_token_type", [
  "email_verify",
  "password_reset",
]);

/* ──────────────────── PDR-3 Enums ────────────────────────────── */

export const verificationModeEnum = pgEnum("verification_mode", [
  "self_reported",
  "timed",
  "focus",
  "pose",
  "repetition",
  "interactive",
  "evidence",
  "hybrid",
  "activity_signal",
  "review",
  "photo",
]);

export const missionStatusEnum = pgEnum("mission_status", [
  "draft",
  "analyzing",
  "ready",
  "starting",
  "active",
  "verifying",
  "passed",
  "settled",
  "failed",
  "review",
  "expired",
  "cancelled",
]);

export const activityTypeEnum = pgEnum("activity_type", [
  "repetition",
  "focus",
  "timer",
  "visual_result",
  "external_result",
  "simple",
]);

export const confidenceClassEnum = pgEnum("confidence_class", [
  "high",
  "medium",
  "low",
]);

/* ───────────────────────── Identity & Auth ─────────────────────── */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    passwordHash: text("password_hash").notNull(),
    isBot: boolean("is_bot").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_uq").on(sql`lower(${t.email})`)]
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("sessions_token_hash_uq").on(t.tokenHash),
    index("sessions_user_idx").on(t.userId),
  ]
);

export const authTokens = pgTable(
  "auth_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: tokenTypeEnum("type").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("auth_tokens_token_hash_uq").on(t.tokenHash),
    index("auth_tokens_user_type_idx").on(t.userId, t.type),
  ]
);

/* ─────────────────────── Player identity ───────────────────────── */

export const profiles = pgTable(
  "profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    avatarId: text("avatar_id").notNull().default("avatar-dev"),
    timezone: text("timezone").notNull().default("UTC"),
    locale: text("locale").notNull().default("en-US"),
    goalItemId: text("goal_item_id"),
    profileVisibility: text("profile_visibility", { enum: ["public", "friends", "private"] })
      .notNull()
      .default("public"),
    activityVisibility: text("activity_visibility", { enum: ["public", "friends", "private"] })
      .notNull()
      .default("public"),
    allowFriendRequests: boolean("allow_friend_requests").notNull().default(true),
    allowMessages: text("allow_messages", { enum: ["everyone", "friends", "nobody"] })
      .notNull()
      .default("everyone"),
    allowChallenges: text("allow_challenges", { enum: ["everyone", "friends", "nobody"] })
      .notNull()
      .default("everyone"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("profiles_display_name_idx").on(t.displayName)]
);

export const onboardingProfiles = pgTable("onboarding_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  completed: boolean("completed").notNull().default(false),
  primaryGoal: text("primary_goal"),
  dailyCommitmentMinutes: integer("daily_commitment_minutes"),
  preferredCategories: text("preferred_categories").array().notNull().default([]),
  playstyle: text("playstyle"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

/* ─────────────────────────── Tasks ─────────────────────────────── */

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    category: taskCategoryEnum("category").notNull().default("other"),
    difficulty: taskDifficultyEnum("difficulty").notNull().default("easy"),
    rarity: taskRarityEnum("rarity").notNull().default("common"),
    reward: integer("reward").notNull(),
    xpReward: integer("xp_reward").notNull(),
    status: taskStatusEnum("status").notNull().default("available"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("tasks_user_status_idx").on(t.userId, t.status),
    index("tasks_user_created_idx").on(t.userId, t.createdAt),
  ]
);

/* ─────────────────────────── Economy ───────────────────────────── */

export const wallets = pgTable(
  "wallets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    balance: integer("balance").notNull().default(0),
    lifetimeEarned: integer("lifetime_earned").notNull().default(0),
    lifetimeSpent: integer("lifetime_spent").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("wallet_balance_nonneg", sql`${t.balance} >= 0`)]
);

export const walletTransactions = pgTable(
  "wallet_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.id, { onDelete: "cascade" }),
    type: txnTypeEnum("type").notNull(),
    amount: integer("amount").notNull(),
    title: text("title").notNull(),
    context: text("context"),
    referenceType: text("reference_type"),
    referenceId: text("reference_id"),
    idempotencyKey: text("idempotency_key"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("wallet_txn_idem_uq").on(t.walletId, t.idempotencyKey),
    index("wallet_txn_wallet_created_idx").on(t.walletId, t.createdAt),
    index("wallet_txn_reference_idx").on(t.referenceType, t.referenceId),
  ]
);

export const playerProgress = pgTable("player_progress", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  tasksCompleted: integer("tasks_completed").notNull().default(0),
  hardTasksCompleted: integer("hard_tasks_completed").notNull().default(0),
  itemsBought: integer("items_bought").notNull().default(0),
  earlyTasksCompleted: integer("early_tasks_completed").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const streaks = pgTable("streaks", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  current: integer("current").notNull().default(0),
  best: integer("best").notNull().default(0),
  shields: integer("shields").notNull().default(0),
  lastCompletionDate: date("last_completion_date"),
  timezone: text("timezone").notNull().default("UTC"),
});

export const activeBoosts = pgTable(
  "active_boosts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    boostType: text("boost_type").notNull(),
    value: real("value").notNull().default(1),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("active_boosts_user_idx").on(t.userId, t.expiresAt)]
);

/* ──────────────────── Quests & Achievements ────────────────────── */

export const questProgress = pgTable(
  "quest_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questId: text("quest_id").notNull(),
    counters: jsonb("counters").$type<Record<string, number>>().notNull().default({}),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("quest_progress_user_quest_uq").on(t.userId, t.questId),
    index("quest_progress_user_idx").on(t.userId),
  ]
);

export const playerAchievements = pgTable(
  "player_achievements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    achievementId: text("achievement_id").notNull(),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("player_achievements_uq").on(t.userId, t.achievementId)]
);

/* ──────────────────── Store / Inventory ────────────────────────── */

export const inventory = pgTable(
  "inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: text("item_id").notNull(),
    quantity: integer("quantity").notNull().default(1),
    consumable: boolean("consumable").notNull().default(false),
    equipped: boolean("equipped").notNull().default(false),
    acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("inventory_durable_uq")
      .on(t.userId, t.itemId)
      .where(sql`${t.consumable} = false`),
    index("inventory_user_idx").on(t.userId),
  ]
);

export const wishlists = pgTable(
  "wishlists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: text("item_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("wishlists_uq").on(t.userId, t.itemId)]
);

/* ──────────────────── Activity & Audit ─────────────────────────── */

export const activityEvents = pgTable(
  "activity_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("activity_events_user_created_idx").on(t.userId, t.createdAt),
    index("activity_events_type_idx").on(t.type),
  ]
);

/* ──────────────────── PDR-3: Missions ─────────────────────────── */

export const missions = pgTable(
  "missions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    activityType: activityTypeEnum("activity_type").notNull(),
    verificationMode: verificationModeEnum("verification_mode").notNull(),
    status: missionStatusEnum("status").notNull().default("draft"),

    difficulty: taskDifficultyEnum("difficulty").notNull(),
    durationSeconds: integer("duration_seconds"),
    targetRepetitions: integer("target_repetitions"),

    rewardStPreview: integer("reward_st_preview").notNull(),
    rewardXpPreview: integer("reward_xp_preview").notNull(),

    verificationRules: jsonb("verification_rules")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),

    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("missions_user_status_idx").on(t.userId, t.status),
    index("missions_task_idx").on(t.taskId),
    index("missions_status_idx").on(t.status),
  ]
);

/* ──────────────────── PDR-3: Mission Sessions ─────────────────── */

export const missionSessions = pgTable(
  "mission_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    missionId: uuid("mission_id")
      .notNull()
      .references(() => missions.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("active"), // active | paused | completed | failed
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    totalPausedMs: integer("total_paused_ms").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("mission_sessions_mission_idx").on(t.missionId)]
);

/* ──────────────────── PDR-3: Mission Events ───────────────────── */

export const missionEvents = pgTable(
  "mission_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    missionId: uuid("mission_id")
      .notNull()
      .references(() => missions.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").references(() => missionSessions.id),
    type: text("type").notNull(), // SESSION_STARTED, PRESENCE_CONFIRMED, REP_CONFIRMED, etc.
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("mission_events_mission_idx").on(t.missionId),
    index("mission_events_session_idx").on(t.sessionId),
  ]
);

/* ──────────────────── PDR-3: Verification Results ─────────────── */

export const verificationResults = pgTable(
  "verification_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    missionId: uuid("mission_id")
      .notNull()
      .references(() => missions.id, { onDelete: "cascade" }),
    status: text("status").notNull(), // passed | failed | uncertain
    confidenceClass: confidenceClassEnum("confidence_class").notNull(),
    confidenceScore: real("confidence_score").notNull(),
    durationSeconds: integer("duration_seconds"),
    repetitionCount: integer("repetition_count"),
    presenceSamples: integer("presence_samples"),
    reasonCode: text("reason_code").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("verification_results_mission_idx").on(t.missionId)]
);

/* ──────────────────── PDR-3: Task Analysis Cache ──────────────── */

export const taskAnalyses = pgTable(
  "task_analyses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    normalizedInput: text("normalized_input").notNull(),
    category: taskCategoryEnum("category").notNull(),
    difficulty: taskDifficultyEnum("difficulty").notNull(),
    activityType: activityTypeEnum("activity_type").notNull(),
    verificationMode: verificationModeEnum("verification_mode").notNull(),
    estimatedMinutes: integer("estimated_minutes").notNull(),
    baseRewardSt: integer("base_reward_st").notNull(),
    baseRewardXp: integer("base_reward_xp").notNull(),
    aiProvider: text("ai_provider"),
    confidence: real("confidence").notNull().default(0.8),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("task_analyses_input_uq").on(t.normalizedInput)]
);

/* ──────────────────── PDR-3: Feature Flags ────────────────────── */

export const featureFlags = pgTable("feature_flags", {
  key: text("key").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  rolloutPct: integer("rollout_pct").notNull().default(0), // 0-100
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").primaryKey(),
    count: integer("count").notNull().default(1),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
  }
);

/* ──────────────────── PDR-3: Settlement Audit ─────────────────── */

export const settlementAudit = pgTable(
  "settlement_audit",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    missionId: uuid("mission_id")
      .notNull()
      .references(() => missions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stBase: integer("st_base").notNull(),
    xpBase: integer("xp_base").notNull(),
    confidenceScore: real("confidence_score").notNull(),
    multipliers: jsonb("multipliers").$type<{
      streak: number;
      momentum: number;
      earlyBird: boolean;
      criticalHit: boolean;
      boost: number;
    }>().notNull(),
    stFinal: integer("st_final").notNull(),
    xpFinal: integer("xp_final").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("settlement_audit_user_idx").on(t.userId, t.createdAt)]
);

/* ──────────────────── PDR-5: Pet Economy ────────────────────── */

export const petRarityEnum = pgEnum("pet_rarity", [
  "common",
  "rare",
  "epic",
  "legendary",
  "mythic",
]);

export const petArchetypeEnum = pgEnum("pet_archetype", [
  "miner",
  "scholar",
  "scout",
  "balanced",
  "specialist",
]);

export const petDefinitions = pgTable(
  "pet_definitions",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    emoji: text("emoji").notNull(),
    description: text("description").notNull(),
    personality: text("personality").notNull(),
    level: integer("level").notNull().default(0),
    rarity: petRarityEnum("rarity").notNull().default("common"),
    priceSt: integer("price_st").notNull(),
    miningRatePerMinute: real("mining_rate_per_minute").notNull().default(1),
    xpBoostPercent: real("xp_boost_percent").notNull().default(0),
    archetype: petArchetypeEnum("archetype").notNull().default("balanced"),
    xpPerLevel: integer("xp_per_level").notNull().default(100),
    miningRateGrowth: real("mining_rate_growth").notNull().default(0.2),
    xpBoostGrowth: real("xp_boost_growth").notNull().default(0.5),
    unlockPlayerLevel: integer("unlock_player_level").notNull().default(1),
    assetGradient: text("asset_gradient").notNull().default("#8B5CF6 → #6366F1"),
  }
);

export const petOwnerships = pgTable(
  "pet_ownerships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    petDefinitionId: text("pet_definition_id").notNull(),
    petLevel: integer("pet_level").notNull().default(0),
    petXp: integer("pet_xp").notNull().default(0),
    equipped: boolean("equipped").notNull().default(false),
    acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull().defaultNow(),
    equippedAt: timestamp("equipped_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("pet_ownership_user_pet_uq").on(t.userId, t.petDefinitionId),
    index("pet_ownership_user_idx").on(t.userId),
  ]
);

export const petMiningSessions = pgTable(
  "pet_mining_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    petOwnershipId: uuid("pet_ownership_id")
      .notNull()
      .references(() => petOwnerships.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    status: text("status", { enum: ["active", "settled", "cancelled"] })
      .notNull()
      .default("active"),
  },
  (t) => [
    index("pet_mining_user_idx").on(t.userId),
    index("pet_mining_status_idx").on(t.status),
  ]
);

export const petMiningSettlements = pgTable(
  "pet_mining_settlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    miningSessionId: uuid("mining_session_id")
      .notNull()
      .references(() => petMiningSessions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eligibleMinutes: integer("eligible_minutes").notNull(),
    stAmount: integer("st_amount").notNull(),
    walletTransactionId: uuid("wallet_transaction_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("pet_settlement_session_uq").on(t.miningSessionId),
    index("pet_settlement_user_idx").on(t.userId, t.createdAt),
  ]
);

export const petXpEvents = pgTable(
  "pet_xp_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    petOwnershipId: uuid("pet_ownership_id")
      .notNull()
      .references(() => petOwnerships.id, { onDelete: "cascade" }),
    xpAmount: integer("xp_amount").notNull(),
    source: text("source").notNull(), // mission, level_reward, admin
    missionId: uuid("mission_id").references(() => missions.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pet_xp_user_idx").on(t.userId, t.createdAt)]
);

/* ──────────────────── PDR-5 Feature-3: Daily Rewards ────────────── */

export const dailyRewards = pgTable(
  "daily_rewards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    currentDay: integer("current_day").notNull().default(1),
    cycleStartedAt: timestamp("cycle_started_at", { withTimezone: true }).notNull().defaultNow(),
    lastClaimedAt: timestamp("last_claimed_at", { withTimezone: true }),
    totalCyclesCompleted: integer("total_cycles_completed").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("daily_rewards_user_idx").on(t.userId)]
);

export const dailyRewardClaims = pgTable(
  "daily_reward_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: integer("day").notNull(),
    cycleDay: integer("cycle_day").notNull(),
    stAmount: integer("st_amount").notNull(),
    xpAmount: integer("xp_amount").notNull(),
    streakBonus: boolean("streak_bonus").notNull().default(false),
    walletTransactionId: uuid("wallet_transaction_id"),
    claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("daily_reward_claim_user_day_uq").on(t.userId, t.day),
    index("daily_reward_claims_user_idx").on(t.userId, t.claimedAt),
  ]
);

/* ──────────────────── PDR-4.2: Vision Tables ───────────────────── */

export const visionSessions = pgTable(
  "vision_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    missionId: uuid("mission_id")
      .notNull()
      .references(() => missions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerTypes: text("provider_types").array().notNull().default([]),
    status: text("status", {
      enum: ["active", "completed", "failed", "cancelled"],
    })
      .notNull()
      .default("active"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (t) => [
    index("vision_sessions_mission_idx").on(t.missionId),
    index("vision_sessions_user_idx").on(t.userId),
  ]
);

export const visionEvents = pgTable(
  "vision_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    missionId: uuid("mission_id")
      .notNull()
      .references(() => missions.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => visionSessions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sequence: integer("sequence").notNull(),
    type: text("type").notNull(),
    timestamp: integer("timestamp").notNull(),
    payload: jsonb("payload").$type<Record<string, number | string>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("vision_events_session_idx").on(t.sessionId),
    index("vision_events_mission_idx").on(t.missionId),
  ]
);

export const visionResults = pgTable(
  "vision_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    missionId: uuid("mission_id")
      .notNull()
      .references(() => missions.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => visionSessions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: ["supported", "unsupported", "uncertain"],
    }).notNull(),
    evidenceClass: text("evidence_class", {
      enum: ["clear", "partial", "insufficient"],
    }).notNull(),
    confidenceScore: real("confidence_score").notNull(),
    metrics: jsonb("metrics").$type<Record<string, number>>().default({}),
    reasonCode: text("reason_code").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("vision_results_mission_idx").on(t.missionId),
    index("vision_results_user_idx").on(t.userId),
  ]
);

export const visionEvidence = pgTable(
  "vision_evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    missionId: uuid("mission_id")
      .notNull()
      .references(() => missions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contentHash: text("content_hash").notNull(),
    evidenceType: text("evidence_type").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    consumed: boolean("consumed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("vision_evidence_mission_idx").on(t.missionId),
    uniqueIndex("vision_evidence_user_content_uq").on(t.userId, t.contentHash),
  ]
);

/* ──────────────────── PDR-5 Feature-6: Social ───────────────────── */

export const socialRelationshipEnum = pgEnum("social_relationship", [
  "none",
  "requested",
  "incoming_request",
  "friends",
  "blocked",
]);

export const friendships = pgTable(
  "friendships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    addresseeId: uuid("addressee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: ["requested", "accepted", "blocked"],
    })
      .notNull()
      .default("requested"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("friendships_pair_uq").on(t.requesterId, t.addresseeId),
    index("friendships_requester_idx").on(t.requesterId),
    index("friendships_addressee_idx").on(t.addresseeId),
    index("friendships_addressee_status_idx").on(t.addresseeId, t.status),
  ]
);

export const blocks = pgTable(
  "blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("blocks_pair_uq").on(t.blockerId, t.blockedId),
    index("blocker_idx").on(t.blockerId),
  ]
);

export const socialFeedEvents = pgTable(
  "social_feed_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    sourceEventId: uuid("source_event_id"),
    visibility: text("visibility", {
      enum: ["public", "friends", "private"],
    })
      .notNull()
      .default("friends"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("social_feed_actor_idx").on(t.actorId),
    index("social_feed_created_idx").on(t.createdAt),
    index("social_feed_type_idx").on(t.eventType),
  ]
);

export const reactions = pgTable(
  "reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    feedEventId: uuid("feed_event_id")
      .notNull()
      .references(() => socialFeedEvents.id, { onDelete: "cascade" }),
    emoji: text("emoji").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("reactions_user_event_uq").on(t.userId, t.feedEventId),
    index("reactions_feed_event_idx").on(t.feedEventId),
  ]
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    feedEventId: uuid("feed_event_id")
      .notNull()
      .references(() => socialFeedEvents.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("comments_feed_event_idx").on(t.feedEventId),
    index("comments_user_idx").on(t.userId),
  ]
);

export const challenges = pgTable(
  "challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    inviteeId: uuid("invitee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    metric: text("metric", {
      enum: ["verified_st", "missions", "focus_minutes", "fitness_missions"],
    })
      .notNull()
      .default("verified_st"),
    title: text("title").notNull().default("7-Day Grind"),
    status: text("status", {
      enum: ["pending", "active", "completed", "expired", "declined"],
    })
      .notNull()
      .default("pending"),
    creatorScore: integer("creator_score").notNull().default(0),
    inviteeScore: integer("invitee_score").notNull().default(0),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    rewardSt: integer("reward_st").notNull().default(200),
    rewardXp: integer("reward_xp").notNull().default(100),
    winnerId: uuid("winner_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("challenges_creator_idx").on(t.creatorId),
    index("challenges_invitee_idx").on(t.inviteeId),
    index("challenges_status_idx").on(t.status),
  ]
);

export const socialNotifications = pgTable(
  "social_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    actorId: uuid("actor_id").references(() => users.id),
    entityId: text("entity_id"),
    entityType: text("entity_type"),
    body: text("body").notNull(),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("social_notifications_user_idx").on(t.userId, t.read),
    index("social_notifications_created_idx").on(t.userId, t.createdAt),
  ]
);

export const socialMessages = pgTable(
  "social_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    receiverId: uuid("receiver_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("social_messages_sender_idx").on(t.senderId),
    index("social_messages_receiver_idx").on(t.receiverId),
    index("social_messages_conversation_idx").on(t.senderId, t.receiverId),
  ]
);

/* ──────────────────── Social Reports ────────────────────── */

export const socialReports = pgTable(
  "social_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: text("target_type", {
      enum: ["user", "comment", "message", "feed_event"],
    }).notNull(),
    targetId: text("target_id").notNull(),
    reason: text("reason").notNull(),
    details: text("details"),
    status: text("status", {
      enum: ["normal", "reported", "under_review", "restricted"],
    })
      .notNull()
      .default("reported"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("social_reports_reporter_idx").on(t.reporterId),
    index("social_reports_target_idx").on(t.targetType, t.targetId),
    index("social_reports_status_idx").on(t.status),
  ]
);

/* ──────────────────── PDR-6: THE VAULT ────────────────────── */

export const vaultItemTypeEnum = pgEnum("vault_item_type", [
  "pet",
  "car",
  "superbike",
  "vehicle",
  "frame",
  "title",
  "badge",
  "boost",
  "theme",
  "accessory",
  "collectible",
]);

export const vaultRarityEnum = pgEnum("vault_rarity", [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
  "mythic",
]);

export const vaultItemStatusEnum = pgEnum("vault_item_status", [
  "draft",
  "active",
  "retired",
]);

export const vaultItems = pgTable(
  "vault_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    type: vaultItemTypeEnum("type").notNull(),
    rarity: vaultRarityEnum("rarity").notNull(),
    price: integer("price").notNull(),
    abilities: jsonb("abilities").$type<Array<{
      type: string;
      value: number;
      stackingGroup: string;
      maxGroupBonus: number;
      description: string;
    }>>(),
    requirements: jsonb("requirements").$type<Array<{
      type: string;
      value: number | string;
      description: string;
    }>>(),
    previewAsset: text("preview_asset").notNull(),
    thumbnailAsset: text("thumbnail_asset"),
    collectionId: uuid("collection_id"),
    status: vaultItemStatusEnum("status").notNull().default("active"),
    featured: boolean("featured").notNull().default(false),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("vault_items_type_idx").on(t.type),
    index("vault_items_rarity_idx").on(t.rarity),
    index("vault_items_status_idx").on(t.status),
    index("vault_items_price_idx").on(t.price),
    index("vault_items_featured_idx").on(t.featured),
    index("vault_items_collection_idx").on(t.collectionId),
  ]
);

export const vaultCollections = pgTable(
  "vault_collections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    itemIds: jsonb("item_ids").$type<string[]>().notNull().default([]),
    completionReward: jsonb("completion_reward").$type<{
      badgeId?: string;
      titleId?: string;
      frameId?: string;
    }>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("vault_collections_name_idx").on(t.name),
  ]
);

export const vaultOwnership = pgTable(
  "vault_ownership",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => vaultItems.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    equipped: boolean("equipped").notNull().default(false),
    favorite: boolean("favorite").notNull().default(false),
    showcased: boolean("showcased").notNull().default(false),
    acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("vault_ownership_user_item_idx").on(t.userId, t.itemId),
    index("vault_ownership_user_idx").on(t.userId),
    index("vault_ownership_item_idx").on(t.itemId),
  ]
);

export const vaultEquipment = pgTable(
  "vault_equipment",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    activePet: uuid("active_pet").references(() => vaultItems.id),
    activeVehicle: uuid("active_vehicle").references(() => vaultItems.id),
    profileFrame: uuid("profile_frame").references(() => vaultItems.id),
    profileTitle: uuid("profile_title").references(() => vaultItems.id),
    profileBadge: uuid("profile_badge").references(() => vaultItems.id),
    theme: uuid("theme").references(() => vaultItems.id),
    showcaseItems: jsonb("showcase_items").$type<string[]>().notNull().default([]),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("vault_equipment_user_idx").on(t.userId),
  ]
);

export const vaultTransactions = pgTable(
  "vault_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => vaultItems.id, { onDelete: "cascade" }),
    price: integer("price").notNull(),
    operationKey: text("operation_key").notNull(),
    purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("vault_transactions_operation_key_idx").on(t.operationKey),
    index("vault_transactions_user_idx").on(t.userId),
    index("vault_transactions_item_idx").on(t.itemId),
    index("vault_transactions_date_idx").on(t.purchasedAt),
  ]
);

export const vaultWishlist = pgTable(
  "vault_wishlist",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => vaultItems.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("vault_wishlist_user_item_idx").on(t.userId, t.itemId),
    index("vault_wishlist_user_idx").on(t.userId),
  ]
);

export const vaultGoals = pgTable(
  "vault_goals",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => vaultItems.id, { onDelete: "cascade" }),
    setAt: timestamp("set_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("vault_goals_user_idx").on(t.userId),
    index("vault_goals_item_idx").on(t.itemId),
  ]
);
