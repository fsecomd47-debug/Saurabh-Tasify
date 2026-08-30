import "server-only";
import { eq, and, sql, or } from "drizzle-orm";
import { db } from "@/db";
import {
  challenges,
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
import { publishFeedEvent } from "./social-feed-service";
import { createNotification } from "./social-notification-service";
import type { ChallengeView, ChallengeType, PlayerCard } from "@/types";

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

async function buildMinimalPlayerCard(userId: string): Promise<PlayerCard> {
  const rows = await db
    .select({
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
    .where(eq(profiles.userId, userId))
    .limit(1);

  if (rows.length === 0) {
    return {
      userId,
      displayName: "Unknown",
      avatarEmoji: "👤",
      title: "Newcomer",
      level: 1,
      streak: 0,
      petEmoji: null,
      petName: null,
      petLevel: null,
      rank: null,
      tier: TIERS[0].name,
      socialRelationship: "none",
    };
  }

  const r = rows[0];
  const xp = r.xp ?? 0;
  const level = levelFromXP(xp);

  const petRow = await db
    .select({
      emoji: petDefinitions.emoji,
      name: petDefinitions.name,
      level: petOwnerships.petLevel,
    })
    .from(petOwnerships)
    .innerJoin(petDefinitions, eq(petDefinitions.id, petOwnerships.petDefinitionId))
    .where(and(eq(petOwnerships.userId, userId), eq(petOwnerships.equipped, true)))
    .limit(1);

  return {
    userId,
    displayName: r.displayName,
    avatarEmoji: avatarEmojiFor(r.avatarId),
    title: computeTitle(level, r.streak ?? 0),
    level,
    streak: r.streak ?? 0,
    petEmoji: petRow[0]?.emoji ?? null,
    petName: petRow[0]?.name ?? null,
    petLevel: petRow[0]?.level ?? null,
    rank: null,
    tier: tierFor(r.balance ?? 0),
    socialRelationship: "none",
  };
}

/* ────────────── Create challenge ────────────── */

export async function createChallenge(
  creatorId: string,
  inviteeId: string,
  metric: ChallengeType = "verified_st",
  title?: string
): Promise<ChallengeView> {
  if (creatorId === inviteeId) {
    throw new AppError("CANNOT_FRIEND_SELF", "You cannot challenge yourself.");
  }

  // Check not blocked
  const { isBlocked } = await import("./friendship-service");
  if (await isBlocked(creatorId, inviteeId)) {
    throw new AppError("USER_BLOCKED", "Cannot challenge this user.");
  }

  // Check target allows challenges
  const targetProfile = await db
    .select({ allowChallenges: profiles.allowChallenges })
    .from(profiles)
    .where(eq(profiles.userId, inviteeId))
    .limit(1);

  if (targetProfile.length > 0) {
    const setting = targetProfile[0].allowChallenges;
    if (setting === "nobody") {
      throw new AppError("FORBIDDEN", "This user is not accepting challenges.");
    }
    if (setting === "friends") {
      const { getRelationship } = await import("./friendship-service");
      const rel = await getRelationship(creatorId, inviteeId);
      if (rel !== "friends") {
        throw new AppError("FORBIDDEN", "This user only accepts challenges from friends.");
      }
    }
  }

  // Check are friends
  const { getRelationship } = await import("./friendship-service");
  const rel = await getRelationship(creatorId, inviteeId);
  if (rel !== "friends") {
    throw new AppError("NOT_FRIENDS", "You can only challenge friends.");
  }

  // Check no active challenge between these two
  const activeChallenge = await db
    .select()
    .from(challenges)
    .where(
      and(
        or(
          and(eq(challenges.creatorId, creatorId), eq(challenges.inviteeId, inviteeId)),
          and(eq(challenges.creatorId, inviteeId), eq(challenges.inviteeId, creatorId))
        ),
        or(
          eq(challenges.status, "pending"),
          eq(challenges.status, "active")
        )
      )
    )
    .limit(1);

  if (activeChallenge.length > 0) {
    throw new AppError("CHALLENGE_ALREADY_ACCEPTED", "An active challenge already exists.");
  }

  const now = new Date();
  const endsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const challengeTitle =
    metric === "verified_st"
      ? "7-Day Grind"
      : metric === "missions"
      ? "Mission Marathon"
      : metric === "focus_minutes"
      ? "Focus Face-off"
      : "Fitness Face-off";

  const [inserted] = await db
    .insert(challenges)
    .values({
      creatorId,
      inviteeId,
      metric,
      title: title ?? challengeTitle,
      status: "pending",
      startsAt: now,
      endsAt,
      rewardSt: 200,
      rewardXp: 100,
    })
    .returning();

  const creatorCard = await buildMinimalPlayerCard(creatorId);
  const inviteeCard = await buildMinimalPlayerCard(inviteeId);

  return {
    id: inserted.id,
    title: inserted.title,
    creator: creatorCard,
    invitee: inviteeCard,
    metric: inserted.metric as ChallengeType,
    status: "pending",
    creatorScore: 0,
    inviteeScore: 0,
    startsAt: inserted.startsAt.toISOString(),
    endsAt: inserted.endsAt.toISOString(),
    rewardSt: inserted.rewardSt,
    rewardXp: inserted.rewardXp,
    winnerId: null,
    timeRemaining: formatTimeRemaining(inserted.endsAt),
    isMe: true,
  };
}

/* ────────────── Accept challenge ────────────── */

export async function acceptChallenge(
  userId: string,
  challengeId: string
): Promise<void> {
  const row = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, challengeId))
    .limit(1);

  if (row.length === 0) {
    throw new AppError("CHALLENGE_NOT_FOUND", "Challenge not found.");
  }

  const c = row[0];
  if (c.inviteeId !== userId) {
    throw new AppError("FORBIDDEN", "This challenge is not for you.");
  }
  if (c.status !== "pending") {
    throw new AppError("CHALLENGE_NOT_PENDING", "Challenge already accepted or finished.");
  }

  // Atomic update: only activate if still pending (prevents double-accept)
  const updated = await db
    .update(challenges)
    .set({ status: "active", updatedAt: new Date() })
    .where(and(eq(challenges.id, challengeId), eq(challenges.status, "pending")))
    .returning();

  if (updated.length === 0) {
    throw new AppError("CHALLENGE_NOT_PENDING", "Challenge was already processed.");
  }
}

/* ────────────── Decline challenge ────────────── */

export async function declineChallenge(
  userId: string,
  challengeId: string
): Promise<void> {
  const row = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, challengeId))
    .limit(1);

  if (row.length === 0) return;
  if (row[0].inviteeId !== userId) return;

  // Atomic update: only decline if still pending
  await db
    .update(challenges)
    .set({ status: "declined", updatedAt: new Date() })
    .where(and(eq(challenges.id, challengeId), eq(challenges.status, "pending")));
}

/* ────────────── Get challenge ────────────── */

export async function getChallenge(
  userId: string,
  challengeId: string
): Promise<ChallengeView | null> {
  const row = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, challengeId))
    .limit(1);

  if (row.length === 0) return null;

  const c = row[0];
  if (c.creatorId !== userId && c.inviteeId !== userId) return null;

  const creatorCard = await buildMinimalPlayerCard(c.creatorId);
  const inviteeCard = await buildMinimalPlayerCard(c.inviteeId);

  return {
    id: c.id,
    title: c.title,
    creator: creatorCard,
    invitee: inviteeCard,
    metric: c.metric as ChallengeType,
    status: c.status as ChallengeView["status"],
    creatorScore: c.creatorScore,
    inviteeScore: c.inviteeScore,
    startsAt: c.startsAt.toISOString(),
    endsAt: c.endsAt.toISOString(),
    rewardSt: c.rewardSt,
    rewardXp: c.rewardXp,
    winnerId: c.winnerId,
    timeRemaining: c.status === "active" ? formatTimeRemaining(c.endsAt) : null,
    isMe: c.creatorId === userId || c.inviteeId === userId,
  };
}

/* ────────────── List user's challenges ────────────── */

export async function listChallenges(
  userId: string,
  status?: string
): Promise<ChallengeView[]> {
  let whereClause = or(
    eq(challenges.creatorId, userId),
    eq(challenges.inviteeId, userId)
  );

  if (status) {
    whereClause = and(
      whereClause,
      eq(challenges.status, status as "pending" | "active" | "completed" | "expired" | "declined")
    )!;
  }

  const rows = await db
    .select()
    .from(challenges)
    .where(whereClause)
    .orderBy(sql`${challenges.createdAt} desc`)
    .limit(50);

  const views: ChallengeView[] = [];
  for (const c of rows) {
    const creatorCard = await buildMinimalPlayerCard(c.creatorId);
    const inviteeCard = await buildMinimalPlayerCard(c.inviteeId);
    views.push({
      id: c.id,
      title: c.title,
      creator: creatorCard,
      invitee: inviteeCard,
      metric: c.metric as ChallengeType,
      status: c.status as ChallengeView["status"],
      creatorScore: c.creatorScore,
      inviteeScore: c.inviteeScore,
      startsAt: c.startsAt.toISOString(),
      endsAt: c.endsAt.toISOString(),
      rewardSt: c.rewardSt,
      rewardXp: c.rewardXp,
      winnerId: c.winnerId,
      timeRemaining: c.status === "active" ? formatTimeRemaining(c.endsAt) : null,
      isMe: c.creatorId === userId || c.inviteeId === userId,
    });
  }

  return views;
}

/* ────────────── Update challenge scores ────────────── */

export async function updateChallengeProgress(
  userId: string,
  metric: ChallengeType,
  amount: number
): Promise<void> {
  // Find active challenges where this user participates
  const activeChallenges = await db
    .select()
    .from(challenges)
    .where(
      and(
        or(
          eq(challenges.creatorId, userId),
          eq(challenges.inviteeId, userId)
        ),
        eq(challenges.status, "active"),
        eq(challenges.metric, metric)
      )
    );

  for (const c of activeChallenges) {
    if (c.creatorId === userId) {
      await db
        .update(challenges)
        .set({
          creatorScore: sql`${challenges.creatorScore} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(challenges.id, c.id));
    } else {
      await db
        .update(challenges)
        .set({
          inviteeScore: sql`${challenges.inviteeScore} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(challenges.id, c.id));
    }
  }
}

/* ────────────── Finalize expired challenges ────────────── */

export async function finalizeExpiredChallenges(): Promise<string[]> {
  const now = new Date();
  const expired = await db
    .select()
    .from(challenges)
    .where(
      and(
        eq(challenges.status, "active"),
        sql`${challenges.endsAt} < ${now}`
      )
    );

  const settledIds: string[] = [];

  for (const c of expired) {
    let winnerId: string | null = null;
    if (c.creatorScore > c.inviteeScore) {
      winnerId = c.creatorId;
    } else if (c.inviteeScore > c.creatorScore) {
      winnerId = c.inviteeId;
    }
    // tie = no winner

    await db
      .update(challenges)
      .set({
        status: "completed",
        winnerId,
        updatedAt: new Date(),
      })
      .where(eq(challenges.id, c.id));

    // Fire social events for challenge completion
    const challengeTitle = c.title || `${c.metric} challenge`;
    const basePayload = {
      challengeId: c.id,
      title: challengeTitle,
      metric: c.metric,
      creatorScore: c.creatorScore,
      inviteeScore: c.inviteeScore,
    };

    // Notify creator
    await createNotification({
      userId: c.creatorId,
      type: "CHALLENGE_RESULT",
      entityId: c.id,
      entityType: "challenge",
      body: winnerId === c.creatorId
        ? `You won the "${challengeTitle}" challenge!`
        : winnerId === c.inviteeId
          ? `You lost the "${challengeTitle}" challenge.`
          : `The "${challengeTitle}" challenge ended in a tie.`,
    }).catch(() => {});

    // Notify invitee
    await createNotification({
      userId: c.inviteeId,
      type: "CHALLENGE_RESULT",
      entityId: c.id,
      entityType: "challenge",
      body: winnerId === c.inviteeId
        ? `You won the "${challengeTitle}" challenge!`
        : winnerId === c.creatorId
          ? `You lost the "${challengeTitle}" challenge.`
          : `The "${challengeTitle}" challenge ended in a tie.`,
    }).catch(() => {});

    // Publish to social feed (visible to friends)
    await publishFeedEvent({
      actorId: winnerId ?? c.creatorId,
      eventType: "MISSION_COMPLETED",
      visibility: "friends",
      payload: {
        ...basePayload,
        gameEventType: "CHALLENGE_COMPLETED",
        winnerId,
        isTie: winnerId === null,
      },
    }).catch(() => {});

    settledIds.push(c.id);
  }

  return settledIds;
}

/* ────────────── Helpers ────────────── */

function formatTimeRemaining(endsAt: Date): string {
  const diff = endsAt.getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  return `${hours}h ${minutes}m`;
}

export async function rematchChallenge(
  challengeId: string,
  userId: string
): Promise<ChallengeView> {
  const original = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, challengeId))
    .limit(1);

  if (original.length === 0) {
    throw new AppError("NOT_FOUND", "Challenge not found.");
  }

  const c = original[0];
  if (c.status !== "completed" && c.status !== "declined") {
    throw new AppError("CHALLENGE_NOT_ACTIVE", "Can only rematch completed or declined challenges.");
  }

  if (c.creatorId !== userId && c.inviteeId !== userId) {
    throw new AppError("FORBIDDEN", "You were not part of this challenge.");
  }

  const newCreatorId = c.creatorId;
  const newInviteeId = c.inviteeId;

  const activeChallenge = await db
    .select()
    .from(challenges)
    .where(
      and(
        or(
          and(eq(challenges.creatorId, newCreatorId), eq(challenges.inviteeId, newInviteeId)),
          and(eq(challenges.creatorId, newInviteeId), eq(challenges.inviteeId, newCreatorId))
        ),
        or(
          eq(challenges.status, "pending"),
          eq(challenges.status, "active")
        )
      )
    )
    .limit(1);

  if (activeChallenge.length > 0) {
    throw new AppError("CHALLENGE_ALREADY_ACCEPTED", "An active challenge already exists between you two.");
  }

  const now = new Date();
  const endsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [inserted] = await db
    .insert(challenges)
    .values({
      creatorId: newCreatorId,
      inviteeId: newInviteeId,
      metric: c.metric,
      title: `${c.title} (Rematch)`,
      status: "pending",
      startsAt: now,
      endsAt,
      rewardSt: 200,
      rewardXp: 100,
    })
    .returning();

  const creatorCard = await buildMinimalPlayerCard(newCreatorId);
  const inviteeCard = await buildMinimalPlayerCard(newInviteeId);

  return {
    id: inserted.id,
    title: inserted.title,
    creator: creatorCard,
    invitee: inviteeCard,
    creatorScore: 0,
    inviteeScore: 0,
    metric: inserted.metric as ChallengeType,
    status: "pending",
    rewardSt: inserted.rewardSt,
    rewardXp: inserted.rewardXp,
    startsAt: inserted.startsAt.toISOString(),
    endsAt: inserted.endsAt.toISOString(),
    timeRemaining: formatTimeRemaining(inserted.endsAt),
    winnerId: null,
    isMe: userId === newCreatorId || userId === newInviteeId,
  };
}
