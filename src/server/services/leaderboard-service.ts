import "server-only";
import { eq, sql, desc, asc, ilike, and, gte } from "drizzle-orm";
import { db } from "@/db";
import {
  activityEvents,
  inventory,
  playerProgress,
  profiles,
  streaks as streaksTable,
  users,
  wallets,
  walletTransactions,
} from "@/db/schema";
import { AVATARS_BY_ID, CATALOG_BY_ID, TIERS, tierFor } from "@/lib/catalog/data";
import { levelFromXP } from "@/server/economy/rewards";

/* ────────────── Types ────────────── */

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

/* ────────────── Helpers ────────────── */

function avatarEmojiFor(avatarId: string): string {
  return AVATARS_BY_ID[avatarId]?.emoji ?? "👤";
}

/** Current week ID (ISO week): "2026-W35" */
function currentWeekId(): string {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor(
    (now.getTime() - jan1.getTime()) / (24 * 60 * 60 * 1000)
  );
  const weekNum = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
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

const NEIGHBOR_RANGE = 3;

/* ────────────── Core: fetch all eligible players ────────────── */

type PlayerBase = {
  userId: string;
  displayName: string;
  avatarId: string;
  balance: number | null;
  xp: number | null;
  streak: number | null;
};

async function fetchAllPlayers(): Promise<PlayerBase[]> {
  return db
    .select({
      userId: profiles.userId,
      displayName: profiles.displayName,
      avatarId: profiles.avatarId,
      balance: wallets.balance,
      xp: playerProgress.xp,
      streak: streaksTable.current,
    })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.userId))
    .leftJoin(wallets, eq(wallets.userId, profiles.userId))
    .leftJoin(playerProgress, eq(playerProgress.userId, profiles.userId))
    .leftJoin(streaksTable, eq(streaksTable.userId, profiles.userId))
    .where(
      sql`${users.isBot} = false and exists (
        select 1 from onboarding_profiles op where op.user_id = ${profiles.userId} and op.completed = true
      )`
    );
}

async function fetchInventoryValues(): Promise<Map<string, number>> {
  const invRows = await db
    .select({ userId: inventory.userId, itemId: inventory.itemId })
    .from(inventory)
    .where(eq(inventory.consumable, false));

  const map = new Map<string, number>();
  for (const r of invRows) {
    const price = CATALOG_BY_ID[r.itemId]?.price ?? 0;
    map.set(r.userId, (map.get(r.userId) ?? 0) + price);
  }
  return map;
}

/** Sum of earning transactions since `since` for all users. */
async function fetchWeeklyEarnings(
  since: Date
): Promise<Map<string, number>> {
  const rows = await db
    .select({
      walletId: walletTransactions.walletId,
      amount: sql<number>`sum(${walletTransactions.amount})::int`,
    })
    .from(walletTransactions)
    .innerJoin(wallets, eq(wallets.id, walletTransactions.walletId))
    .where(
      and(
        eq(walletTransactions.type, "earning"),
        gte(walletTransactions.createdAt, since)
      )
    )
    .groupBy(walletTransactions.walletId);

  // Map walletId → userId, then sum
  const walletToUser = await db
    .select({ id: wallets.id, userId: wallets.userId })
    .from(wallets);

  const w2u = new Map(walletToUser.map((r) => [r.id, r.userId]));
  const earningsByUser = new Map<string, number>();
  for (const r of rows) {
    const uid = w2u.get(r.walletId);
    if (uid) {
      earningsByUser.set(uid, (earningsByUser.get(uid) ?? 0) + (r.amount ?? 0));
    }
  }
  return earningsByUser;
}

/* ────────────── Global leaderboard ────────────── */

async function buildGlobalLeaderboard(
  currentUserId: string,
  limit: number,
  cursor: string | null
): Promise<LeaderboardPage> {
  const [players, invMap] = await Promise.all([
    fetchAllPlayers(),
    fetchInventoryValues(),
  ]);

  // Build rows with global score = balance
  let rows: LeaderboardRow[] = players.map((p) => {
    const balance = p.balance ?? 0;
    const totalAssets = balance + (invMap.get(p.userId) ?? 0);
    const xp = p.xp ?? 0;
    return {
      userId: p.userId,
      displayName: p.displayName,
      avatarEmoji: avatarEmojiFor(p.avatarId),
      level: levelFromXP(xp),
      xp,
      balance,
      totalAssets,
      weeklyEarned: 0,
      streak: p.streak ?? 0,
      tier: tierFor(totalAssets),
      rank: 0,
      isCurrentUser: p.userId === currentUserId,
      rankChange: null,
    };
  });

  // Sort: balance DESC, tiebreak XP DESC, then userId ASC (deterministic)
  rows.sort(
    (a, b) =>
      b.balance - a.balance ||
      b.xp - a.xp ||
      a.userId.localeCompare(b.userId)
  );

  const totalPlayers = rows.length;
  rows = rows.map((r, i) => ({ ...r, rank: i + 1 }));

  // Cursor pagination: skip to after cursor rank
  let startIndex = 0;
  if (cursor) {
    const cursorRank = parseInt(cursor, 10);
    if (!isNaN(cursorRank)) {
      startIndex = cursorRank; // cursor is the last rank shown, so start at next
    }
  }

  const pageRows = rows.slice(startIndex, startIndex + limit);
  const nextCursor =
    startIndex + limit < totalPlayers
      ? String(startIndex + limit)
      : null;

  // Find me
  const me =
    rows.find((r) => r.isCurrentUser) ?? makeDefaultMe(currentUserId);

  // Neighbors: ±3 around me
  const meRank = me.rank;
  const neighbors = rows
    .filter(
      (r) =>
        !r.isCurrentUser &&
        r.rank >= meRank - NEIGHBOR_RANGE &&
        r.rank <= meRank + NEIGHBOR_RANGE
    )
    .sort((a, b) => a.rank - b.rank);

  return {
    rows: pageRows,
    me,
    neighbors,
    totalPlayers,
    weekId: null,
    nextCursor,
  };
}

/* ────────────── Weekly leaderboard ────────────── */

async function buildWeeklyLeaderboard(
  currentUserId: string,
  limit: number,
  cursor: string | null
): Promise<LeaderboardPage> {
  const weekId = currentWeekId();
  const wStart = weekStart();

  const [players, invMap, weeklyEarnings] = await Promise.all([
    fetchAllPlayers(),
    fetchInventoryValues(),
    fetchWeeklyEarnings(wStart),
  ]);

  let rows: LeaderboardRow[] = players.map((p) => {
    const balance = p.balance ?? 0;
    const totalAssets = balance + (invMap.get(p.userId) ?? 0);
    const xp = p.xp ?? 0;
    const weeklyEarned = weeklyEarnings.get(p.userId) ?? 0;
    return {
      userId: p.userId,
      displayName: p.displayName,
      avatarEmoji: avatarEmojiFor(p.avatarId),
      level: levelFromXP(xp),
      xp,
      balance,
      totalAssets,
      weeklyEarned,
      streak: p.streak ?? 0,
      tier: tierFor(totalAssets),
      rank: 0,
      isCurrentUser: p.userId === currentUserId,
      rankChange: null,
    };
  });

  // Sort: weeklyEarned DESC, tiebreak XP DESC, then userId ASC
  rows.sort(
    (a, b) =>
      b.weeklyEarned - a.weeklyEarned ||
      b.xp - a.xp ||
      a.userId.localeCompare(b.userId)
  );

  const totalPlayers = rows.length;
  rows = rows.map((r, i) => ({ ...r, rank: i + 1 }));

  // Cursor pagination
  let startIndex = 0;
  if (cursor) {
    const cursorRank = parseInt(cursor, 10);
    if (!isNaN(cursorRank)) {
      startIndex = cursorRank;
    }
  }

  const pageRows = rows.slice(startIndex, startIndex + limit);
  const nextCursor =
    startIndex + limit < totalPlayers
      ? String(startIndex + limit)
      : null;

  const me =
    rows.find((r) => r.isCurrentUser) ?? makeDefaultMe(currentUserId);

  const meRank = me.rank;
  const neighbors = rows
    .filter(
      (r) =>
        !r.isCurrentUser &&
        r.rank >= meRank - NEIGHBOR_RANGE &&
        r.rank <= meRank + NEIGHBOR_RANGE
    )
    .sort((a, b) => a.rank - b.rank);

  return {
    rows: pageRows,
    me,
    neighbors,
    totalPlayers,
    weekId,
    nextCursor,
  };
}

/* ────────────── Player detail ────────────── */

async function buildPlayerDetail(
  targetUserId: string,
  currentUserId: string
): Promise<PlayerDetail | null> {
  const [players, invMap, weeklyEarnings, progress] = await Promise.all([
    fetchAllPlayers(),
    fetchInventoryValues(),
    fetchWeeklyEarnings(weekStart()),
    db
      .select({
        xp: playerProgress.xp,
        tasksCompleted: playerProgress.tasksCompleted,
      })
      .from(playerProgress)
      .where(eq(playerProgress.userId, targetUserId))
      .limit(1),
  ]);

  const target = players.find((p) => p.userId === targetUserId);
  if (!target) return null;

  const balance = target.balance ?? 0;
  const totalAssets = balance + (invMap.get(target.userId) ?? 0);
  const xp = target.xp ?? 0;

  // Global rank
  const globalRanked = players
    .map((p) => ({
      userId: p.userId,
      balance: p.balance ?? 0,
      xp: p.xp ?? 0,
    }))
    .sort(
      (a, b) =>
        b.balance - a.balance ||
        b.xp - a.xp ||
        a.userId.localeCompare(b.userId)
    );
  const globalRank =
    globalRanked.findIndex((r) => r.userId === targetUserId) + 1;

  // Weekly rank
  const weeklyRanked = players
    .map((p) => ({
      userId: p.userId,
      weeklyEarned: weeklyEarnings.get(p.userId) ?? 0,
      xp: p.xp ?? 0,
    }))
    .sort(
      (a, b) =>
        b.weeklyEarned - a.weeklyEarned ||
        b.xp - a.xp ||
        a.userId.localeCompare(b.userId)
    );
  const weeklyRank =
    weeklyRanked.findIndex((r) => r.userId === targetUserId) + 1;

  // Profile join date
  const profileRow = await db
    .select({ createdAt: profiles.createdAt })
    .from(profiles)
    .where(eq(profiles.userId, targetUserId))
    .limit(1);

  return {
    userId: target.userId,
    displayName: target.displayName,
    avatarEmoji: avatarEmojiFor(target.avatarId),
    level: levelFromXP(xp),
    xp,
    balance,
    totalAssets,
    weeklyEarned: weeklyEarnings.get(target.userId) ?? 0,
    streak: target.streak ?? 0,
    tier: tierFor(totalAssets),
    rank: globalRank,
    weeklyRank,
    tasksCompleted: progress[0]?.tasksCompleted ?? 0,
    joinedAt: profileRow[0]?.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

/* ────────────── Search ────────────── */

async function searchPlayers(
  query: string,
  currentUserId: string,
  limit = 20
): Promise<LeaderboardRow[]> {
  if (!query || query.trim().length < 2) return [];

  const players = await db
    .select({
      userId: profiles.userId,
      displayName: profiles.displayName,
      avatarId: profiles.avatarId,
      balance: wallets.balance,
      xp: playerProgress.xp,
      streak: streaksTable.current,
    })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.userId))
    .leftJoin(wallets, eq(wallets.userId, profiles.userId))
    .leftJoin(playerProgress, eq(playerProgress.userId, profiles.userId))
    .leftJoin(streaksTable, eq(streaksTable.userId, profiles.userId))
    .where(
      and(
        ilike(profiles.displayName, `%${query}%`),
        sql`(${users.isBot} = false and exists (
          select 1 from onboarding_profiles op where op.user_id = ${profiles.userId} and op.completed = true
        ))`
      )
    )
    .limit(limit);

  // Get all players for ranking context
  const allPlayers = await fetchAllPlayers();
  const invMap = await fetchInventoryValues();

  const ranked = allPlayers
    .map((p) => ({
      userId: p.userId,
      balance: p.balance ?? 0,
      xp: p.xp ?? 0,
    }))
    .sort(
      (a, b) =>
        b.balance - a.balance ||
        b.xp - a.xp ||
        a.userId.localeCompare(b.userId)
    );

  const rankMap = new Map(ranked.map((r, i) => [r.userId, i + 1]));

  return players.map((p) => {
    const balance = p.balance ?? 0;
    const totalAssets = balance + (invMap.get(p.userId) ?? 0);
    const xp = p.xp ?? 0;
    return {
      userId: p.userId,
      displayName: p.displayName,
      avatarEmoji: avatarEmojiFor(p.avatarId),
      level: levelFromXP(xp),
      xp,
      balance,
      totalAssets,
      weeklyEarned: 0,
      streak: p.streak ?? 0,
      tier: tierFor(totalAssets),
      rank: rankMap.get(p.userId) ?? 0,
      isCurrentUser: p.userId === currentUserId,
      rankChange: null,
    };
  });
}

/* ────────────── Default me ────────────── */

function makeDefaultMe(userId: string): LeaderboardRow {
  return {
    userId,
    displayName: "You",
    avatarEmoji: "👤",
    level: 1,
    xp: 0,
    balance: 0,
    totalAssets: 0,
    weeklyEarned: 0,
    streak: 0,
    tier: TIERS[0].name,
    rank: 0,
    isCurrentUser: true,
    rankChange: null,
  };
}

/* ────────────── Public API ────────────── */

export async function getLeaderboard(
  currentUserId: string,
  mode: LeaderboardMode = "global",
  limit = 50,
  cursor: string | null = null
): Promise<LeaderboardPage> {
  if (mode === "weekly") {
    return buildWeeklyLeaderboard(currentUserId, limit, cursor);
  }
  return buildGlobalLeaderboard(currentUserId, limit, cursor);
}

export async function getPlayerDetail(
  targetUserId: string,
  currentUserId: string
): Promise<PlayerDetail | null> {
  return buildPlayerDetail(targetUserId, currentUserId);
}

export async function searchLeaderboard(
  query: string,
  currentUserId: string,
  limit = 20
): Promise<LeaderboardRow[]> {
  return searchPlayers(query, currentUserId, limit);
}

/* ──────────── Activity feed (kept from original) ──────────── */

export type ActivityItemDTO = {
  id: string;
  type: string;
  playerName: string;
  playerAvatar: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export async function getActivityFeed(
  limit = 25,
  excludeUserId?: string
): Promise<ActivityItemDTO[]> {
  const rows = await db
    .select({
      id: activityEvents.id,
      type: activityEvents.type,
      entityId: activityEvents.entityId,
      metadata: activityEvents.metadata,
      createdAt: activityEvents.createdAt,
      displayName: profiles.displayName,
      avatarId: profiles.avatarId,
    })
    .from(activityEvents)
    .innerJoin(profiles, eq(profiles.userId, activityEvents.userId))
    .where(
      excludeUserId
        ? sql`${activityEvents.userId} != ${excludeUserId}`
        : sql`1=1`
    )
    .orderBy(sql`${activityEvents.createdAt} desc`)
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    playerName: r.displayName || "A player",
    playerAvatar: avatarEmojiFor(r.avatarId),
    entityId: r.entityId,
    metadata: r.metadata ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}
