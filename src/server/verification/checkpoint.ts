/**
 * PDR-4 §64: Mission Checkpoint System
 * Provides periodic checkpoints during long missions to:
 * - Verify mission is still active
 * - Detect interruption
 * - Enable partial progress tracking
 * - Improve resilience against network/device issues
 */

import "server-only";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { missions, missionSessions, missionEvents } from "@/db/schema";
import { AppError } from "@/server/http";

export type CheckpointConfig = {
  /** Interval between checkpoints in seconds */
  intervalSeconds: number;
  /** Maximum number of missed checkpoints before mission is considered interrupted */
  maxMissedCheckpoints: number;
  /** Percentage of mission that must complete checkpoints for full reward */
  completionThreshold: number;
};

export type CheckpointResult = {
  checkpointNumber: number;
  totalCheckpoints: number;
  missionProgress: number; // 0-1
  missedCheckpoints: number;
  stillActive: boolean;
  message: string;
};

const DEFAULT_CONFIG: CheckpointConfig = {
  intervalSeconds: 300, // Every 5 minutes
  maxMissedCheckpoints: 3,
  completionThreshold: 0.8,
};

/**
 * §64: Determine checkpoint interval based on mission duration.
 */
export function getCheckpointConfig(durationSeconds: number): CheckpointConfig {
  if (durationSeconds <= 600) {
    // ≤10 min: no checkpoints needed
    return { intervalSeconds: durationSeconds, maxMissedCheckpoints: 0, completionThreshold: 1 };
  }
  if (durationSeconds <= 1800) {
    // 10-30 min: checkpoint every 5 min
    return { intervalSeconds: 300, maxMissedCheckpoints: 2, completionThreshold: 0.8 };
  }
  if (durationSeconds <= 3600) {
    // 30-60 min: checkpoint every 5 min
    return { intervalSeconds: 300, maxMissedCheckpoints: 3, completionThreshold: 0.75 };
  }
  // 1+ hour: checkpoint every 10 min
  return { intervalSeconds: 600, maxMissedCheckpoints: 4, completionThreshold: 0.7 };
}

/**
 * §64: Record a checkpoint event during an active mission.
 */
export async function recordCheckpoint(
  missionId: string,
  userId: string
): Promise<CheckpointResult> {
  const mission = await db.select().from(missions).where(eq(missions.id, missionId)).limit(1);
  if (!mission[0]) throw new AppError("MISSION_NOT_FOUND", "Mission not found.");
  if (mission[0].userId !== userId) throw new AppError("FORBIDDEN", "Not your mission.");
  if (mission[0].status !== "active") {
    throw new AppError("MISSION_NOT_ACTIVE", "Mission is not active.");
  }

  // Get active session
  const session = await db.select().from(missionSessions)
    .where(and(eq(missionSessions.missionId, missionId), eq(missionSessions.status, "active")))
    .limit(1);

  // Count existing checkpoints
  const existingCheckpoints = await db.select({ count: sql<number>`count(*)::int` })
    .from(missionEvents)
    .where(and(
      eq(missionEvents.missionId, missionId),
      eq(missionEvents.type, "SESSION_CHECKPOINT")
    ));

  const checkpointCount = (existingCheckpoints[0]?.count ?? 0) + 1;
  const durationSeconds = mission[0].durationSeconds ?? 1800;
  const config = getCheckpointConfig(durationSeconds);
  const totalCheckpoints = Math.ceil(durationSeconds / config.intervalSeconds);

  // Record checkpoint event
  await db.insert(missionEvents).values({
    missionId,
    sessionId: session[0]?.id,
    type: "SESSION_CHECKPOINT",
    metadata: {
      checkpointNumber: checkpointCount,
      totalCheckpoints,
      elapsedSeconds: Math.floor((Date.now() - (mission[0].startedAt?.getTime() ?? Date.now())) / 1000),
    },
  });

  // Check for missed checkpoints
  const recentCheckpoints = await db.select({ createdAt: missionEvents.createdAt })
    .from(missionEvents)
    .where(and(
      eq(missionEvents.missionId, missionId),
      eq(missionEvents.type, "SESSION_CHECKPOINT")
    ))
    .orderBy(sql`${missionEvents.createdAt} desc`)
    .limit(config.maxMissedCheckpoints + 1);

  let missedCheckpoints = 0;
  for (let i = 1; i < recentCheckpoints.length; i++) {
    const gap = recentCheckpoints[i - 1].createdAt.getTime() - recentCheckpoints[i].createdAt.getTime();
    if (gap > config.intervalSeconds * 1000 * 1.5) {
      missedCheckpoints++;
    }
  }

  const progress = Math.min(1, checkpointCount / totalCheckpoints);
  const stillActive = missedCheckpoints < config.maxMissedCheckpoints;

  // If too many checkpoints missed, mark as interrupted
  if (!stillActive) {
    await db.update(missions)
      .set({ status: "failed", completedAt: new Date(), updatedAt: new Date() })
      .where(eq(missions.id, missionId));

    await db.insert(missionEvents).values({
      missionId,
      sessionId: session[0]?.id,
      type: "INTERRUPTION",
      metadata: { reason: "too_many_missed_checkpoints", missed: missedCheckpoints },
    });
  }

  return {
    checkpointNumber: checkpointCount,
    totalCheckpoints,
    missionProgress: progress,
    missedCheckpoints,
    stillActive,
    message: stillActive
      ? `Checkpoint ${checkpointCount}/${totalCheckpoints} — keep going!`
      : "Mission interrupted — too many missed checkpoints.",
  };
}

/**
 * §64: Get checkpoint summary for a mission.
 */
export async function getCheckpointSummary(missionId: string): Promise<{
  checkpointsCompleted: number;
  totalCheckpoints: number;
  progress: number;
  lastCheckpointAt: string | null;
}> {
  const mission = await db.select().from(missions).where(eq(missions.id, missionId)).limit(1);
  const durationSeconds = mission[0]?.durationSeconds ?? 1800;
  const config = getCheckpointConfig(durationSeconds);
  const totalCheckpoints = Math.ceil(durationSeconds / config.intervalSeconds);

  const checkpointCount = await db.select({ count: sql<number>`count(*)::int` })
    .from(missionEvents)
    .where(and(
      eq(missionEvents.missionId, missionId),
      eq(missionEvents.type, "SESSION_CHECKPOINT")
    ));

  const lastCheckpoint = await db.select({ createdAt: missionEvents.createdAt })
    .from(missionEvents)
    .where(and(
      eq(missionEvents.missionId, missionId),
      eq(missionEvents.type, "SESSION_CHECKPOINT")
    ))
    .orderBy(sql`${missionEvents.createdAt} desc`)
    .limit(1);

  const completed = checkpointCount[0]?.count ?? 0;

  return {
    checkpointsCompleted: completed,
    totalCheckpoints,
    progress: Math.min(1, completed / totalCheckpoints),
    lastCheckpointAt: lastCheckpoint[0]?.createdAt?.toISOString() ?? null,
  };
}
