import "server-only";
import { desc, eq, sql, and } from "drizzle-orm";
import { db } from "@/db";
import {
  activityEvents,
  inventory,
  playerAchievements,
  playerProgress,
  profiles,
  questProgress,
  streaks as streaksTable,
  walletTransactions,
  wallets,
  wishlists,
  activeBoosts,
  friendships,
  challenges,
} from "@/db/schema";
import { CATALOG_BY_ID } from "@/lib/catalog/data";
import { getAvatarEmoji, tierFor } from "@/lib/catalog/data";
import { levelFromXP } from "@/server/economy/rewards";
import { ACHIEVEMENT_DEFS, QUEST_DEFS, WELCOME_QUEST_ID, WEEKLY_GRIND_ID, weekEnd } from "@/server/economy/definitions";
import { getLeaderboard } from "@/server/services/leaderboard-service";
import { questView } from "@/server/services/tasks-service";

export type WalletDTO = {
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
};

export type TxnDTO = {
  id: string;
  type: string;
  amount: number;
  title: string;
  context: string | null;
  createdAt: string;
};

export type Snapshot = {
  profile: {
    displayName: string;
    avatarId: string;
    avatarEmoji: string;
    timezone: string;
    goalItemId: string | null;
  };
  wallet: WalletDTO;
  transactions: TxnDTO[];
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
  quests: ReturnType<typeof questView>[];
  achievements: { id: string; name: string; description: string; emoji: string; category: string; unlockedAt: string | null; progressPct: number }[];
  inventory: { itemId: string; equipped: boolean; consumable: boolean }[];
  wishlist: string[];
  leaderboardRank: number | null;
  totalAssets: number;
};

export async function getSnapshot(userId: string): Promise<Snapshot> {
  /* Self-healing: guarantee the core player rows exist (idempotent). */
  const [wallet] = await db
    .insert(wallets)
    .values({ userId })
    .onConflictDoNothing()
    .returning();
  await db.insert(playerProgress).values({ userId }).onConflictDoNothing();
  await db.insert(streaksTable).values({ userId }).onConflictDoNothing();

  const [profileRow] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  const [walletRow] = wallet ? [wallet] : await db.select().from(wallets).where(eq(wallets.userId, userId));
  const [progress] = await db.select().from(playerProgress).where(eq(playerProgress.userId, userId));
  const [streak] = await db.select().from(streaksTable).where(eq(streaksTable.userId, userId));
  if (!profileRow || !walletRow || !progress || !streak) throw new Error("Player state not initialized");

  const [txnRows, questRows, achRows, invRows, wishRows, boostRows] = await Promise.all([
    db.select().from(walletTransactions).where(eq(walletTransactions.walletId, walletRow.id)).orderBy(desc(walletTransactions.createdAt)).limit(30),
    db.select().from(questProgress).where(and(eq(questProgress.userId, userId), sql`${questProgress.questId} not like ${"collection:%"}`)),
    db
      .select({ achievementId: playerAchievements.achievementId, unlockedAt: playerAchievements.unlockedAt })
      .from(playerAchievements)
      .where(eq(playerAchievements.userId, userId)),
    db.select().from(inventory).where(eq(inventory.userId, userId)),
    db.select().from(wishlists).where(eq(wishlists.userId, userId)),
    db.select().from(activeBoosts).where(and(eq(activeBoosts.userId, userId), sql`${activeBoosts.expiresAt} > now()`)),
  ]);

  const ownedDurableIds = new Set(invRows.filter((i) => !i.consumable).map((i) => i.itemId));
  const totalAssets =
    walletRow.balance +
    [...ownedDurableIds].reduce((sum, id) => sum + (CATALOG_BY_ID[id]?.price ?? 0), 0);

  const streakCurrent = streak.current;
  const quests = questRows
    .filter((q) => q.questId in QUEST_DEFS)
    .map((q) => questView(QUEST_DEFS[q.questId], q.counters ?? {}, streakCurrent, !!q.completedAt))
    .sort((a, b) => Number(b.completed) - Number(a.completed) || (a.id === WELCOME_QUEST_ID ? -1 : b.id === WEEKLY_GRIND_ID ? 1 : 0));

  // Weekly quest window reset check on read.
  const weeklyRow = questRows.find((q) => q.questId === WEEKLY_GRIND_ID);
  if (weeklyRow) {
    const anchor = weeklyRow.completedAt ?? weeklyRow.createdAt;
    if (anchor && new Date(anchor) < new Date(weekEnd().getTime() - 7 * 86400000)) {
      await db.update(questProgress).set({ counters: {}, completedAt: null, claimedAt: null }).where(eq(questProgress.id, weeklyRow.id));
      const idx = quests.findIndex((q) => q.id === WEEKLY_GRIND_ID);
      if (idx >= 0) quests[idx] = { ...quests[idx], completed: false };
    }
  }

  const ownedAch = new Map(achRows.map((a) => [a.achievementId, a.unlockedAt]));

  // Social stats
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

  const statsForProgress = {
    tasksCompleted: progress.tasksCompleted,
    lifetimeEarned: walletRow.lifetimeEarned,
    streakCurrent: streak.current,
    bestStreak: streak.best,
    hardTasksCompleted: progress.hardTasksCompleted,
    itemsBought: invRows.filter((i) => i.consumable).length + progress.itemsBought,
    petsOwned: 0,
    petLevel: 0,
    miningTotal: 0,
    missionsThisWeek: 0,
    perfectDays: 0,
    earlyBirdTasks: progress.earlyTasksCompleted,
    level: levelFromXP(progress.xp),
    balance: walletRow.balance,
    friendsCount: friendCount,
    challengesWon: challengeStats.won,
    challengesLost: challengeStats.lost,
  };

  return {
    profile: {
      displayName: profileRow.displayName,
      avatarId: profileRow.avatarId,
      avatarEmoji: getAvatarEmoji(profileRow.avatarId),
      timezone: profileRow.timezone,
      goalItemId: profileRow.goalItemId,
    },
    wallet: { balance: walletRow.balance, lifetimeEarned: walletRow.lifetimeEarned, lifetimeSpent: walletRow.lifetimeSpent },
    transactions: txnRows.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      title: t.title,
      context: t.context,
      createdAt: t.createdAt.toISOString(),
    })),
    progress: {
      xpTotal: progress.xp,
      level: levelFromXP(progress.xp),
      tasksCompleted: progress.tasksCompleted,
      hardTasksCompleted: progress.hardTasksCompleted,
      itemsBought: progress.itemsBought,
      earlyTasksCompleted: progress.earlyTasksCompleted,
    },
    streak: { current: streak.current, best: streak.best, shields: streak.shields },
    activeBoosts: boostRows.map((b) => ({ boostType: b.boostType, value: b.value, expiresAt: b.expiresAt.toISOString() })),
    quests,
    achievements: ACHIEVEMENT_DEFS.map((def) => ({
      id: def.id,
      name: def.name,
      description: def.description,
      emoji: def.emoji,
      category: def.category,
      unlockedAt: ownedAch.get(def.id)?.toISOString() ?? null,
      progressPct: Math.round(def.progress(statsForProgress) * 100),
    })),
    inventory: invRows.map((i) => ({ itemId: i.itemId, equipped: i.equipped, consumable: i.consumable })),
    wishlist: wishRows.map((w) => w.itemId),
    leaderboardRank: null, // Computed on-demand via /api/leaderboard
    totalAssets,
  };
}

/** Quest claim â€” grants the reward once (idempotent). */
export async function claimQuestReward(
  userId: string,
  questId: string
): Promise<{ st: number; xp: number }> {
  return db.transaction(async (tx) => {
    const def = QUEST_DEFS[questId];
    if (!def) throw new Error("Unknown quest");
    const rows = await tx
      .select()
      .from(questProgress)
      .where(and(eq(questProgress.userId, userId), eq(questProgress.questId, questId)))
      .for("update");
    const row = rows[0];
    if (!row) throw new Error("Quest not started");
    if (row.claimedAt) throw new Error("ALREADY_CLAIMED");

    const [streakRow] = await tx.select().from(streaksTable).where(eq(streaksTable.userId, userId));
    const counters = row.counters ?? {};
    const complete = def.objectives.every((o) => {
      const current =
        o.type === "profile_flag" ? 1 : o.type === "live_streak" ? streakRow?.current ?? 0 : counters[o.key] ?? 0;
      return current >= o.target;
    });
    if (!complete) throw new Error("NOT_COMPLETED");

    const [wallet] = await tx.select().from(wallets).where(eq(wallets.userId, userId)).for("update");
    const [txRow] = await tx.insert(walletTransactions).values({
      walletId: wallet.id,
      type: "reward",
      amount: def.reward.st,
      title: `Quest complete — ${def.title}`,
      referenceType: "quest",
      referenceId: def.id,
      idempotencyKey: `quest:${userId}:${def.id}`,
    }).onConflictDoNothing().returning();

    // If insert was conflict-skipped, the quest was already claimed
    if (!txRow) throw new Error("ALREADY_CLAIMED");
    await tx
      .update(wallets)
      .set({
        balance: sql`${wallets.balance} + ${def.reward.st}`,
        lifetimeEarned: sql`${wallets.lifetimeEarned} + ${def.reward.st}`,
      })
      .where(eq(wallets.id, wallet.id));
    if (def.reward.xp > 0) {
      await tx
        .update(playerProgress)
        .set({ xp: sql`${playerProgress.xp} + ${def.reward.xp}`, updatedAt: new Date() })
        .where(eq(playerProgress.userId, userId));
    }
    await tx.update(questProgress).set({ claimedAt: new Date() }).where(eq(questProgress.id, row.id));
    await tx.insert(activityEvents).values({
      userId,
      type: "QUEST_REWARD_CLAIMED",
      entityId: def.id,
      metadata: { st: def.reward.st, xp: def.reward.xp },
    });
    return { st: def.reward.st, xp: def.reward.xp };
  });
}
