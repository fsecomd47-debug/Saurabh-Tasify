import "server-only";
import { eq, and, or, sql, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  friendships,
  blocks,
  profiles,
  users,
  wallets,
  playerProgress,
  streaks as streaksTable,
  petOwnerships,
  petDefinitions,
} from "@/db/schema";
import { AppError } from "@/server/http";
import { levelFromXP } from "@/server/economy/rewards";
import { AVATARS_BY_ID, TIERS, tierFor } from "@/lib/catalog/data";
import type { PlayerCard, SocialRelationship } from "@/types";

/* ────────────── Helpers ────────────── */

function avatarEmojiFor(avatarId: string): string {
  return AVATARS_BY_ID[avatarId]?.emoji ?? "👤";
}

function computeTitle(level: number, streak: number, tasksCompleted: number): string {
  if (level >= 25) return "Productivity Legend";
  if (level >= 20) return "Master Grinder";
  if (level >= 15) return "Focus Builder";
  if (level >= 10) return "Rising Star";
  if (level >= 5) return "Committed Player";
  return "Newcomer";
}

/* ────────────── Relationship resolution ────────────── */

export async function getRelationship(
  userId: string,
  targetId: string
): Promise<SocialRelationship> {
  if (userId === targetId) return "none";

  // Check block (either direction)
  const blockRow = await db
    .select()
    .from(blocks)
    .where(
      or(
        and(eq(blocks.blockerId, userId), eq(blocks.blockedId, targetId)),
        and(eq(blocks.blockerId, targetId), eq(blocks.blockedId, userId))
      )
    )
    .limit(1);

  if (blockRow.length > 0) return "blocked";

  // Check friendship
  const friendRow = await db
    .select()
    .from(friendships)
    .where(
      or(
        and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, targetId)),
        and(eq(friendships.requesterId, targetId), eq(friendships.addresseeId, userId))
      )
    )
    .limit(1);

  if (friendRow.length === 0) return "none";

  const f = friendRow[0];
  if (f.status === "accepted") return "friends";
  if (f.status === "blocked") return "blocked";
  // status === "requested"
  if (f.requesterId === userId) return "requested";
  return "incoming_request";
}

/* ────────────── Build player card ────────────── */

export async function buildPlayerCard(
  targetUserId: string,
  viewerId: string
): Promise<PlayerCard | null> {
  // Check profile visibility
  const targetProfilePrivacy = await db
    .select({ profileVisibility: profiles.profileVisibility })
    .from(profiles)
    .where(eq(profiles.userId, targetUserId))
    .limit(1);

  if (targetProfilePrivacy.length > 0 && targetProfilePrivacy[0].profileVisibility === "private" && targetUserId !== viewerId) {
    return null;
  }

  if (targetProfilePrivacy.length > 0 && targetProfilePrivacy[0].profileVisibility === "friends" && targetUserId !== viewerId) {
    const rel = await getRelationship(viewerId, targetUserId);
    if (rel !== "friends") return null;
  }

  const rows = await db
    .select({
      userId: profiles.userId,
      displayName: profiles.displayName,
      avatarId: profiles.avatarId,
      xp: playerProgress.xp,
      streak: streaksTable.current,
      balance: wallets.balance,
    })
    .from(profiles)
    .leftJoin(playerProgress, eq(playerProgress.userId, profiles.userId))
    .leftJoin(streaksTable, eq(streaksTable.userId, profiles.userId))
    .leftJoin(wallets, eq(wallets.userId, profiles.userId))
    .where(eq(profiles.userId, targetUserId))
    .limit(1);

  if (rows.length === 0) return null;

  const r = rows[0];
  const xp = r.xp ?? 0;
  const level = levelFromXP(xp);
  const balance = r.balance ?? 0;

  // Get equipped pet
  const petRow = await db
    .select({
      emoji: petDefinitions.emoji,
      name: petDefinitions.name,
      level: petOwnerships.petLevel,
    })
    .from(petOwnerships)
    .innerJoin(petDefinitions, eq(petDefinitions.id, petOwnerships.petDefinitionId))
    .where(and(eq(petOwnerships.userId, targetUserId), eq(petOwnerships.equipped, true)))
    .limit(1);

  // Get rank
  const allPlayers = await db
    .select({ userId: profiles.userId, balance: wallets.balance, xp: playerProgress.xp })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.userId))
    .leftJoin(wallets, eq(wallets.userId, profiles.userId))
    .leftJoin(playerProgress, eq(playerProgress.userId, profiles.userId))
    .where(sql`${users.isBot} = false`);

  const ranked = allPlayers
    .map((p) => ({ userId: p.userId, balance: p.balance ?? 0, xp: p.xp ?? 0 }))
    .sort(
      (a, b) =>
        b.balance - a.balance || b.xp - a.xp || a.userId.localeCompare(b.userId)
    );
  const rank = ranked.findIndex((p) => p.userId === targetUserId) + 1 || null;

  const relationship = await getRelationship(viewerId, targetUserId);

  return {
    userId: targetUserId,
    displayName: r.displayName,
    avatarEmoji: avatarEmojiFor(r.avatarId),
    title: computeTitle(level, r.streak ?? 0, 0),
    level,
    streak: r.streak ?? 0,
    petEmoji: petRow[0]?.emoji ?? null,
    petName: petRow[0]?.name ?? null,
    petLevel: petRow[0]?.level ?? null,
    rank,
    tier: tierFor(balance),
    socialRelationship: relationship,
  };
}

/* ────────────── Friend list ────────────── */

export async function listFriends(userId: string): Promise<PlayerCard[]> {
  const friendRows = await db
    .select()
    .from(friendships)
    .where(
      and(
        or(
          eq(friendships.requesterId, userId),
          eq(friendships.addresseeId, userId)
        ),
        eq(friendships.status, "accepted")
      )
    );

  const friendIds = friendRows.map((f) =>
    f.requesterId === userId ? f.addresseeId : f.requesterId
  );

  if (friendIds.length === 0) return [];

  const cards = await Promise.all(
    friendIds.map((fid) => buildPlayerCard(fid, userId))
  );

  return cards.filter(Boolean) as PlayerCard[];
}

/* ────────────── Send friend request ────────────── */

export async function sendFriendRequest(
  requesterId: string,
  targetId: string
): Promise<void> {
  if (requesterId === targetId) {
    throw new AppError("CANNOT_FRIEND_SELF", "You cannot add yourself as a friend.");
  }

  // Check blocked
  const existingBlock = await db
    .select()
    .from(blocks)
    .where(
      or(
        and(eq(blocks.blockerId, requesterId), eq(blocks.blockedId, targetId)),
        and(eq(blocks.blockerId, targetId), eq(blocks.blockedId, requesterId))
      )
    )
    .limit(1);

  if (existingBlock.length > 0) {
    throw new AppError("USER_BLOCKED", "This user is unavailable.");
  }

  // Check target allows friend requests
  const targetProfile = await db
    .select({ allowFriendRequests: profiles.allowFriendRequests })
    .from(profiles)
    .where(eq(profiles.userId, targetId))
    .limit(1);
  if (targetProfile.length > 0 && !targetProfile[0].allowFriendRequests) {
    throw new AppError("FORBIDDEN", "This user is not accepting friend requests.");
  }

  // Check existing friendship
  const existing = await db
    .select()
    .from(friendships)
    .where(
      or(
        and(eq(friendships.requesterId, requesterId), eq(friendships.addresseeId, targetId)),
        and(eq(friendships.requesterId, targetId), eq(friendships.addresseeId, requesterId))
      )
    )
    .limit(1);

  if (existing.length > 0) {
    const f = existing[0];
    if (f.status === "accepted") {
      throw new AppError("ALREADY_FRIENDS", "You are already friends.");
    }
    if (f.status === "requested") {
      throw new AppError("FRIEND_REQUEST_EXISTS", "A friend request already exists.");
    }
    if (f.status === "blocked") {
      throw new AppError("USER_BLOCKED", "This user is unavailable.");
    }
  }

  // Rate limit: max 20 pending outgoing requests
  const pendingCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(friendships)
    .where(
      and(
        eq(friendships.requesterId, requesterId),
        eq(friendships.status, "requested")
      )
    );

  if ((pendingCount[0]?.count ?? 0) >= 20) {
    throw new AppError("SPAM_DETECTED", "Too many pending friend requests.");
  }

  await db.insert(friendships).values({
    requesterId,
    addresseeId: targetId,
    status: "requested",
  });
}

/* ────────────── Accept friend request ────────────── */

export async function acceptFriendRequest(
  userId: string,
  requestId: string
): Promise<void> {
  const row = await db
    .select()
    .from(friendships)
    .where(eq(friendships.id, requestId))
    .limit(1);

  if (row.length === 0) {
    throw new AppError("NOT_FOUND", "Friend request not found.");
  }

  const f = row[0];
  if (f.addresseeId !== userId) {
    throw new AppError("FORBIDDEN", "This request is not addressed to you.");
  }
  if (f.status !== "requested") {
    throw new AppError("CONFLICT", "This request has already been processed.");
  }

  // Atomic update: only update if still in "requested" state (prevents double-accept)
  const updated = await db
    .update(friendships)
    .set({ status: "accepted", updatedAt: new Date() })
    .where(and(eq(friendships.id, requestId), eq(friendships.status, "requested")))
    .returning();

  if (updated.length === 0) {
    throw new AppError("CONFLICT", "This request was already processed.");
  }
}

/* ────────────── Decline / remove friend ────────────── */

export async function removeFriend(
  userId: string,
  friendId: string
): Promise<void> {
  // Delete accepted friendship
  await db
    .delete(friendships)
    .where(
      and(
        or(
          and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, friendId)),
          and(eq(friendships.requesterId, friendId), eq(friendships.addresseeId, userId))
        ),
        eq(friendships.status, "accepted")
      )
    );

  // Also delete any pending requests
  await db
    .delete(friendships)
    .where(
      or(
        and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, friendId)),
        and(eq(friendships.requesterId, friendId), eq(friendships.addresseeId, userId))
      )
    );
}

export async function declineFriendRequest(
  userId: string,
  requestId: string
): Promise<void> {
  const row = await db
    .select()
    .from(friendships)
    .where(eq(friendships.id, requestId))
    .limit(1);

  if (row.length === 0) return;
  if (row[0].addresseeId !== userId && row[0].requesterId !== userId) return;

  await db.delete(friendships).where(eq(friendships.id, requestId));
}

/* ────────────── Block / unblock ────────────── */

export async function blockUser(
  blockerId: string,
  blockedId: string
): Promise<void> {
  if (blockerId === blockedId) return;

  // Check if block already exists
  const existing = await db
    .select()
    .from(blocks)
    .where(and(eq(blocks.blockerId, blockerId), eq(blocks.blockedId, blockedId)))
    .limit(1);

  if (existing.length > 0) return;

  await db.insert(blocks).values({ blockerId, blockedId });

  // Remove any existing friendship
  await db
    .delete(friendships)
    .where(
      or(
        and(eq(friendships.requesterId, blockerId), eq(friendships.addresseeId, blockedId)),
        and(eq(friendships.requesterId, blockedId), eq(friendships.addresseeId, blockerId))
      )
    );
}

export async function unblockUser(
  blockerId: string,
  blockedId: string
): Promise<void> {
  await db
    .delete(blocks)
    .where(and(eq(blocks.blockerId, blockerId), eq(blocks.blockedId, blockedId)));
}

/* ────────────── Blocked user check ────────────── */

export async function isBlocked(userId: string, targetId: string): Promise<boolean> {
  const row = await db
    .select()
    .from(blocks)
    .where(
      or(
        and(eq(blocks.blockerId, userId), eq(blocks.blockedId, targetId)),
        and(eq(blocks.blockerId, targetId), eq(blocks.blockedId, userId))
      )
    )
    .limit(1);

  return row.length > 0;
}

/* ────────────── Pending requests ────────────── */

export async function getPendingRequests(
  userId: string
): Promise<PlayerCard[]> {
  const rows = await db
    .select()
    .from(friendships)
    .where(
      and(
        eq(friendships.addresseeId, userId),
        eq(friendships.status, "requested")
      )
    )
    .orderBy(sql`${friendships.createdAt} desc`);

  const cards = await Promise.all(
    rows.map((r) => buildPlayerCard(r.requesterId, userId))
  );

  return cards.filter(Boolean) as PlayerCard[];
}

/* ────────────── Search players ────────────── */

export async function searchPlayers(
  query: string,
  viewerId: string,
  limit = 20
): Promise<PlayerCard[]> {
  if (!query || query.trim().length < 2) return [];

  const { ilike } = await import("drizzle-orm");

  const rows = await db
    .select({ userId: profiles.userId })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.userId))
    .where(
      and(
        ilike(profiles.displayName, `%${query}%`),
        sql`${users.isBot} = false`,
        ne(profiles.userId, viewerId)
      )
    )
    .limit(limit);

  const cards = await Promise.all(
    rows.map((r) => buildPlayerCard(r.userId, viewerId))
  );

  return cards.filter(Boolean) as PlayerCard[];
}
