import "server-only";
import { eq, and, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  friendships,
  profiles,
  users,
  wallets,
  playerProgress,
  streaks as streaksTable,
  walletTransactions,
} from "@/db/schema";
import { levelFromXP } from "@/server/economy/rewards";
import { AVATARS_BY_ID, TIERS, tierFor } from "@/lib/catalog/data";
import type { FriendLeaderboardRow } from "@/types";

function avatarEmojiFor(avatarId: string): string {
  return AVATARS_BY_ID[avatarId]?.emoji ?? "👤";
}

/** Start of current week (Monday 00:00 UTC) */
function weekStart(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setUTCDate(diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

export async function getFriendLeaderboard(
  userId: string
): Promise<FriendLeaderboardRow[]> {
  // Get friend IDs
  const friendRows = await db
    .select()
    .from(friendships)
    .where(
      and(
        sql`(${friendships.requesterId} = ${userId} or ${friendships.addresseeId} = ${userId})`,
        eq(friendships.status, "accepted")
      )
    );

  const friendIds = friendRows.map((f) =>
    f.requesterId === userId ? f.addresseeId : f.requesterId
  );

  // Include self
  const allIds = [userId, ...friendIds];

  // Fetch weekly earnings for all relevant users
  const wStart = weekStart();
  const weeklyEarnedRows = await db
    .select({
      walletId: walletTransactions.walletId,
      amount: sql<number>`coalesce(sum(${walletTransactions.amount}), 0)::int`,
    })
    .from(walletTransactions)
    .innerJoin(wallets, eq(wallets.id, walletTransactions.walletId))
    .where(
      and(
        inArray(wallets.userId, allIds),
        eq(walletTransactions.type, "earning"),
        sql`${walletTransactions.createdAt} >= to_timestamp(${Math.floor(wStart.getTime() / 1000)}::double precision)`
      )
    )
    .groupBy(walletTransactions.walletId);

  // Map walletId → userId
  const walletToUser = await db
    .select({ id: wallets.id, userId: wallets.userId })
    .from(wallets)
    .where(inArray(wallets.userId, allIds));

  const w2u = new Map(walletToUser.map((r) => [r.id, r.userId]));
  const earningsByUser = new Map<string, number>();
  for (const r of weeklyEarnedRows) {
    const uid = w2u.get(r.walletId);
    if (uid) {
      earningsByUser.set(uid, (earningsByUser.get(uid) ?? 0) + r.amount);
    }
  }

  // Fetch profiles for all users
  const profiles_ = await db
    .select({
      userId: profiles.userId,
      displayName: profiles.displayName,
      avatarId: profiles.avatarId,
      xp: playerProgress.xp,
      streak: streaksTable.current,
    })
    .from(profiles)
    .leftJoin(playerProgress, eq(playerProgress.userId, profiles.userId))
    .leftJoin(streaksTable, eq(streaksTable.userId, profiles.userId))
    .where(inArray(profiles.userId, allIds));

  const profileMap = new Map(profiles_.map((p) => [p.userId, p]));

  // Build rows
  let rows: FriendLeaderboardRow[] = allIds.map((id) => {
    const p = profileMap.get(id);
    const xp = p?.xp ?? 0;
    return {
      userId: id,
      displayName: p?.displayName || "Unknown",
      avatarEmoji: p ? avatarEmojiFor(p.avatarId) : "👤",
      level: levelFromXP(xp),
      weeklyEarned: earningsByUser.get(id) ?? 0,
      streak: p?.streak ?? 0,
      rank: 0,
      isCurrentUser: id === userId,
      isRival: false,
    };
  });

  // Sort by weekly earned DESC, then level DESC, then userId ASC
  rows.sort(
    (a, b) =>
      b.weeklyEarned - a.weeklyEarned ||
      b.level - a.level ||
      a.userId.localeCompare(b.userId)
  );

  rows = rows.map((r, i) => ({ ...r, rank: i + 1 }));

  return rows;
}
