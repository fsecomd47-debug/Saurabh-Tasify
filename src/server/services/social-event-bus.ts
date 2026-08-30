import "server-only";
import type { SocialEventType } from "@/types";
import { publishFeedEvent } from "./social-feed-service";
import { updateChallengeProgress } from "./challenge-service";
import { notifyMilestone } from "./social-notification-service";

/* ────────────────────────────────────────────────────────────────
 * Social Event Bus
 *
 * One authoritative game event → many social surfaces.
 * This listens to existing game events and fans them out to:
 *   - Social feed
 *   - Challenge progress
 *   - Notifications
 *
 * The game pipeline already handles: wallet, XP, pets, quests,
 * leaderboard, achievements. Social bus adds the social layer.
 * ──────────────────────────────────────────────────────────────── */

type GameEvent = {
  type: string;
  userId: string;
  metadata: Record<string, unknown>;
};

/** Map of game event types to their social event type and visibility. */
const EVENT_MAP: Record<
  string,
  {
    socialType: SocialEventType;
    visibility: "public" | "friends" | "private";
    challengeMetric?: "verified_st" | "missions";
    challengeAmount?: (meta: Record<string, unknown>) => number;
  }
> = {
  MISSION_COMPLETED: {
    socialType: "MISSION_COMPLETED",
    visibility: "friends",
    challengeMetric: "missions",
    challengeAmount: () => 1,
  },
  ST_EARNED: {
    socialType: "MISSION_COMPLETED",
    visibility: "friends",
    challengeMetric: "verified_st",
    challengeAmount: (meta) => (meta.amount as number) ?? 0,
  },
  LEVEL_UP: {
    socialType: "LEVEL_UP",
    visibility: "public",
  },
  PET_LEVEL_UP: {
    socialType: "PET_LEVEL_UP",
    visibility: "friends",
  },
  PET_PURCHASED: {
    socialType: "PET_UNLOCKED",
    visibility: "friends",
  },
  BADGE_UNLOCKED: {
    socialType: "BADGE_UNLOCKED",
    visibility: "public",
  },
  QUEST_COMPLETED: {
    socialType: "QUEST_COMPLETED",
    visibility: "friends",
  },
  RANK_MILESTONE: {
    socialType: "RANK_MILESTONE",
    visibility: "public",
  },
  STREAK_MILESTONE: {
    socialType: "STREAK_MILESTONE",
    visibility: "friends",
  },
};

/**
 * Process a game event through the social pipeline.
 * Called from the settlement/completion handlers after the authoritative
 * game event has been persisted.
 */
export async function processGameEvent(event: GameEvent): Promise<void> {
  const mapping = EVENT_MAP[event.type];
  if (!mapping) return;

  try {
    // 1. Publish to social feed
    await publishFeedEvent({
      actorId: event.userId,
      eventType: mapping.socialType,
      visibility: mapping.visibility,
      payload: {
        ...event.metadata,
        gameEventType: event.type,
      },
    });

    // 2. Update challenge progress if applicable
    if (mapping.challengeMetric) {
      const amount = mapping.challengeAmount?.(event.metadata) ?? 0;
      if (amount > 0) {
        await updateChallengeProgress(event.userId, mapping.challengeMetric, amount);
      }
    }

    // 3. Generate milestone notifications
    await generateMilestoneNotifications(event);
  } catch (err) {
    // Social bus failures should NOT break the game pipeline
    console.error(`[social-event-bus] Failed to process ${event.type}:`, err);
  }
}

/**
 * Generate notifications for significant milestones.
 * Not every event needs a notification — only meaningful ones.
 */
async function generateMilestoneNotifications(event: GameEvent): Promise<void> {
  const { type, userId, metadata } = event;

  // Level-up milestones
  if (type === "LEVEL_UP") {
    const level = metadata.level as number;
    if ([5, 10, 15, 20, 25, 30].includes(level)) {
      await notifyMilestone(userId, `You reached Level ${level}!`);
    }
  }

  // Streak milestones
  if (type === "STREAK_MILESTONE") {
    const streak = metadata.streak as number;
    if ([7, 14, 21, 30, 60, 90, 100, 365].includes(streak)) {
      await notifyMilestone(userId, `You maintained a ${streak}-day streak!`);
    }
  }
}
