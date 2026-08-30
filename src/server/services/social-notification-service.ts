import "server-only";
import { eq, and, sql, desc } from "drizzle-orm";
import { db } from "@/db";
import { socialNotifications, profiles, users } from "@/db/schema";
import { AVATARS_BY_ID } from "@/lib/catalog/data";
import type { SocialNotification } from "@/types";

function avatarEmojiFor(avatarId: string): string {
  return AVATARS_BY_ID[avatarId]?.emoji ?? "👤";
}

/* ────────────── Create notification ────────────── */

export async function createNotification(input: {
  userId: string;
  type: string;
  actorId?: string;
  entityId?: string;
  entityType?: string;
  body: string;
}): Promise<void> {
  await db.insert(socialNotifications).values({
    userId: input.userId,
    type: input.type,
    actorId: input.actorId ?? null,
    entityId: input.entityId ?? null,
    entityType: input.entityType ?? null,
    body: input.body,
  });
}

/* ────────────── Get notifications ────────────── */

export async function getNotifications(
  userId: string,
  limit = 30
): Promise<SocialNotification[]> {
  const rows = await db
    .select({
      id: socialNotifications.id,
      type: socialNotifications.type,
      actorId: socialNotifications.actorId,
      entityId: socialNotifications.entityId,
      entityType: socialNotifications.entityType,
      body: socialNotifications.body,
      read: socialNotifications.read,
      createdAt: socialNotifications.createdAt,
      actorName: profiles.displayName,
      actorAvatarId: profiles.avatarId,
    })
    .from(socialNotifications)
    .leftJoin(profiles, eq(profiles.userId, socialNotifications.actorId))
    .where(eq(socialNotifications.userId, userId))
    .orderBy(desc(socialNotifications.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    actorName: r.actorName || "Someone",
    actorAvatar: r.actorAvatarId ? avatarEmojiFor(r.actorAvatarId) : "👤",
    body: r.body,
    entityId: r.entityId,
    entityType: r.entityType,
    read: r.read,
    createdAt: r.createdAt.toISOString(),
  }));
}

/* ────────────── Get unread count ────────────── */

export async function getUnreadCount(userId: string): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(socialNotifications)
    .where(
      and(eq(socialNotifications.userId, userId), eq(socialNotifications.read, false))
    );

  return rows[0]?.count ?? 0;
}

/* ────────────── Mark as read ────────────── */

export async function markAsRead(userId: string, notificationId?: string): Promise<void> {
  if (notificationId) {
    await db
      .update(socialNotifications)
      .set({ read: true })
      .where(
        and(
          eq(socialNotifications.id, notificationId),
          eq(socialNotifications.userId, userId)
        )
      );
  } else {
    await db
      .update(socialNotifications)
      .set({ read: true })
      .where(
        and(eq(socialNotifications.userId, userId), eq(socialNotifications.read, false))
      );
  }
}

/* ────────────── Notification helpers ────────────── */

export async function notifyFriendRequest(
  addresseeId: string,
  requesterName: string
): Promise<void> {
  await createNotification({
    userId: addresseeId,
    type: "FRIEND_REQUEST",
    body: `${requesterName} wants to connect.`,
  });
}

export async function notifyFriendAccepted(
  requesterId: string,
  acceptorName: string
): Promise<void> {
  await createNotification({
    userId: requesterId,
    type: "FRIEND_ACCEPTED",
    body: `${acceptorName} accepted your friend request.`,
  });
}

export async function notifyChallengeInvitation(
  inviteeId: string,
  creatorName: string,
  challengeTitle: string,
  challengeId: string
): Promise<void> {
  await createNotification({
    userId: inviteeId,
    type: "CHALLENGE_INVITATION",
    entityId: challengeId,
    entityType: "challenge",
    body: `${creatorName} challenged you: ${challengeTitle}`,
  });
}

export async function notifyChallengeResult(
  userId: string,
  opponentName: string,
  won: boolean,
  challengeTitle: string,
  challengeId: string
): Promise<void> {
  await createNotification({
    userId,
    type: "CHALLENGE_RESULT",
    entityId: challengeId,
    entityType: "challenge",
    body: won
      ? `You won the ${challengeTitle} against ${opponentName}!`
      : `${opponentName} won the ${challengeTitle}. Keep pushing!`,
  });
}

export async function notifyReaction(
  feedOwnerUserId: string,
  reactorId: string,
  reactorName: string,
  emoji: string,
  feedEventId: string
): Promise<void> {
  await createNotification({
    userId: feedOwnerUserId,
    type: "REACTION",
    actorId: reactorId,
    entityId: feedEventId,
    entityType: "feed_event",
    body: `${reactorName} reacted ${emoji} to your achievement.`,
  });
}

export async function notifyMilestone(
  userId: string,
  body: string
): Promise<void> {
  await createNotification({
    userId,
    type: "MILESTONE",
    body,
  });
}
