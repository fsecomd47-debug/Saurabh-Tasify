import "server-only";
import { eq, and, sql, or, desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { socialMessages, profiles, blocks } from "@/db/schema";
import { AppError } from "@/server/http";
import { AVATARS_BY_ID } from "@/lib/catalog/data";
import type { DirectMessage, ConversationPreview } from "@/types";

function avatarEmojiFor(avatarId: string): string {
  return AVATARS_BY_ID[avatarId]?.emoji ?? "👤";
}

/* ────────────── Send message ────────────── */

export async function sendMessage(
  senderId: string,
  receiverId: string,
  body: string
): Promise<DirectMessage> {
  if (senderId === receiverId) {
    throw new AppError("CANNOT_FRIEND_SELF", "Cannot message yourself.");
  }

  const trimmed = body.trim();
  if (trimmed.length === 0 || trimmed.length > 500) {
    throw new AppError("MESSAGE_TOO_LONG", "Message must be 1-500 characters.");
  }

  // Check blocked
  const blockRow = await db
    .select()
    .from(blocks)
    .where(
      or(
        and(eq(blocks.blockerId, receiverId), eq(blocks.blockedId, senderId)),
        and(eq(blocks.blockerId, senderId), eq(blocks.blockedId, receiverId))
      )
    )
    .limit(1);

  if (blockRow.length > 0) {
    throw new AppError("USER_BLOCKED", "Cannot send message to this user.");
  }

  // Check target allows messages
  const targetProfile = await db
    .select({ allowMessages: profiles.allowMessages })
    .from(profiles)
    .where(eq(profiles.userId, receiverId))
    .limit(1);

  if (targetProfile.length > 0) {
    const setting = targetProfile[0].allowMessages;
    if (setting === "nobody") {
      throw new AppError("FORBIDDEN", "This user is not accepting messages.");
    }
    if (setting === "friends") {
      const { getRelationship } = await import("./friendship-service");
      const rel = await getRelationship(senderId, receiverId);
      if (rel !== "friends") {
        throw new AppError("FORBIDDEN", "This user only accepts messages from friends.");
      }
    }
  }

  // Check are friends
  const { getRelationship } = await import("./friendship-service");
  const rel = await getRelationship(senderId, receiverId);
  if (rel !== "friends") {
    throw new AppError("NOT_FRIENDS", "You can only message friends.");
  }

  // Rate limit: max 30 messages per minute
  const recentCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(socialMessages)
    .where(
      and(
        eq(socialMessages.senderId, senderId),
        sql`${socialMessages.createdAt} > now() - interval '1 minute'`
      )
    );

  if ((recentCount[0]?.count ?? 0) >= 30) {
    throw new AppError("SPAM_DETECTED", "Too many messages. Slow down.");
  }

  const sanitized = trimmed.replace(/[<>]/g, "");

  const [inserted] = await db
    .insert(socialMessages)
    .values({
      senderId,
      receiverId,
      body: sanitized,
    })
    .returning();

  // Get sender profile
  const senderProfile = await db
    .select({ displayName: profiles.displayName, avatarId: profiles.avatarId })
    .from(profiles)
    .where(eq(profiles.userId, senderId))
    .limit(1);

  return {
    id: inserted.id,
    senderId,
    senderName: senderProfile[0]?.displayName || "You",
    senderAvatar: senderProfile[0] ? avatarEmojiFor(senderProfile[0].avatarId) : "👤",
    body: sanitized,
    read: false,
    createdAt: inserted.createdAt.toISOString(),
  };
}

/* ────────────── Get conversations ────────────── */

export async function getConversations(
  userId: string
): Promise<ConversationPreview[]> {
  // Get distinct conversation partners with last message
  const rows = await db
    .select({
      partnerId: sql<string>`case when ${socialMessages.senderId} = ${userId} then ${socialMessages.receiverId} else ${socialMessages.senderId} end`,
      lastMessage: socialMessages.body,
      lastMessageAt: sql<string>`${socialMessages.createdAt}::text`,
    })
    .from(socialMessages)
    .where(
      or(
        eq(socialMessages.senderId, userId),
        eq(socialMessages.receiverId, userId)
      )
    )
    .orderBy(desc(socialMessages.createdAt))
    .limit(100);

  // Deduplicate by partner, keeping most recent
  const partnerMap = new Map<string, ConversationPreview>();

  for (const r of rows) {
    if (!partnerMap.has(r.partnerId)) {
      partnerMap.set(r.partnerId, {
        partnerId: r.partnerId,
        partnerName: "",
        partnerAvatar: "👤",
        lastMessage: r.lastMessage,
        lastMessageAt: r.lastMessageAt,
        unreadCount: 0,
      });
    }
  }

  // Get profiles for all partners
  const partnerIds = [...partnerMap.keys()];
  if (partnerIds.length === 0) return [];

  const profiles_ = await db
    .select({
      userId: profiles.userId,
      displayName: profiles.displayName,
      avatarId: profiles.avatarId,
    })
    .from(profiles)
    .where(inArray(profiles.userId, partnerIds));

  for (const p of profiles_) {
    const conv = partnerMap.get(p.userId);
    if (conv) {
      conv.partnerName = p.displayName;
      conv.partnerAvatar = avatarEmojiFor(p.avatarId);
    }
  }

  // Count unread per partner (single grouped query)
  const unreadRows =
    partnerIds.length > 0
      ? await db
          .select({
            senderId: socialMessages.senderId,
            count: sql<number>`count(*)::int`,
          })
          .from(socialMessages)
          .where(
            and(
              inArray(socialMessages.senderId, partnerIds),
              eq(socialMessages.receiverId, userId),
              eq(socialMessages.read, false)
            )
          )
          .groupBy(socialMessages.senderId)
      : [];

  const unreadMap = new Map<string, number>(
    unreadRows.map((r) => [r.senderId, r.count])
  );

  for (const partnerId of partnerIds) {
    const conv = partnerMap.get(partnerId);
    if (conv) {
      conv.unreadCount = unreadMap.get(partnerId) ?? 0;
    }
  }

  return [...partnerMap.values()].sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );
}

/* ────────────── Get conversation messages ────────────── */

export async function getConversation(
  userId: string,
  partnerId: string,
  limit = 50,
  cursor?: string
): Promise<{ messages: DirectMessage[]; nextCursor: string | null }> {
  let whereClause = or(
    and(eq(socialMessages.senderId, userId), eq(socialMessages.receiverId, partnerId)),
    and(eq(socialMessages.senderId, partnerId), eq(socialMessages.receiverId, userId))
  );

  if (cursor) {
    whereClause = and(
      whereClause,
      sql`${socialMessages.createdAt} < to_timestamp(${Math.floor(new Date(cursor).getTime() / 1000)}::double precision)`
    )!;
  }

  const rows = await db
    .select({
      id: socialMessages.id,
      senderId: socialMessages.senderId,
      body: socialMessages.body,
      read: socialMessages.read,
      createdAt: socialMessages.createdAt,
    })
    .from(socialMessages)
    .where(whereClause)
    .orderBy(desc(socialMessages.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const messages = rows.slice(0, limit);

  // Get sender profiles
  const senderIds = [...new Set(messages.map((m) => m.senderId))];
  const senderProfiles = await db
    .select({
      userId: profiles.userId,
      displayName: profiles.displayName,
      avatarId: profiles.avatarId,
    })
    .from(profiles)
    .where(inArray(profiles.userId, senderIds));

  const profileMap = new Map(
    senderProfiles.map((p) => [p.userId, { name: p.displayName, avatar: avatarEmojiFor(p.avatarId) }])
  );

  // Mark messages as read
  await db
    .update(socialMessages)
    .set({ read: true })
    .where(
      and(
        eq(socialMessages.senderId, partnerId),
        eq(socialMessages.receiverId, userId),
        eq(socialMessages.read, false)
      )
    );

  return {
    messages: messages.map((m) => {
      const profile = profileMap.get(m.senderId);
      return {
        id: m.id,
        senderId: m.senderId,
        senderName: profile?.name || "Unknown",
        senderAvatar: profile?.avatar || "👤",
        body: m.body,
        read: m.read,
        createdAt: m.createdAt.toISOString(),
      };
    }),
    nextCursor: hasMore ? (messages[messages.length - 1]?.createdAt.toISOString() ?? null) : null,
  };
}
