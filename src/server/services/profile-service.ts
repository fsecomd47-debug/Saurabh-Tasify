import "server-only";
import { eq, and, sql, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  profiles,
  wallets,
  playerProgress,
  streaks as streaksTable,
  playerAchievements,
  petOwnerships,
  petMiningSettlements,
  walletTransactions,
  activityEvents,
} from "@/db/schema";
import { getAvatarEmoji } from "@/lib/catalog/data";
import { PET_BY_ID, PET_RARITY_CONFIG } from "@/lib/pets/data";
import { levelFromXP } from "@/server/economy/rewards";
import { ACHIEVEMENT_DEFS } from "@/server/economy/definitions";
import { getLeaderboard } from "@/server/services/leaderboard-service";

const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 850, 1300, 1900, 2650, 3600, 4800, 6300, 8100, 10200, 12700,
  15700, 19200, 23300, 28100, 33700, 40200, 47700, 56400, 66500, 78200, 91800,
  107500, 125700, 146800, 171200, 199500,
];

function xpForLevel(level: number): number {
  return LEVEL_THRESHOLDS[Math.min(level, LEVEL_THRESHOLDS.length - 1)] ?? 0;
}

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

function computeTitle(level: number, streak: number, missions: number): string {
  if (level >= 25) return "VAULT LEGEND";
  if (level >= 20) return "ST MASTER";
  if (streak >= 21) return "STREAK MASTER";
  if (missions >= 100) return "MISSION GRINDER";
  if (level >= 15) return "ELITE BUILDER";
  if (level >= 10) return "FOCUS BUILDER";
  if (level >= 5) return "DAILY GRINDER";
  return "RISING STAR";
}

export async function getProfileView(userId: string): Promise<ProfileView> {
  const [profileRow] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  const [walletRow] = await db.select().from(wallets).where(eq(wallets.userId, userId));
  const [progress] = await db.select().from(playerProgress).where(eq(playerProgress.userId, userId));
  const [streak] = await db.select().from(streaksTable).where(eq(streaksTable.userId, userId));

  if (!profileRow || !walletRow || !progress || !streak) {
    throw new Error("Player state not initialized");
  }

  const level = levelFromXP(progress.xp);
  const xpToNext = xpForLevel(level);
  const xpCurrent = progress.xp - xpForLevel(level - 1);
  const xpProgress = xpToNext > 0 ? Math.min(1, xpCurrent / xpToNext) : 1;

  const [achievements, allPets, recentTxns, activityRows] = await Promise.all([
    db.select().from(playerAchievements).where(eq(playerAchievements.userId, userId)),
    db.select().from(petOwnerships).where(eq(petOwnerships.userId, userId)),
    db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.walletId, walletRow.id))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(10),
    db
      .select()
      .from(activityEvents)
      .where(eq(activityEvents.userId, userId))
      .orderBy(desc(activityEvents.createdAt))
      .limit(20),
  ]);

  const equippedPet = allPets.find((p) => p.equipped);

  let activePet: ProfileView["activePet"] = null;
  if (equippedPet) {
    const def = PET_BY_ID[equippedPet.petDefinitionId];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [todayMined] = await db
      .select({ total: sql<number>`coalesce(sum(${petMiningSettlements.stAmount}), 0)::int` })
      .from(petMiningSettlements)
      .where(
        and(
          eq(petMiningSettlements.userId, userId),
          sql`${petMiningSettlements.createdAt} >= ${today.toISOString()}`
        )
      );

    if (def) {
      activePet = {
        id: equippedPet.id,
        petDefinitionId: equippedPet.petDefinitionId,
        name: def.name,
        emoji: def.emoji,
        rarity: def.rarity,
        petLevel: equippedPet.petLevel,
        petXp: equippedPet.petXp,
        xpToNextLevel: def.xpPerLevel + equippedPet.petLevel * 20,
        miningRate: Math.round((def.miningRatePerMinute + equippedPet.petLevel * def.miningRateGrowth) * 100) / 100,
        xpBoost: Math.round((def.xpBoostPercent + equippedPet.petLevel * def.xpBoostGrowth) * 10) / 10,
        todayMined: todayMined?.total ?? 0,
      };
    }
  }

  const totalPets = 15;
  const totalBadges = ACHIEVEMENT_DEFS.length;

  const recentBadges = achievements
    .filter((a) => a.unlockedAt)
    .sort((a, b) => (b.unlockedAt?.getTime() ?? 0) - (a.unlockedAt?.getTime() ?? 0))
    .slice(0, 6)
    .map((a) => {
      const def = ACHIEVEMENT_DEFS.find((d) => d.id === a.achievementId);
      return {
        id: a.achievementId,
        name: def?.name ?? a.achievementId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        emoji: def?.emoji ?? "🏆",
        description: def?.description ?? "",
        category: def?.category ?? "milestone",
        rarity: def?.rarity ?? "common",
        unlockedAt: a.unlockedAt!.toISOString(),
      };
    });

  const recentWins = recentTxns
    .filter((t) => t.type === "earning" || t.type === "reward")
    .slice(0, 5)
    .map((t) => ({
      type: t.type,
      title: t.title,
      amount: t.amount,
      createdAt: t.createdAt.toISOString(),
    }));

  const goalItem = profileRow.goalItemId
    ? { itemId: profileRow.goalItemId, itemName: profileRow.goalItemId, itemEmoji: "🎯", itemPrice: null, currentSt: walletRow.balance }
    : null;

  const journey: ProfileView["journey"] = [
    { level: 1, label: "Player Created", date: profileRow.createdAt?.toISOString() ?? null },
    ...(level >= 5 ? [{ level: 5, label: "Rising Star", date: null }] : []),
    ...(level >= 10 ? [{ level: 10, label: "Focus Builder", date: null }] : []),
    ...(level >= 15 ? [{ level: 15, label: "Elite Builder", date: null }] : []),
    ...(level >= 20 ? [{ level: 20, label: "ST Master", date: null }] : []),
    ...(level >= 25 ? [{ level: 25, label: "Vault Legend", date: null }] : []),
    { level, label: "Current", date: null },
  ];

  // Compute real leaderboard rank
  let rank: number | null = null;
  try {
    const lb = await getLeaderboard(userId, "global", 100);
    rank = lb.me.rank;
  } catch {
    // Graceful fallback if leaderboard query fails
  }

  return {
    user: {
      displayName: profileRow.displayName,
      avatarId: profileRow.avatarId,
      avatarEmoji: getAvatarEmoji(profileRow.avatarId),
      title: computeTitle(level, streak.current, progress.tasksCompleted),
      level,
      xp: progress.xp,
      xpToNextLevel: xpToNext,
      xpProgress,
    },
    stats: {
      stBalance: walletRow.balance,
      lifetimeStEarned: walletRow.lifetimeEarned,
      lifetimeStSpent: walletRow.lifetimeSpent,
      streak: streak.current,
      bestStreak: streak.best,
      rank,
      missionsCompleted: progress.tasksCompleted,
      hardMissionsCompleted: progress.hardTasksCompleted,
      totalTasks: progress.tasksCompleted,
      itemsBought: progress.itemsBought,
      earlyTasksCompleted: progress.earlyTasksCompleted,
    },
    activePet,
    collection: {
      petsOwned: allPets.length,
      totalPets,
      badgesEarned: achievements.length,
      totalBadges,
      recentBadges,
    },
    recentWins,
    goal: goalItem,
    journey,
  };
}
