import "server-only";
import { eq, and, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  questProgress,
  streaks as streaksTable,
  activityEvents,
  wallets,
  walletTransactions,
  playerProgress,
  petOwnerships,
  petXpEvents,
} from "@/db/schema";
import {
  ALL_QUEST_DEFS,
  DAILY_POOL,
  WEEKLY_POOL,
  CHAIN_DEFS,
  type QuestDef,
  type QuestObjectiveDef,
  isQuestComplete,
  questProgressPct,
  evaluateObjective,
  selectDailyQuests,
  selectWeeklyQuests,
  getChainQuest,
  getNextChainQuest,
  getDailyQuestKey,
  getWeeklyQuestKey,
  getDayBoundaryMs,
  getWeekEndMs,
} from "@/server/services/quest-engine";
import { logSecurity } from "@/server/http";

/* ═══════════════════════════════════════════════════════════════
   QUEST SERVICE — Lifecycle, Progress, Claim
   ═══════════════════════════════════════════════════════════════ */

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

type QuestRow = typeof questProgress.$inferSelect;

/* ──── Get or Create Quest Instances ────────────────────────── */

async function getOrCreateDailyQuests(
  userId: string,
  now: Date,
  timezone: string
): Promise<QuestRow[]> {
  const dailyKey = getDailyQuestKey(now);
  const existing = await db
    .select()
    .from(questProgress)
    .where(
      and(
        eq(questProgress.userId, userId),
        sql`${questProgress.questId} like ${"daily:%"}`
      )
    );

  const todayRows = existing.filter((r) => r.questId.startsWith(dailyKey));
  if (todayRows.length >= 3) return todayRows;

  // Get recently completed daily quest IDs (last 7 days) to avoid repeats
  const recentIds = new Set(
    existing
      .filter((r) => r.completedAt && !r.questId.startsWith(dailyKey))
      .map((r) => r.questId)
  );

  const playerLevel = 1; // Could be fetched from playerProgress
  const selected = selectDailyQuests(recentIds, playerLevel);

  const newRows: QuestRow[] = [];
  for (const def of selected) {
    const questId = `${dailyKey}:${def.id}`;
    const alreadyExists = existing.find((r) => r.questId === questId);
    if (alreadyExists) {
      newRows.push(alreadyExists);
      continue;
    }
    const [row] = await db
      .insert(questProgress)
      .values({
        userId,
        questId,
        counters: {},
      })
      .onConflictDoNothing()
      .returning();
    if (row) newRows.push(row);
  }

  // Also return any existing today rows not in selected
  for (const row of todayRows) {
    if (!newRows.find((r) => r.id === row.id)) newRows.push(row);
  }

  return newRows;
}

async function getOrCreateWeeklyQuests(
  userId: string,
  now: Date,
  timezone: string
): Promise<QuestRow[]> {
  const weeklyKey = getWeeklyQuestKey(now);
  const existing = await db
    .select()
    .from(questProgress)
    .where(
      and(
        eq(questProgress.userId, userId),
        sql`${questProgress.questId} like ${"weekly:%"}`
      )
    );

  const thisWeekRows = existing.filter((r) => r.questId.startsWith(weeklyKey));
  if (thisWeekRows.length >= 4) return thisWeekRows;

  const recentIds = new Set(
    existing
      .filter((r) => r.completedAt && !r.questId.startsWith(weeklyKey))
      .map((r) => r.questId)
  );

  const playerLevel = 1;
  const selected = selectWeeklyQuests(recentIds, playerLevel);

  const newRows: QuestRow[] = [];
  for (const def of selected) {
    const questId = `${weeklyKey}:${def.id}`;
    const alreadyExists = existing.find((r) => r.questId === questId);
    if (alreadyExists) {
      newRows.push(alreadyExists);
      continue;
    }
    const [row] = await db
      .insert(questProgress)
      .values({
        userId,
        questId,
        counters: {},
      })
      .onConflictDoNothing()
      .returning();
    if (row) newRows.push(row);
  }

  for (const row of thisWeekRows) {
    if (!newRows.find((r) => r.id === row.id)) newRows.push(row);
  }

  return newRows;
}

async function getOrCreateChainQuests(userId: string): Promise<QuestRow[]> {
  const existing = await db
    .select()
    .from(questProgress)
    .where(
      and(
        eq(questProgress.userId, userId),
        sql`${questProgress.questId} like ${"chain:%"}`
      )
    );

  const existingMap = new Map(existing.map((r) => [r.questId, r]));

  // Find the current chain position
  const chainId = "the-builder";
  const chainQuests = CHAIN_DEFS.filter((q) => q.chainId === chainId);

  const rows: QuestRow[] = [];
  for (const def of chainQuests) {
    const questId = def.id;
    const existingRow = existingMap.get(questId);

    if (existingRow) {
      rows.push(existingRow);
    } else {
      // Only create if previous chain step is completed (or this is index 0)
      if (def.chainIndex === 0) {
        const [row] = await db
          .insert(questProgress)
          .values({ userId, questId, counters: {} })
          .onConflictDoNothing()
          .returning();
        if (row) rows.push(row);
      } else {
        // Don't create future chain steps — they unlock sequentially
        break;
      }
    }
  }

  return rows;
}

/* ──── Get All Quests for User ──────────────────────────────── */

export async function getQuestsForUser(
  userId: string,
  timezone: string = "UTC"
): Promise<{
  daily: QuestView[];
  weekly: QuestView[];
  chain: QuestView[];
  pinned: string | null;
}> {
  const now = new Date();

  const [dailyRows, weeklyRows, chainRows, streakRow] = await Promise.all([
    getOrCreateDailyQuests(userId, now, timezone),
    getOrCreateWeeklyQuests(userId, now, timezone),
    getOrCreateChainQuests(userId),
    db.select().from(streaksTable).where(eq(streaksTable.userId, userId)).limit(1),
  ]);

  const liveStreak = streakRow[0]?.current ?? 0;

  const toView = (row: QuestRow): QuestView => {
    const def = ALL_QUEST_DEFS[row.questId] ?? extractDefFromKey(row.questId);
    if (!def) return fallbackView(row);
    const counters = (row.counters as Record<string, number>) ?? {};
    const completed = isQuestComplete(def, counters, liveStreak);
    const pct = questProgressPct(def, counters, liveStreak);

    let status: QuestView["status"] = "active";
    if (row.claimedAt) status = "claimed";
    else if (row.completedAt || completed) status = "completed";
    else if (isExpired(row, def)) status = "expired";

    return {
      id: row.id,
      questDefId: row.questId,
      title: def.title,
      description: def.description,
      emoji: def.emoji,
      category: def.category,
      difficulty: def.difficulty,
      objectives: def.objectives.map((o) => {
        const current = Math.min(evaluateObjective(o, counters, liveStreak), o.target);
        return { key: o.key, label: o.label, target: o.target, current, completed: current >= o.target };
      }),
      progressPct: pct,
      status,
      reward: def.reward,
      startedAt: row.createdAt?.toISOString() ?? now.toISOString(),
      expiresAt: getExpiresAt(row, def),
      completedAt: row.completedAt?.toISOString() ?? null,
      claimedAt: row.claimedAt?.toISOString() ?? null,
      chainId: def.chainId,
      chainIndex: def.chainIndex,
    };
  };

  return {
    daily: dailyRows.map(toView),
    weekly: weeklyRows.map(toView),
    chain: chainRows.map(toView),
    pinned: null, // TODO: store pin state
  };
}

/* ──── Get Active/Pinned Quest for Home ─────────────────────── */

export async function getActiveQuestForHome(
  userId: string,
  timezone: string = "UTC"
): Promise<QuestView | null> {
  const quests = await getQuestsForUser(userId, timezone);

  // Priority: nearest completion > highest reward > first active
  const allActive = [...quests.daily, ...quests.weekly, ...quests.chain].filter(
    (q) => q.status === "active"
  );

  if (allActive.length === 0) return null;

  // Sort by progress (nearest completion first), then by reward
  allActive.sort((a, b) => {
    if (a.progressPct !== b.progressPct) return b.progressPct - a.progressPct;
    return (b.reward.st + b.reward.xp) - (a.reward.st + a.reward.xp);
  });

  return allActive[0];
}

/* ──── Process Quest Event ──────────────────────────────────── */

export async function processQuestEvent(
  userId: string,
  eventType: string,
  value: number = 1,
  metadata: Record<string, unknown> = {}
): Promise<{ questId: string; progressPct: number; justCompleted: boolean }[]> {
  const updates: { questId: string; progressPct: number; justCompleted: boolean }[] = [];

  // Deduplicate: skip if same event type processed in last 10 seconds
  const dedupeWindow = new Date(Date.now() - 10_000);
  const dedupeType = `QUEST_DEDUP:${eventType}`;
  const [recentDedupe] = await db
    .select({ id: activityEvents.id })
    .from(activityEvents)
    .where(
      and(
        eq(activityEvents.userId, userId),
        eq(activityEvents.type, dedupeType),
        sql`${activityEvents.createdAt} > to_timestamp(${Math.floor(dedupeWindow.getTime() / 1000)}::double precision)`
      )
    )
    .limit(1);

  if (recentDedupe) return updates;

  // Record dedup marker
  await db.insert(activityEvents).values({
    userId,
    type: dedupeType,
    entityId: `${eventType}:${Date.now()}`,
    metadata: { dedup: true },
  });

  // Get all active quests
  const activeRows = await db
    .select()
    .from(questProgress)
    .where(
      and(
        eq(questProgress.userId, userId),
        sql`${questProgress.completedAt} is null`,
        sql`${questProgress.claimedAt} is null`
      )
    );

  const streakRow = await db
    .select()
    .from(streaksTable)
    .where(eq(streaksTable.userId, userId))
    .limit(1);
  const liveStreak = streakRow[0]?.current ?? 0;

  for (const row of activeRows) {
    const def = ALL_QUEST_DEFS[row.questId] ?? extractDefFromKey(row.questId);
    if (!def) continue;

    const counters = { ...(row.counters as Record<string, number>) };
    let changed = false;

    for (const obj of def.objectives) {
      // Check if this objective cares about this event type
      if (!matchesEvent(obj, eventType, metadata)) continue;
      // Check source filter
      if (obj.source && metadata.source !== obj.source) continue;

      const oldVal = counters[obj.key] ?? 0;
      counters[obj.key] = oldVal + value;
      changed = true;
    }

    if (!changed) continue;

    const wasComplete = isQuestComplete(def, row.counters as Record<string, number>, liveStreak);

    await db
      .update(questProgress)
      .set({ counters })
      .where(eq(questProgress.id, row.id));

    const isComplete = isQuestComplete(def, counters, liveStreak);
    const pct = questProgressPct(def, counters, liveStreak);

    if (!wasComplete && isComplete) {
      await db
        .update(questProgress)
        .set({ completedAt: new Date() })
        .where(eq(questProgress.id, row.id));

      await db.insert(activityEvents).values({
        userId,
        type: "QUEST_COMPLETED",
        entityId: row.questId,
        metadata: { title: def.title },
      });

      // Fire-and-forget: social event
      try {
        const { processGameEvent } = await import("@/server/services/social-event-bus");
        await processGameEvent({
          type: "QUEST_COMPLETED",
          userId,
          metadata: { title: def.title, questId: row.questId },
        });
      } catch { /* social bus failure must not break quest processing */ }
    }

    updates.push({ questId: row.id, progressPct: pct, justCompleted: !wasComplete && isComplete });
  }

  return updates;
}

/* ──── Claim Quest Reward ───────────────────────────────────── */

export async function claimQuestReward(
  userId: string,
  questId: string
): Promise<{ st: number; xp: number; petXp?: number; badgeId?: string; questTitle: string }> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(questProgress)
      .where(and(eq(questProgress.userId, userId), eq(questProgress.questId, questId)))
      .for("update");

    if (!row) throw new Error("Quest not found");
    if (row.claimedAt) throw new Error("ALREADY_CLAIMED");

    const def = ALL_QUEST_DEFS[row.questId] ?? extractDefFromKey(row.questId);
    if (!def) throw new Error("Unknown quest");

    // Verify completion server-side
    const [streakRow] = await tx.select().from(streaksTable).where(eq(streaksTable.userId, userId));
    const counters = (row.counters as Record<string, number>) ?? {};
    const complete = isQuestComplete(def, counters, streakRow?.current ?? 0);
    if (!complete) throw new Error("NOT_COMPLETED");

    // Grant ST
    if (def.reward.st > 0) {
      const [wallet] = await tx.select().from(wallets).where(eq(wallets.userId, userId)).for("update");
      const [txRow] = await tx
        .insert(walletTransactions)
        .values({
          walletId: wallet.id,
          type: "reward",
          amount: def.reward.st,
          title: `Quest — ${def.title}`,
          referenceType: "quest",
          referenceId: row.questId,
          idempotencyKey: `quest:${userId}:${row.questId}`,
        })
        .onConflictDoNothing()
        .returning();

      if (!txRow) throw new Error("ALREADY_CLAIMED");

      await tx
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} + ${def.reward.st}`,
          lifetimeEarned: sql`${wallets.lifetimeEarned} + ${def.reward.st}`,
        })
        .where(eq(wallets.id, wallet.id));
    }

    // Grant XP
    if (def.reward.xp > 0) {
      await tx
        .update(playerProgress)
        .set({ xp: sql`${playerProgress.xp} + ${def.reward.xp}`, updatedAt: new Date() })
        .where(eq(playerProgress.userId, userId));
    }

    // Grant Pet XP if applicable
    if (def.reward.petXp && def.reward.petXp > 0) {
      const [activePet] = await tx
        .select()
        .from(petOwnerships)
        .where(and(eq(petOwnerships.userId, userId), eq(petOwnerships.equipped, true)))
        .limit(1);
      if (activePet) {
        await tx.insert(petXpEvents).values({
          userId,
          petOwnershipId: activePet.id,
          xpAmount: def.reward.petXp,
          source: "quest",
        });
        await tx
          .update(petOwnerships)
          .set({ petXp: sql`${petOwnerships.petXp} + ${def.reward.petXp}` })
          .where(eq(petOwnerships.id, activePet.id));
      }
    }

    // Mark claimed
    await tx.update(questProgress).set({ claimedAt: new Date() }).where(eq(questProgress.id, row.id));

    await tx.insert(activityEvents).values({
      userId,
      type: "QUEST_REWARD_CLAIMED",
      entityId: row.questId,
      metadata: { title: def.title, st: def.reward.st, xp: def.reward.xp },
    });

    logSecurity("quest_reward_claimed", {
      userId,
      questId: row.questId,
      st: def.reward.st,
      xp: def.reward.xp,
    });

    return {
      st: def.reward.st,
      xp: def.reward.xp,
      petXp: def.reward.petXp,
      badgeId: def.reward.badgeId,
      questTitle: def.title,
    };
  });
}

/* ──── Helpers ──────────────────────────────────────────────── */

function matchesEvent(
  obj: QuestObjectiveDef,
  eventType: string,
  metadata: Record<string, unknown>
): boolean {
  // Map quest objective keys to event types
  const key = obj.key;
  if (key.includes("mission")) return eventType === "MISSION_COMPLETED";
  if (key.includes("st_earned")) return eventType === "ST_EARNED" || eventType === "MISSION_COMPLETED";
  if (key.includes("focus")) return eventType === "MISSION_COMPLETED" && metadata.category === "study";
  if (key.includes("fitness")) return eventType === "MISSION_COMPLETED" && metadata.category === "fitness";
  if (key.includes("hard")) return eventType === "MISSION_COMPLETED" && (metadata.difficulty === "hard" || metadata.difficulty === "elite");
  if (key.includes("streak")) return eventType === "STREAK_UPDATED";
  if (key.includes("pet_xp")) return eventType === "PET_XP_EARNED";
  if (key.includes("pet")) return eventType === "PET_PURCHASED";
  if (key.includes("daily")) return eventType === "DAILY_REWARD_CLAIMED";
  return eventType === "MISSION_COMPLETED";
}

function isExpired(row: QuestRow, def: QuestDef): boolean {
  if (!def.durationMs) return false;
  if (!row.createdAt) return false;
  const elapsed = Date.now() - row.createdAt.getTime();
  return elapsed > def.durationMs;
}

function getExpiresAt(row: QuestRow, def: QuestDef): string | null {
  if (!def.durationMs || !row.createdAt) return null;
  return new Date(row.createdAt.getTime() + def.durationMs).toISOString();
}

function extractDefFromKey(questId: string): QuestDef | undefined {
  // Try to extract def ID from compound keys like "daily:2024-01-15:daily:first-mission"
  for (const [id, def] of Object.entries(ALL_QUEST_DEFS)) {
    if (questId.includes(id)) return def;
  }
  // Try prefix patterns
  if (questId.startsWith("daily:")) {
    const parts = questId.split(":");
    const defId = parts.slice(2).join(":");
    return ALL_QUEST_DEFS[defId];
  }
  if (questId.startsWith("weekly:")) {
    const parts = questId.split(":");
    const defId = parts.slice(2).join(":");
    return ALL_QUEST_DEFS[defId];
  }
  return undefined;
}

function fallbackView(row: QuestRow): QuestView {
  return {
    id: row.id,
    questDefId: row.questId,
    title: row.questId,
    description: "",
    emoji: "❓",
    category: "unknown",
    difficulty: "easy",
    objectives: [],
    progressPct: 0,
    status: row.claimedAt ? "claimed" : row.completedAt ? "completed" : "active",
    reward: { st: 0, xp: 0 },
    startedAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
    expiresAt: null,
    completedAt: row.completedAt?.toISOString() ?? null,
    claimedAt: row.claimedAt?.toISOString() ?? null,
  };
}
