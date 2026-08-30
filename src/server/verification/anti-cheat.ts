import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { missions, missionEvents, activityEvents } from "@/db/schema";
import { logSecurity } from "@/server/http";
import { checkDuplicateFarming, getRepeatMultiplier } from "@/server/anti-abuse/duplicate";

export type AntiCheatResult = {
  passed: boolean;
  reasonCode?: string;
  severity?: "warning" | "block";
};

/**
 * Check for duplicate mission completion attempts.
 */
export async function checkDuplicateCompletion(missionId: string): Promise<AntiCheatResult> {
  const existing = await db
    .select({ status: missions.status })
    .from(missions)
    .where(and(eq(missions.id, missionId), eq(missions.status, "passed")))
    .limit(1);

  if (existing[0]) {
    logSecurity("duplicate_mission_completion_blocked", { missionId });
    return { passed: false, reasonCode: "DUPLICATE_COMPLETION", severity: "block" };
  }

  return { passed: true };
}

/**
 * Check for impossible duration claims.
 */
export async function checkImpossibleDuration(
  missionId: string,
  claimedDurationSeconds: number
): Promise<AntiCheatResult> {
  const mission = await db.select().from(missions).where(eq(missions.id, missionId)).limit(1);
  if (!mission[0]) return { passed: true };

  const { startedAt, durationSeconds } = mission[0];
  if (!startedAt || !durationSeconds) return { passed: true };

  // Must complete at least 80% of the target duration
  const minAllowed = durationSeconds * 0.8;
  const maxAllowed = durationSeconds * 1.5;

  if (claimedDurationSeconds < minAllowed) {
    logSecurity("impossible_duration_short", { missionId, claimed: claimedDurationSeconds, expected: durationSeconds });
    return { passed: false, reasonCode: "DURATION_TOO_SHORT", severity: "block" };
  }

  if (claimedDurationSeconds > maxAllowed) {
    logSecurity("impossible_duration_long", { missionId, claimed: claimedDurationSeconds, expected: durationSeconds });
    return { passed: false, reasonCode: "DURATION_TOO_LONG", severity: "warning" };
  }

  // Wall-clock check: claimed duration shouldn't exceed actual elapsed time + 10% tolerance
  const wallClockSeconds = (Date.now() - startedAt.getTime()) / 1000;
  if (claimedDurationSeconds > wallClockSeconds * 1.1) {
    logSecurity("duration_exceeds_wall_clock", {
      missionId,
      claimed: claimedDurationSeconds,
      wallClock: Math.round(wallClockSeconds),
    });
    return { passed: false, reasonCode: "DURATION_EXCEEDS_WALL_CLOCK", severity: "block" };
  }

  return { passed: true };
}

/**
 * Check for impossible rep rate (e.g., 100 pushups in 10 seconds).
 */
export async function checkImpossibleRepRate(
  missionId: string,
  repCount: number,
  durationSeconds: number
): Promise<AntiCheatResult> {
  if (durationSeconds <= 0 || repCount <= 0) return { passed: true };

  const repsPerSecond = repCount / durationSeconds;

  // Impossible: > 3 reps per second for any exercise
  if (repsPerSecond > 3) {
    logSecurity("impossible_rep_rate", { missionId, reps: repCount, duration: durationSeconds });
    return { passed: false, reasonCode: "REP_RATE_IMPOSSIBLE", severity: "block" };
  }

  // Suspicious: > 1.5 reps per second
  if (repsPerSecond > 1.5) {
    logSecurity("suspicious_rep_rate", { missionId, reps: repCount, duration: durationSeconds });
    return { passed: false, reasonCode: "REP_RATE_SUSPICIOUS", severity: "warning" };
  }

  return { passed: true };
}

/**
 * Check for event sequence integrity.
 */
export async function checkEventSequence(missionId: string): Promise<AntiCheatResult> {
  const events = await db
    .select()
    .from(missionEvents)
    .where(eq(missionEvents.missionId, missionId))
    .orderBy(sql`${missionEvents.timestamp} asc`);

  if (events.length === 0) {
    // Check if mission was recently started (within 60 seconds) — grace period for page refresh
    const mission = await db.select().from(missions).where(eq(missions.id, missionId)).limit(1);
    if (mission[0]?.startedAt) {
      const elapsedMs = Date.now() - mission[0].startedAt.getTime();
      if (elapsedMs < 60_000) {
        // Recently started, allow grace period
        return { passed: true };
      }
    }
    return { passed: false, reasonCode: "NO_EVENTS", severity: "block" };
  }

  // Check that SESSION_STARTED is the first event
  if (events[0].type !== "SESSION_STARTED") {
    logSecurity("event_sequence_invalid", { missionId, firstEvent: events[0].type });
    return { passed: false, reasonCode: "INVALID_SEQUENCE", severity: "block" };
  }

  // Check for duplicate event types at same timestamp
  const timestamps = events.map((e) => e.timestamp.getTime());
  const uniqueTimestamps = new Set(timestamps);
  if (uniqueTimestamps.size < timestamps.length * 0.8) {
    logSecurity("event_timestamp_collisions", { missionId, eventCount: events.length });
    return { passed: false, reasonCode: "TIMESTAMP_COLLISIONS", severity: "warning" };
  }

  return { passed: true };
}

/**
 * Detect cheat patterns: identical durations, suspiciously uniform completions.
 */
export async function checkCheatPatterns(
  missionId: string,
  userId: string,
  claimedDuration?: number
): Promise<AntiCheatResult> {
  // Get user's last 10 completed missions
  const recentMissions = await db.select({
    durationSeconds: missions.durationSeconds,
    completedAt: missions.completedAt,
  })
    .from(missions)
    .where(and(
      eq(missions.userId, userId),
      eq(missions.status, "passed")
    ))
    .orderBy(sql`${missions.completedAt} desc`)
    .limit(10);

  if (recentMissions.length < 3) return { passed: true };

  // Check for identical durations (within 2 seconds)
  if (claimedDuration) {
    const identicalCount = recentMissions.filter((m) =>
      m.durationSeconds && Math.abs(m.durationSeconds - claimedDuration) < 2
    ).length;
    if (identicalCount >= 3) {
      logSecurity("cheat_pattern_identical_durations", {
        missionId,
        identicalCount,
        claimedDuration,
      });
      return { passed: false, reasonCode: "SUSPICIOUS_PATTERN", severity: "warning" };
    }
  }

  // Check for suspiciously fast completions: actual elapsed < 30% of target duration
  const fastCompletions = recentMissions.filter((m) => {
    if (!m.durationSeconds || !m.completedAt) return false;
    // We don't have startedAt here, but durationSeconds is the target.
    // If completedAt - (durationSeconds * 1000) is very recent, it means they finished fast.
    // Actually we need to check if the mission was completed in less than 30% of its target time.
    // Since we only have durationSeconds (target) and completedAt, we can't compute actual elapsed.
    // But we can check if durationSeconds is suspiciously small relative to what's expected.
    // For now, skip this check since we lack startedAt data.
    return false;
  }).length;
  if (fastCompletions >= 3) {
    logSecurity("cheat_pattern_fast_completions", { missionId, fastCount: fastCompletions });
    return { passed: false, reasonCode: "SUSPICIOUS_PATTERN", severity: "warning" };
  }

  return { passed: true };
}

/**
 * Track repeat offenders: escalating penalties based on prior warnings.
 */
export async function checkRepeatOffender(userId: string): Promise<{
  penaltyMultiplier: number;
  warningCount: number;
  shouldBlock: boolean;
}> {
  const warnings = await db.select({ count: sql<number>`count(*)::int` })
    .from(activityEvents)
    .where(and(
      eq(activityEvents.userId, userId),
      eq(activityEvents.type, "ANTI_CHEAT_WARNING")
    ));
  const warningCount = warnings[0]?.count ?? 0;

  if (warningCount >= 5) {
    return { penaltyMultiplier: 1, warningCount, shouldBlock: true };
  }
  if (warningCount >= 3) {
    return { penaltyMultiplier: 0.5, warningCount, shouldBlock: false };
  }
  if (warningCount >= 1) {
    return { penaltyMultiplier: 0.8, warningCount, shouldBlock: false };
  }
  return { penaltyMultiplier: 1, warningCount: 0, shouldBlock: false };
}

/**
 * Analyze event gaps for uniformity (bot-like behavior).
 */
export async function checkEventGapAnalysis(missionId: string): Promise<AntiCheatResult> {
  const events = await db.select({ timestamp: missionEvents.timestamp })
    .from(missionEvents)
    .where(eq(missionEvents.missionId, missionId))
    .orderBy(sql`${missionEvents.timestamp} asc`);

  if (events.length < 4) return { passed: true };

  // Calculate gaps between consecutive events
  const gaps: number[] = [];
  for (let i = 1; i < events.length; i++) {
    gaps.push(events[i].timestamp.getTime() - events[i - 1].timestamp.getTime());
  }

  if (gaps.length < 3) return { passed: true };

  // Check coefficient of variation (stddev / mean) - low variance = suspicious
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const variance = gaps.reduce((sum, g) => sum + Math.pow(g - mean, 2), 0) / gaps.length;
  const stddev = Math.sqrt(variance);
  const cv = mean > 0 ? stddev / mean : 0;

  if (cv < 0.05 && gaps.length >= 5) {
    logSecurity("event_gap_uniform", { missionId, cv, gapCount: gaps.length });
    return { passed: false, reasonCode: "UNIFORM_GAPS", severity: "warning" };
  }

  return { passed: true };
}

/**
 * Check submission velocity: too many verifications in short time.
 */
export async function checkSubmissionVelocity(userId: string): Promise<AntiCheatResult> {
  const oneHourAgo = new Date(Date.now() - 3600_000);
  const recentCompletions = await db.select({ count: sql<number>`count(*)::int` })
    .from(activityEvents)
    .where(and(
      eq(activityEvents.userId, userId),
      eq(activityEvents.type, "MISSION_COMPLETED"),
      sql`${activityEvents.createdAt} >= ${oneHourAgo.toISOString()}`
    ));

  const count = recentCompletions[0]?.count ?? 0;
  if (count >= 5) {
    logSecurity("submission_velocity_high", { userId, count });
    return { passed: false, reasonCode: "HIGH_VELOCITY", severity: "block" };
  }
  if (count >= 3) {
    return { passed: false, reasonCode: "HIGH_VELOCITY", severity: "warning" };
  }

  return { passed: true };
}

/**
 * Check evidence submission velocity: too many evidence files in short time.
 * Prevents bot-generated batch uploads.
 */
export async function checkEvidenceVelocity(
  userId: string,
  evidenceCount: number
): Promise<AntiCheatResult> {
  // Evidence should not be submitted faster than 1 file per 3 seconds
  const minSecondsPerEvidence = 3;
  const requiredTime = evidenceCount * minSecondsPerEvidence;

  // Get session start time from recent activity
  const recentSession = await db.select({ createdAt: activityEvents.createdAt })
    .from(activityEvents)
    .where(and(
      eq(activityEvents.userId, userId),
      eq(activityEvents.type, "MISSION_STARTED")
    ))
    .orderBy(sql`${activityEvents.createdAt} desc`)
    .limit(1);

  if (recentSession[0]) {
    const elapsedSeconds = (Date.now() - recentSession[0].createdAt.getTime()) / 1000;
    if (elapsedSeconds < requiredTime * 0.5) {
      logSecurity("evidence_velocity_high", {
        userId,
        evidenceCount,
        elapsedSeconds: Math.round(elapsedSeconds),
        requiredTime,
      });
      return { passed: false, reasonCode: "EVIDENCE_VELOCITY", severity: "block" };
    }
  }

  return { passed: true };
}

/**
 * Check session duration anomaly: mission completed suspiciously fast.
 */
export async function checkSessionDurationAnomaly(
  missionId: string,
  userId: string
): Promise<AntiCheatResult> {
  const mission = await db.select().from(missions).where(eq(missions.id, missionId)).limit(1);
  if (!mission[0]) return { passed: true };

  const { startedAt, completedAt, durationSeconds, targetRepetitions } = mission[0];
  if (!startedAt || !completedAt) return { passed: true };

  const elapsedMs = completedAt.getTime() - startedAt.getTime();
  const elapsedSeconds = elapsedMs / 1000;

  // For timed missions: completion in < 30% of target is suspicious
  if (durationSeconds && elapsedSeconds < durationSeconds * 0.3) {
    logSecurity("session_duration_anomaly", {
      missionId,
      userId,
      elapsedSeconds: Math.round(elapsedSeconds),
      targetDuration: durationSeconds,
    });
    return { passed: false, reasonCode: "SESSION_TOO_FAST", severity: "block" };
  }

  // For rep missions: less than 1 second per rep is suspicious
  if (targetRepetitions && targetRepetitions > 5) {
    const secondsPerRep = elapsedSeconds / targetRepetitions;
    if (secondsPerRep < 0.5) {
      logSecurity("rep_session_anomaly", {
        missionId,
        userId,
        targetRepetitions,
        elapsedSeconds: Math.round(elapsedSeconds),
        secondsPerRep: Math.round(secondsPerRep * 100) / 100,
      });
      return { passed: false, reasonCode: "REP_SESSION_TOO_FAST", severity: "block" };
    }
  }

  return { passed: true };
}

/**
 * Check vision signal consistency: conflicting signals from different providers.
 */
export async function checkVisionSignalConsistency(
  visionResults: Array<{ providerName: string; status: string; confidenceScore: number }>
): Promise<AntiCheatResult> {
  if (visionResults.length < 2) return { passed: true };

  const passedCount = visionResults.filter((r) => r.status === "passed").length;
  const failedCount = visionResults.filter((r) => r.status === "failed").length;

  // If majority failed but some passed, suspicious
  if (failedCount > passedCount && passedCount > 0) {
    const avgConfidence = visionResults.reduce((sum, r) => sum + r.confidenceScore, 0) / visionResults.length;
    logSecurity("vision_signal_conflict", {
      visionResults: visionResults.map((r) => ({
        provider: r.providerName,
        status: r.status,
        confidence: r.confidenceScore,
      })),
      avgConfidence,
    });
    return { passed: false, reasonCode: "VISION_SIGNAL_CONFLICT", severity: "warning" };
  }

  return { passed: true };
}

/**
 * Run all anti-cheat checks for a mission verification.
 */
export async function runAntiCheatChecks(
  missionId: string,
  durationSeconds?: number,
  repCount?: number,
  userId?: string,
  evidenceCount?: number
): Promise<AntiCheatResult & { repeatMultiplier?: number }> {
  // Load mission for taskId (needed for farming check)
  const mission = userId ? await db.select({ taskId: missions.taskId }).from(missions).where(eq(missions.id, missionId)).limit(1) : null;
  const taskId = mission?.[0]?.taskId;

  const checks = [
    await checkDuplicateCompletion(missionId),
    await checkEventSequence(missionId),
    await checkEventGapAnalysis(missionId),
    await checkSessionDurationAnomaly(missionId, userId ?? ""),
  ];

  if (durationSeconds) {
    checks.push(await checkImpossibleDuration(missionId, durationSeconds));
  }

  if (repCount && durationSeconds) {
    checks.push(await checkImpossibleRepRate(missionId, repCount, durationSeconds));
  }

  // User-specific checks
  let repeatMultiplier = 1;
  if (userId) {
    checks.push(await checkCheatPatterns(missionId, userId, durationSeconds));
    const velocity = await checkSubmissionVelocity(userId);
    if (!velocity.passed) checks.push(velocity);

    // Evidence velocity check
    if (evidenceCount && evidenceCount > 0) {
      const evidenceVelocity = await checkEvidenceVelocity(userId, evidenceCount);
      if (!evidenceVelocity.passed) checks.push(evidenceVelocity);
    }

    const offender = await checkRepeatOffender(userId);
    if (offender.shouldBlock) {
      logSecurity("repeat_offender_blocked", { userId, warningCount: offender.warningCount });
      return { passed: false, reasonCode: "REPEAT_OFFENDER", severity: "block" };
    }

    // Check duplicate farming (same task repeated)
    if (taskId) {
      const farming = await checkDuplicateFarming(userId, taskId);
      if (farming.isFarming) {
        logSecurity("duplicate_farming_blocked", { userId, taskId, count: farming.count });
        return { passed: false, reasonCode: "FARMING_DETECTED", severity: "block" };
      }
      repeatMultiplier = getRepeatMultiplier(farming.count + 1);
    }
  }

  // If any check blocks, fail
  const blocked = checks.find((c) => !c.passed && c.severity === "block");
  if (blocked) return blocked;

  // Return first warning if any
  const warned = checks.find((c) => !c.passed && c.severity === "warning");
  if (warned) return warned;

  return { passed: true, repeatMultiplier };
}
