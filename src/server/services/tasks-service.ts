import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  activityEvents,
  playerAchievements,
  playerProgress,
  questProgress,
  streaks as streaksTable,
  tasks,
  walletTransactions,
  wallets,
  activeBoosts,
  profiles,
  friendships,
  challenges,
} from "@/db/schema";
import type { TaskCategory, TaskDifficulty, TaskRarity } from "@/types";
import { AppError, logSecurity } from "@/server/http";
import { computeCompletionReward, faceValueReward, faceValueXP, levelFromXP } from "@/server/economy/rewards";
import { localDateStr, localHour, nextStreakState } from "@/server/economy/streaks";
import { ACHIEVEMENT_DEFS, QUEST_DEFS, WELCOME_QUEST_ID, WEEKLY_GRIND_ID, weekEnd } from "@/server/economy/definitions";
import { questIsComplete, questView, type CompletedQuestView } from "@/server/economy/definitions";
import type { QuestDef } from "@/server/economy/definitions";

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ DTOs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export type TaskDTO = {
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

type QuestRow = typeof questProgress.$inferSelect;

export function toTaskDTO(t: typeof tasks.$inferSelect): TaskDTO {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    category: t.category,
    difficulty: t.difficulty,
    rarity: t.rarity,
    reward: t.reward,
    xpReward: t.xpReward,
    status: t.status,
    dueAt: t.dueAt ? t.dueAt.toISOString() : null,
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
  };
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Queries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export async function listTasks(userId: string): Promise<TaskDTO[]> {
  const rows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .orderBy(desc(tasks.createdAt))
    .limit(200);
  return rows.map(toTaskDTO);
}

const RARITIES: TaskRarity[] = ["common", "rare", "epic", "legendary"];

/** Creates a task with SERVER-computed authoritative rewards (spec Â§34/Â§40). */
export async function createTask(
  userId: string,
  input: { title: string; description?: string | null; category: TaskCategory; difficulty: TaskDifficulty; rarity: TaskRarity }
): Promise<TaskDTO> {
  const [row] = await db
    .insert(tasks)
    .values({
      userId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      category: input.category,
      difficulty: input.difficulty,
      rarity: input.rarity,
      reward: faceValueReward(input.difficulty, input.rarity),
      xpReward: faceValueXP(input.difficulty, input.rarity),
      status: "active",
    })
    .returning();
  return toTaskDTO(row);
}

/** Ownership-checked delete (spec Â§49). */
export async function deleteTask(userId: string, taskId: string): Promise<void> {
  const deleted = await db
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning({ id: tasks.id });
  if (deleted.length === 0) throw new AppError("TASK_NOT_FOUND", "Mission not found.");
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ THE COMPLETION PIPELINE (Â§35) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export async function completeTask(userId: string, taskId: string): Promise<CompletionResult> {
  const result = await db.transaction(async (tx) => {
    /* 1. AUTH + OWNERSHIP + STATE â€” lock the task row. */
    const [task] = await tx
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .for("update");
    if (!task) throw new AppError("TASK_NOT_FOUND", "This mission does not exist or is not yours.");
    if (task.status === "completed") {
      throw new AppError("TASK_ALREADY_COMPLETED", "This mission has already been completed.");
    }

    /* 2. Lock the wallet row â€” serializes all economic mutations for this user. */
    const [wallet] = await tx.select().from(wallets).where(eq(wallets.userId, userId)).for("update");

    /* 3. Load player context. */
    let [progress] = await tx.select().from(playerProgress).where(eq(playerProgress.userId, userId));
    if (!progress) {
      [progress] = await tx.insert(playerProgress).values({ userId }).returning();
    }
    let [streakRow] = await tx.select().from(streaksTable).where(eq(streaksTable.userId, userId));
    if (!streakRow) {
      [streakRow] = await tx.insert(streaksTable).values({ userId }).returning();
    }
    const [profile] = await tx.select({ timezone: profiles.timezone }).from(profiles).where(eq(profiles.userId, userId));
    const timezone = profile?.timezone ?? "UTC";

    /* Active boosts (not expired). */
    const now = new Date();
    const boosts = await tx.select().from(activeBoosts).where(and(eq(activeBoosts.userId, userId), sql`${activeBoosts.expiresAt} > now()`));
    const stBoost = boosts.filter((b) => b.boostType === "stMultiplier").sort((a, b) => b.value - a.value)[0];
    const xpBoost = boosts.filter((b) => b.boostType === "xpMultiplier").sort((a, b) => b.value - a.value)[0];

    /* Tasks completed today (user's local day) + local hour â€” computed in-database from the timezone column. */
    const localMidnight = sql`date_trunc('day', now() at time zone ${timezone}) at time zone ${timezone}`;
    const [{ n: completedToday }] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.status, "completed"), sql`${tasks.completedAt} >= ${localMidnight}`));
    const hourResult = await tx.execute(sql`select extract(hour from now() at time zone ${timezone})::int as h`);
    const firstRow = (hourResult as unknown as Array<{ h: number }>)[0];
    const localH = Number(firstRow.h);

    /* 4. REWARD CALCULATION â€” authoritative domain logic (spec Â§40). */
    const reward = computeCompletionReward({
      baseReward: task.reward,
      baseXP: task.xpReward,
      streak: streakRow.current,
      tasksCompletedToday: completedToday,
      activeStBoostValue: stBoost ? stBoost.value : null,
      activeXpBoostValue: xpBoost ? xpBoost.value : null,
      localHour: localH,
    });

    /* 4b. ECONOMY GUARD - clamp per-mission reward and enforce daily cap. */
    const { clampReward, checkDailyCap, applyEconomyGuard } = await import("@/server/anti-abuse/economy-guard");
    const dailyCap = await checkDailyCap(wallet.id);
    const guarded = applyEconomyGuard(reward.stGained, dailyCap.earnedToday);
    reward.stGained = guarded.st;

    /* 5. TASK COMPLETION â€” guarded update (second idempotency layer). */
    const updated = await tx
      .update(tasks)
      .set({ status: "completed", completedAt: now, updatedAt: now })
      .where(and(eq(tasks.id, task.id), sql`${tasks.status} <> 'completed'`))
      .returning({ id: tasks.id });
    if (updated.length === 0) throw new AppError("TASK_ALREADY_COMPLETED", "This mission has already been completed.");

    /* 6. WALLET LEDGER ENTRY â€” deterministic idempotency key (spec Â§39). */
    const insertedTxn = await tx
      .insert(walletTransactions)
      .values({
        walletId: wallet.id,
        type: "earning",
        amount: reward.stGained,
        title: task.title,
        context: `${task.difficulty} mission`,
        referenceType: "task",
        referenceId: task.id,
        idempotencyKey: `task:${task.id}`,
        metadata: {
          xp: reward.xpGained,
          criticalHit: reward.criticalHit,
          streakMultiplier: reward.streakMultiplier,
          momentumMultiplier: reward.momentumMultiplier,
          boostMultiplier: reward.boostMultiplier,
        },
      })
      .onConflictDoNothing()
      .returning({ id: walletTransactions.id });
    if (insertedTxn.length === 0) {
      // Concurrent duplicate slipped past the row lock (multi-process race).
      logSecurity("duplicate_task_completion_blocked", { userId, taskId });
      throw new AppError("TASK_ALREADY_COMPLETED", "This mission has already been completed.");
    }

    /* 7. BALANCE CREDIT â€” CHECK constraint backstops balance >= 0. */
    const [wallet2] = await tx
      .update(wallets)
      .set({
        balance: sql`${wallets.balance} + ${reward.stGained}`,
        lifetimeEarned: sql`${wallets.lifetimeEarned} + ${reward.stGained}`,
        updatedAt: now,
      })
      .where(eq(wallets.id, wallet.id))
      .returning();

    /* 8. XP + PROGRESSION. */
    const xpTotalBefore = progress.xp;
    const xpTotalAfter = xpTotalBefore + reward.xpGained;
    const levelBefore = levelFromXP(xpTotalBefore);
    const levelAfter = levelFromXP(xpTotalAfter);
    await tx
      .update(playerProgress)
      .set({
        xp: xpTotalAfter,
        level: levelAfter,
        tasksCompleted: sql`${playerProgress.tasksCompleted} + 1`,
        hardTasksCompleted: sql`${playerProgress.hardTasksCompleted} + ${task.difficulty === "hard" || task.difficulty === "elite" ? 1 : 0}`,
        earlyTasksCompleted: sql`${playerProgress.earlyTasksCompleted} + ${localH < 9 ? 1 : 0}`,
        updatedAt: now,
      })
      .where(eq(playerProgress.userId, userId));

    /* 9. STREAK UPDATE â€” server-derived, timezone-aware (spec Â§95). */
    const lastDateStr = streakRow.lastCompletionDate
      ? localDateStr(new Date(streakRow.lastCompletionDate), timezone)
      : null;
    const streakUpdate = nextStreakState({
      lastCompletionDate: lastDateStr,
      todayLocal: localDateStr(now, timezone),
      currentStreak: streakRow.current,
      bestStreak: streakRow.best,
      shieldCount: streakRow.shields,
    });
    await tx
      .update(streaksTable)
      .set({
        current: streakUpdate.current,
        best: streakUpdate.best,
        shields: streakRow.shields - streakUpdate.shieldsUsed,
        lastCompletionDate: localDateStr(now, timezone),
      })
      .where(eq(streaksTable.userId, userId));

    /* 10. QUEST COUNTER UPDATES. */
    const questViews: CompletedQuestView[] = [];
    const welcome = await upsertQuest(tx, userId, WELCOME_QUEST_ID, now);
    const weekly = await ensureWeeklyQuest(tx, userId, now);

    const events: (typeof activityEvents.$inferInsert)[] = [
      {
        userId,
        type: "TASK_COMPLETED",
        entityId: task.id,
        metadata: { title: task.title, reward: reward.stGained, xp: reward.xpGained },
      },
    ];

    for (const q of [welcome, weekly].filter(Boolean) as QuestRow[]) {
      const def = QUEST_DEFS[q.questId];
      const counters: Record<string, number> = { ...(q.counters ?? {}) };
      if (q.questId === WELCOME_QUEST_ID) {
        counters.tasks_completed = (counters.tasks_completed ?? 0) + 1;
        counters.st_earned = (counters.st_earned ?? 0) + reward.stGained;
      } else {
        counters.weekly_tasks = (counters.weekly_tasks ?? 0) + 1;
      }
      const wasComplete = questIsComplete(def, counters, streakUpdate.current);
      const [saved] = await tx
        .update(questProgress)
        .set({ counters })
        .where(eq(questProgress.id, q.id))
        .returning();
      const isComplete = questIsComplete(def, saved.counters, streakUpdate.current);
      questViews.push(questView(def, saved.counters, streakUpdate.current, isComplete));
      if (!wasComplete && isComplete && !q.completedAt) {
        await tx.update(questProgress).set({ completedAt: now }).where(eq(questProgress.id, q.id));
        events.push({ userId, type: "QUEST_COMPLETED", entityId: def.id, metadata: { title: def.title } });
      }
    }

    /* 11. ACHIEVEMENT EVALUATION. */
    const owned = new Set(
      (await tx.select({ achievementId: playerAchievements.achievementId }).from(playerAchievements).where(eq(playerAchievements.userId, userId))).map((r) => r.achievementId)
    );

    // Social stats for badge evaluation
    const friendCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(friendships)
      .where(
        and(
          sql`(${friendships.requesterId} = ${userId} OR ${friendships.addresseeId} = ${userId})`,
          eq(friendships.status, "accepted")
        )
      )
      .then((r) => r[0]?.count ?? 0);

    const challengeStats = await db
      .select({
        won: sql<number>`count(*) filter (where ${challenges.winnerId} = ${userId})::int`,
        lost: sql<number>`count(*) filter (where ${challenges.status} = 'completed' AND ${challenges.winnerId} IS NOT NULL AND ${challenges.winnerId} != ${userId})::int`,
      })
      .from(challenges)
      .where(
        sql`(${challenges.creatorId} = ${userId} OR ${challenges.inviteeId} = ${userId}) AND ${challenges.status} = 'completed'`
      )
      .then((r) => r[0] ?? { won: 0, lost: 0 });

    const stats = {
      tasksCompleted: progress.tasksCompleted + 1,
      lifetimeEarned: wallet2.lifetimeEarned,
      streakCurrent: streakUpdate.current,
      bestStreak: streakUpdate.best,
      hardTasksCompleted: progress.hardTasksCompleted + (task.difficulty === "hard" || task.difficulty === "elite" ? 1 : 0),
      itemsBought: progress.itemsBought,
      petsOwned: 0,
      petLevel: 0,
      miningTotal: 0,
      missionsThisWeek: 0,
      perfectDays: 0,
      earlyBirdTasks: progress.earlyTasksCompleted,
      level: levelFromXP(progress.xp),
      balance: wallet2.balance,
      friendsCount: friendCount,
      challengesWon: challengeStats.won,
      challengesLost: challengeStats.lost,
    };
    const newAchievements: CompletionResult["newAchievements"] = [];
    let bonusST = 0;
    let bonusXP = 0;
    for (const def of ACHIEVEMENT_DEFS) {
      if (owned.has(def.id)) continue;
      if (!def.check(stats)) continue;
      await tx.insert(playerAchievements).values({ userId, achievementId: def.id }).onConflictDoNothing();
      if (def.rewardSt > 0 || def.rewardXp > 0) {
        await tx.insert(walletTransactions).values({
          walletId: wallet.id,
          type: "reward",
          amount: def.rewardSt,
          title: `Achievement — ${def.name}`,
          referenceType: "achievement",
          referenceId: def.id,
          idempotencyKey: `ach:${userId}:${def.id}`,
        }).onConflictDoNothing();
        bonusST += def.rewardSt;
      }
      bonusXP += def.rewardXp;
      newAchievements.push({
        id: def.id,
        name: def.name,
        description: def.description,
        emoji: def.emoji,
        rewardSt: def.rewardSt,
        rewardXp: def.rewardXp,
      });
      events.push({ userId, type: "ACHIEVEMENT_UNLOCKED", entityId: def.id, metadata: { name: def.name } });
    }
    if (bonusST > 0 || bonusXP > 0) {
      await tx
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} + ${bonusST}`,
          lifetimeEarned: sql`${wallets.lifetimeEarned} + ${bonusST}`,
        })
        .where(eq(wallets.id, wallet.id));
      if (bonusXP > 0) {
        const finalXP = xpTotalAfter + bonusXP;
        await tx
          .update(playerProgress)
          .set({ xp: finalXP, level: levelFromXP(finalXP) })
          .where(eq(playerProgress.userId, userId));
        if (levelFromXP(finalXP) > levelAfter) {
          events.push({ userId, type: "LEVEL_UP", entityId: String(levelFromXP(finalXP)), metadata: {} });
        }
      }
    }

    /* 12. LEVEL-UP + STREAK MILESTONE EVENTS. */
    if (levelAfter > levelBefore) {
      events.push({ userId, type: "LEVEL_UP", entityId: String(levelAfter), metadata: { level: levelAfter } });
    }
    const STREAK_MILESTONES = [3, 7, 14, 21, 30];
    if (
      streakUpdate.extended &&
      STREAK_MILESTONES.includes(streakUpdate.current) &&
      !STREAK_MILESTONES.includes(streakUpdate.current - 1)
    ) {
      events.push({ userId, type: "STREAK_MILESTONE", entityId: String(streakUpdate.current), metadata: { streak: streakUpdate.current } });
    }
    await tx.insert(activityEvents).values(events);

    /* 12b. FIRE SOCIAL EVENTS for achievements, streak milestones. */
    try {
      const { processGameEvent } = await import("@/server/services/social-event-bus");
      for (const ach of newAchievements) {
        await processGameEvent({
          userId,
          type: "BADGE_UNLOCKED",
          metadata: { achievementId: ach.id, name: ach.name, emoji: ach.emoji },
        });
      }
      const streakMilestone = events.find((e) => e.type === "STREAK_MILESTONE");
      if (streakMilestone) {
        await processGameEvent({
          userId,
          type: "STREAK_MILESTONE",
          metadata: (streakMilestone.metadata as Record<string, unknown>) ?? {},
        });
      }
    } catch {
      // social bus failures should not break game pipeline
    }

    /* 13. Final wallet state (achievement bonuses included). */
    const [finalWallet] = await tx.select().from(wallets).where(eq(wallets.id, wallet.id));

    return {
      alreadyCompleted: false,
      task: { id: task.id, title: task.title },
      reward: {
        stGained: reward.stGained + bonusST,
        xpGained: reward.xpGained + bonusXP,
        criticalHit: reward.criticalHit,
        earlyBird: localH < 9,
        streakMultiplier: reward.streakMultiplier,
        momentumMultiplier: reward.momentumMultiplier,
        boostStMultiplier: reward.boostMultiplier,
        boostXpMultiplier: xpBoost ? xpBoost.value : 1,
      },
      wallet: { balance: finalWallet.balance, lifetimeEarned: finalWallet.lifetimeEarned },
      progress: { xpTotal: Math.max(xpTotalAfter, xpTotalAfter + bonusXP), levelBefore, levelAfter, levelUp: levelAfter > levelBefore },
      streak: {
        before: streakRow.current,
        after: streakUpdate.current,
        extended: streakUpdate.extended,
        milestone: events.find((e) => e.type === "STREAK_MILESTONE") ? streakUpdate.current : null,
      },
      quests: questViews.sort((a, b) => Number(b.completed) - Number(a.completed)),
      newAchievements,
    } satisfies CompletionResult;
  });

  logSecurity("task_completed", { userId, taskId, st: result.reward.stGained, xp: result.reward.xpGained });
  return result;
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Quest helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

async function upsertQuest(tx: any, userId: string, questId: string, now: Date): Promise<QuestRow> {
  const existing = await tx.select().from(questProgress).where(and(eq(questProgress.userId, userId), eq(questProgress.questId, questId)));
  if (existing[0]) return existing[0];
  const [row] = await tx.insert(questProgress).values({ userId, questId, counters: {} }).returning();
  return row;
}

async function ensureWeeklyQuest(tx: any, userId: string, now: Date): Promise<QuestRow | null> {
  const existing = await tx
    .select()
    .from(questProgress)
    .where(and(eq(questProgress.userId, userId), eq(questProgress.questId, WEEKLY_GRIND_ID)));
  let row = existing[0];
  if (!row) {
    [row] = await tx.insert(questProgress).values({ userId, questId: WEEKLY_GRIND_ID, counters: {} }).returning();
    return row;
  }
  // Reset when the stored window no longer matches the current ISO week window.
  const windowStart = new Date(weekEnd(now).getTime() - 7 * 86400000);
  const anchor = row.completedAt ?? row.createdAt;
  if (anchor && new Date(anchor) < windowStart) {
    [row] = await tx
      .update(questProgress)
      .set({ counters: {}, completedAt: null, claimedAt: null })
      .where(eq(questProgress.id, row.id))
      .returning();
  }
  return row;
}

export { questIsComplete, questView } from "@/server/economy/definitions";
export type { CompletedQuestView } from "@/server/economy/definitions";
