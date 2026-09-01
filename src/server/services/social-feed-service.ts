import "server-only";
import { eq, and, sql, desc, inArray, not, or } from "drizzle-orm";
import { db } from "@/db";
import {
  socialFeedEvents,
  reactions,
  comments,
  profiles,
  users,
  wallets,
  playerProgress,
  streaks as streaksTable,
  blocks,
  friendships,
  petOwnerships,
  petDefinitions,
} from "@/db/schema";
import { AppError } from "@/server/http";
import { levelFromXP } from "@/server/economy/rewards";
import { AVATARS_BY_ID, TIERS, tierFor } from "@/lib/catalog/data";
import type { SocialFeedEvent, SocialEventType } from "@/types";

/* ────────────── Helpers ────────────── */

function avatarEmojiFor(avatarId: string): string {
  return AVATARS_BY_ID[avatarId]?.emoji ?? "👤";
}

function computeTitle(level: number, streak: number): string {
  if (level >= 25) return "Productivity Legend";
  if (level >= 20) return "Master Grinder";
  if (level >= 15) return "Focus Builder";
  if (level >= 10) return "Rising Star";
  if (level >= 5) return "Committed Player";
  return "Newcomer";
}

/* ────────────── Publish feed event ────────────── */

export async function publishFeedEvent(input: {
  actorId: string;
  eventType: SocialEventType;
  sourceEventId?: string;
  visibility?: "public" | "friends" | "private";
  payload: Record<string, unknown>;
}): Promise<void> {
  // Check if user is blocked by anyone who might see this
  // (simplified: only publish if visibility is appropriate)
  await db.insert(socialFeedEvents).values({
    actorId: input.actorId,
    eventType: input.eventType,
    sourceEventId: input.sourceEventId ?? null,
    visibility: input.visibility ?? "friends",
    payload: input.payload,
  });
}

/* ────────────── Get feed for user ────────────── */

export async function getSocialFeed(
  userId: string,
  limit = 20,
  cursor?: string
): Promise<{ events: SocialFeedEvent[]; nextCursor: string | null }> {
  // Get blocked user IDs
  const blockedRows = await db
    .select({ blockedId: blocks.blockedId })
    .from(blocks)
    .where(eq(blocks.blockerId, userId));
  const blockedIds = new Set(blockedRows.map((r) => r.blockedId));

  // Also get users who blocked us
  const blockedByRows = await db
    .select({ blockerId: blocks.blockerId })
    .from(blocks)
    .where(eq(blocks.blockedId, userId));
  const blockedByMe = new Set(blockedByRows.map((r) => r.blockerId));

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
  const friendIds = new Set(
    friendRows.map((f) => (f.requesterId === userId ? f.addresseeId : f.requesterId))
  );
  friendIds.add(userId); // Include own events

  // Build where clause
  const excludeIds = [...blockedIds, ...blockedByMe];
  let whereClause = sql`${socialFeedEvents.visibility} != 'private'`;
  if (excludeIds.length > 0) {
    whereClause = and(
      whereClause,
      not(inArray(socialFeedEvents.actorId, excludeIds))
    )!;
  }
  // "friends" visibility only visible to friends (including self)
  const friendIdArr = [...friendIds];
  if (friendIdArr.length > 0) {
    whereClause = and(
      whereClause,
      or(
        eq(socialFeedEvents.visibility, 'public'),
        inArray(socialFeedEvents.actorId, friendIdArr)
      )!
    )!;
  } else {
    whereClause = and(
      whereClause,
      sql`${socialFeedEvents.visibility} = 'public'`
    )!;
  }
  if (cursor) {
    whereClause = and(
      whereClause,
      sql`${socialFeedEvents.createdAt} < to_timestamp(${Math.floor(new Date(cursor).getTime() / 1000)}::double precision)`
    )!;
  }

  const rows = await db
    .select({
      id: socialFeedEvents.id,
      actorId: socialFeedEvents.actorId,
      eventType: socialFeedEvents.eventType,
      visibility: socialFeedEvents.visibility,
      payload: socialFeedEvents.payload,
      createdAt: socialFeedEvents.createdAt,
      displayName: profiles.displayName,
      avatarId: profiles.avatarId,
      level: playerProgress.level,
    })
    .from(socialFeedEvents)
    .innerJoin(profiles, eq(profiles.userId, socialFeedEvents.actorId))
    .leftJoin(playerProgress, eq(playerProgress.userId, socialFeedEvents.actorId))
    .where(whereClause)
    .orderBy(desc(socialFeedEvents.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const events = rows.slice(0, limit);

  // Get streak data for actors
  const actorIds = [...new Set(events.map((e) => e.actorId))];
  const streakRows =
    actorIds.length > 0
      ? await db
          .select({
            userId: streaksTable.userId,
            current: streaksTable.current,
          })
          .from(streaksTable)
          .where(inArray(streaksTable.userId, actorIds))
      : [];
  const streakMap = new Map(streakRows.map((s) => [s.userId, s.current]));

  // Get reaction counts for these events
  const eventIds = events.map((e) => e.id);
  const reactionRows =
    eventIds.length > 0
      ? await db
          .select({
            feedEventId: reactions.feedEventId,
            emoji: reactions.emoji,
            count: sql<number>`count(*)::int`,
          })
          .from(reactions)
          .where(inArray(reactions.feedEventId, eventIds))
          .groupBy(reactions.feedEventId, reactions.emoji)
      : [];

  // Get user's reactions
  const myReactionRows =
    eventIds.length > 0
      ? await db
          .select({
            feedEventId: reactions.feedEventId,
            emoji: reactions.emoji,
          })
          .from(reactions)
          .where(
            and(
              eq(reactions.userId, userId),
              inArray(reactions.feedEventId, eventIds)
            )
          )
      : [];

  // Get comment counts
  const commentCountRows =
    eventIds.length > 0
      ? await db
          .select({
            feedEventId: comments.feedEventId,
            count: sql<number>`count(*)::int`,
          })
          .from(comments)
          .where(inArray(comments.feedEventId, eventIds))
          .groupBy(comments.feedEventId)
      : [];

  // Build maps
  const reactionCountsMap = new Map<string, Record<string, number>>();
  for (const r of reactionRows) {
    const existing = reactionCountsMap.get(r.feedEventId) ?? {};
    existing[r.emoji] = r.count;
    reactionCountsMap.set(r.feedEventId, existing);
  }

  const myReactionMap = new Map<string, string>();
  for (const r of myReactionRows) {
    myReactionMap.set(r.feedEventId, r.emoji);
  }

  const commentCountMap = new Map<string, number>();
  for (const r of commentCountRows) {
    commentCountMap.set(r.feedEventId, r.count);
  }

  // Filter is now handled in SQL (public OR actor in friendIds)
  const filtered = events;

  // Get pet info for actors
  const uniqueActorIds = [...new Set(filtered.map((e) => e.actorId))];
  const actorPetRows =
    uniqueActorIds.length > 0
      ? await db
          .select({
            userId: petOwnerships.userId,
            emoji: petDefinitions.emoji,
            name: petDefinitions.name,
            level: petOwnerships.petLevel,
          })
          .from(petOwnerships)
          .innerJoin(petDefinitions, eq(petDefinitions.id, petOwnerships.petDefinitionId))
          .where(
            and(
              inArray(petOwnerships.userId, uniqueActorIds),
              eq(petOwnerships.equipped, true)
            )
          )
      : [];

  const petMap = new Map(
    actorPetRows.map((p) => [p.userId, { emoji: p.emoji, name: p.name, level: p.level }])
  );

  const result: SocialFeedEvent[] = filtered.map((e) => {
    const actorLevel = e.level ?? 1;
    const actorStreak = streakMap.get(e.actorId) ?? 0;
    return {
      id: e.id,
      actorId: e.actorId,
      actorName: e.displayName || "A player",
      actorAvatar: avatarEmojiFor(e.avatarId),
      actorTitle: computeTitle(actorLevel, actorStreak),
      eventType: e.eventType as SocialEventType,
      visibility: e.visibility as "public" | "friends" | "private",
      payload: (e.payload as Record<string, unknown>) ?? {},
      reactionCounts: reactionCountsMap.get(e.id) ?? {},
      commentCount: commentCountMap.get(e.id) ?? 0,
      myReaction: myReactionMap.get(e.id) ?? null,
      createdAt: e.createdAt.toISOString(),
    };
  });

  return {
    events: result,
    nextCursor: hasMore ? (events[events.length - 1]?.createdAt.toISOString() ?? null) : null,
  };
}

/* ────────────── Reactions ────────────── */

const VALID_REACTIONS = ["🔥", "👏", "💜", "🚀", "🏆"];

export async function addReaction(
  userId: string,
  feedEventId: string,
  emoji: string
): Promise<void> {
  if (!VALID_REACTIONS.includes(emoji)) {
    throw new AppError("VALIDATION_ERROR", "Invalid reaction emoji.");
  }

  // Check event exists
  const event = await db
    .select()
    .from(socialFeedEvents)
    .where(eq(socialFeedEvents.id, feedEventId))
    .limit(1);

  if (event.length === 0) {
    throw new AppError("NOT_FOUND", "Feed event not found.");
  }

  // Check not blocked
  const eventActor = event[0].actorId;
  if (eventActor !== userId) {
    const { isBlocked } = await import("./friendship-service");
    if (await isBlocked(userId, eventActor)) {
      throw new AppError("USER_BLOCKED", "Cannot react to this content.");
    }
  }

  // Upsert reaction
  await db
    .insert(reactions)
    .values({ userId, feedEventId, emoji })
    .onConflictDoUpdate({
      target: [reactions.userId, reactions.feedEventId],
      set: { emoji },
    });
}

export async function removeReaction(
  userId: string,
  feedEventId: string
): Promise<void> {
  await db
    .delete(reactions)
    .where(
      and(eq(reactions.userId, userId), eq(reactions.feedEventId, feedEventId))
    );
}

/* ────────────── Comments ────────────── */

export async function addComment(
  userId: string,
  feedEventId: string,
  body: string
): Promise<void> {
  const trimmed = body.trim();
  if (trimmed.length === 0 || trimmed.length > 280) {
    throw new AppError("MESSAGE_TOO_LONG", "Comment must be 1-280 characters.");
  }

  // Sanitize: strip any HTML-like content
  const sanitized = trimmed.replace(/[<>]/g, "");

  // Verify feed event exists
  const event = await db
    .select({ id: socialFeedEvents.id })
    .from(socialFeedEvents)
    .where(eq(socialFeedEvents.id, feedEventId))
    .limit(1);
  if (event.length === 0) {
    throw new AppError("NOT_FOUND", "Feed event not found.");
  }

  // Rate limit: max 5 comments per event per user
  const existingCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(comments)
    .where(
      and(eq(comments.userId, userId), eq(comments.feedEventId, feedEventId))
    );

  if ((existingCount[0]?.count ?? 0) >= 5) {
    throw new AppError("SPAM_DETECTED", "Too many comments on this post.");
  }

  await db.insert(comments).values({
    userId,
    feedEventId,
    body: sanitized,
  });
}

export async function getComments(feedEventId: string, limit = 20): Promise<{
  id: string;
  userId: string;
  displayName: string;
  avatarEmoji: string;
  body: string;
  createdAt: string;
}[]> {
  const rows = await db
    .select({
      id: comments.id,
      userId: comments.userId,
      body: comments.body,
      createdAt: comments.createdAt,
      displayName: profiles.displayName,
      avatarId: profiles.avatarId,
    })
    .from(comments)
    .innerJoin(profiles, eq(profiles.userId, comments.userId))
    .where(eq(comments.feedEventId, feedEventId))
    .orderBy(sql`${comments.createdAt} asc`)
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    displayName: r.displayName,
    avatarEmoji: avatarEmojiFor(r.avatarId),
    body: r.body,
    createdAt: r.createdAt.toISOString(),
  }));
}
