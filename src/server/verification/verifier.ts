import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  missions,
  missionSessions,
  missionEvents,
  verificationResults,
  activityEvents,
} from "@/db/schema";
import { AppError, logSecurity } from "@/server/http";
import { classifyConfidence, calculateFocusConfidence, calculateRepetitionConfidence } from "./confidence";
import { runAntiCheatChecks } from "./anti-cheat";
import { runAnomalyDetection } from "./anomaly-detection";
import { isValidTransition, isTerminalStatus } from "./state-machine";
import type { MissionStatus } from "@/types";

export type VerificationInput = {
  status: "passed" | "failed" | "uncertain";
  confidenceScore: number;
  durationSeconds?: number;
  repetitionCount?: number;
  presenceSamples?: number;
  reasonCode: string;
  metadata?: Record<string, unknown>;
};

export type VerificationOutput = {
  resultId: string;
  status: "passed" | "failed" | "uncertain";
  confidenceClass: "high" | "medium" | "low";
  reasonCode: string;
};

/**
 * Server-side verification of a mission.
 * Validates events, runs anti-cheat, computes confidence, stores result.
 */
export async function verifyMission(
  missionId: string,
  userId: string,
  input: VerificationInput
): Promise<VerificationOutput> {
  // 1. Load mission
  const mission = await db.select().from(missions).where(eq(missions.id, missionId)).limit(1);
  if (!mission[0]) throw new AppError("MISSION_NOT_FOUND", "Mission not found.");
  if (mission[0].userId !== userId) throw new AppError("FORBIDDEN", "Not your mission.");

  const activeStatuses: MissionStatus[] = ["active", "verifying"];
  if (!activeStatuses.includes(mission[0].status as MissionStatus)) {
    throw new AppError("MISSION_TERMINAL", `Mission is already ${mission[0].status}.`);
  }

  // §111: Validate that we can transition from current status to any target status
  const currentStatus = mission[0].status as MissionStatus;

  // 2. Run anti-cheat
  const antiCheat = await runAntiCheatChecks(
    missionId,
    input.durationSeconds,
    input.repetitionCount,
    userId
  );
  if (!antiCheat.passed && antiCheat.severity === "block") {
    await db.update(missions)
      .set({ status: "failed", completedAt: new Date(), updatedAt: new Date() })
      .where(eq(missions.id, missionId));

    logSecurity("mission_anti_cheat_blocked", {
      missionId,
      reason: antiCheat.reasonCode,
    });

    return {
      resultId: "",
      status: "failed",
      confidenceClass: "low",
      reasonCode: antiCheat.reasonCode ?? "ANTI_CHEAT_FAILED",
    };
  }

  // 2b. Log anti-cheat warnings for repeat offender tracking
  if (antiCheat.severity === "warning") {
    await db.insert(activityEvents).values({
      userId,
      type: "ANTI_CHEAT_WARNING",
      entityId: missionId,
      metadata: { reasonCode: antiCheat.reasonCode },
    });
  }

  // 2c. PDR-4.3: Run anomaly detection on verification patterns
  const anomaly = await runAnomalyDetection(missionId, mission[0].verificationMode);
  if (anomaly.level === "review" || anomaly.level === "restricted") {
    await db.update(missions)
      .set({ status: "failed", completedAt: new Date(), updatedAt: new Date() })
      .where(eq(missions.id, missionId));

    logSecurity("anomaly_detection_blocked", {
      missionId,
      level: anomaly.level,
      signals: anomaly.signals,
    });

    return {
      resultId: "",
      status: "failed",
      confidenceClass: "low",
      reasonCode: `ANOMALY_${anomaly.level.toUpperCase()}`,
    };
  }

  // 3. Compute confidence from server-side event data (never trust client-submitted score)
  let finalConfidence = 0;

  if (mission[0].verificationMode === "focus" || mission[0].verificationMode === "timed") {
    // Count actual presence samples from events
    const presenceEvents = await db.select().from(missionEvents)
      .where(and(
        eq(missionEvents.missionId, missionId),
        eq(missionEvents.type, "PRESENCE_CONFIRMED")
      ));
    const presenceSamples = presenceEvents.length;

    // §64: Count checkpoint events for adaptive confidence
    const checkpointEvents = await db.select().from(missionEvents)
      .where(and(
        eq(missionEvents.missionId, missionId),
        eq(missionEvents.type, "SESSION_CHECKPOINT")
      ));
    const checkpointsCompleted = checkpointEvents.length;

    // §64: Compute expected checkpoints from mission duration
    const durationSeconds = mission[0].durationSeconds ?? 0;
    let expectedCheckpoints = 0;
    if (durationSeconds > 600) {
      const intervalSeconds = durationSeconds <= 3600 ? 300 : 600;
      expectedCheckpoints = Math.ceil(durationSeconds / intervalSeconds);
    }
    const expectedSamples = mission[0].durationSeconds
      ? Math.ceil(mission[0].durationSeconds / 300) // Expected every 5 min for presence
      : 1;

    // Count interruption events (tab switches, visibility changes)
    const interruptionEvents = await db.select().from(missionEvents)
      .where(and(
        eq(missionEvents.missionId, missionId),
        eq(missionEvents.type, "INTERRUPTION")
      ));
    const interruptions = interruptionEvents.length;

    // §64: Use enhanced confidence calculation with checkpoint data
    const baseConfidence = calculateFocusConfidence({
      targetSeconds: mission[0].durationSeconds ?? 0,
      actualSeconds: input.durationSeconds ?? 0,
      presenceSamples,
      expectedSamples,
      interruptions,
    });

    // §64: Bonus for checkpoint completion (up to +0.1)
    const checkpointBonus = expectedCheckpoints > 0
      ? Math.min(0.1, (checkpointsCompleted / expectedCheckpoints) * 0.1)
      : 0;

    finalConfidence = Math.min(1, baseConfidence + checkpointBonus);
  } else if (mission[0].verificationMode === "pose" || mission[0].verificationMode === "repetition") {
    finalConfidence = calculateRepetitionConfidence({
      targetReps: mission[0].targetRepetitions ?? 1,
      validReps: input.repetitionCount ?? 0,
      formScore: 0.8, // Default form score
      averageRepQuality: 0.8,
    });
  } else if (mission[0].verificationMode === "self_reported") {
    // Self-reported: fixed confidence at 0.6 (lower than camera-verified)
    finalConfidence = 0.6;
  } else if (mission[0].verificationMode === "evidence") {
    // Evidence: capped at 0.75
    finalConfidence = 0.75;
  } else if (mission[0].verificationMode === "hybrid") {
    // Hybrid: weighted average of available signals
    const hasDuration = input.durationSeconds && input.durationSeconds > 0;
    const hasReps = input.repetitionCount && input.repetitionCount > 0;
    if (hasDuration) {
      finalConfidence = calculateFocusConfidence({
        targetSeconds: mission[0].durationSeconds ?? 0,
        actualSeconds: input.durationSeconds ?? 0,
        presenceSamples: input.presenceSamples ?? 0,
        expectedSamples: 1,
        interruptions: 0,
      });
    } else if (hasReps) {
      finalConfidence = calculateRepetitionConfidence({
        targetReps: mission[0].targetRepetitions ?? 1,
        validReps: input.repetitionCount ?? 0,
        formScore: 0.8,
        averageRepQuality: 0.8,
      });
    }
  } else if (mission[0].verificationMode === "activity_signal") {
    // Activity signal: capped at 0.7
    finalConfidence = 0.7;
  } else if (mission[0].verificationMode === "review") {
    // Review: starts at 0.5, pending human review
    finalConfidence = 0.5;
  } else if (mission[0].verificationMode === "photo") {
    // Photo evidence: capped at 0.75
    finalConfidence = 0.75;
  }

  // 3b. Apply confidence decay for delayed completion
  if (mission[0].startedAt && mission[0].durationSeconds) {
    const elapsedMs = Date.now() - mission[0].startedAt.getTime();
    const expectedMs = mission[0].durationSeconds * 1000;
    if (elapsedMs > expectedMs * 2) {
      const overrun = elapsedMs - expectedMs;
      const decayPenalty = Math.max(0.5, 1 - (overrun / expectedMs) * 0.1);
      finalConfidence *= decayPenalty;
    }
  }

  // 4. Apply anti-cheat warning penalty
  if (antiCheat.severity === "warning") {
    finalConfidence *= 0.8; // 20% penalty for warnings
  }

  // 4b. Apply anomaly detection penalty
  if (anomaly.level === "suspicious" || anomaly.level === "requires_retry") {
    finalConfidence *= anomaly.confidence;
    logSecurity("anomaly_confidence_penalty", { missionId, level: anomaly.level, penalty: anomaly.confidence });
  }

  // 4c. Apply repeat multiplier (diminishing returns for identical tasks)
  if (antiCheat.repeatMultiplier && antiCheat.repeatMultiplier < 1) {
    finalConfidence *= antiCheat.repeatMultiplier;
    logSecurity("repeat_multiplier_applied", { missionId, multiplier: antiCheat.repeatMultiplier });
  }

  const confidenceClass = classifyConfidence(finalConfidence);
  // Server derives status from confidence — never trust client-submitted status
  let finalStatus: "passed" | "failed" | "uncertain" = confidenceClass === "low" ? "failed" : "passed";

  // 4b. Escalate to review for borderline medium-confidence camera verifications
  const cameraModes = ["focus", "pose", "timed", "repetition"];
  if (
    confidenceClass === "medium" &&
    finalStatus === "passed" &&
    cameraModes.includes(mission[0].verificationMode) &&
    finalConfidence < 0.55
  ) {
    finalStatus = "uncertain";
  }

  // 5. Store verification result
  const [result] = await db.insert(verificationResults).values({
    missionId,
    status: finalStatus,
    confidenceClass,
    confidenceScore: finalConfidence,
    durationSeconds: input.durationSeconds,
    repetitionCount: input.repetitionCount,
    presenceSamples: input.presenceSamples,
    reasonCode: input.reasonCode,
    metadata: input.metadata,
  }).returning();

  // 6. Update mission status with §111 state transition validation
  let missionNewStatus: MissionStatus;
  if (finalStatus === "uncertain") {
    missionNewStatus = "verifying"; // Will be escalated to review
  } else if (finalStatus === "passed") {
    missionNewStatus = "passed";
  } else {
    missionNewStatus = "failed";
  }

  // §111: Reject illegal state transitions server-side
  if (!isValidTransition(currentStatus, missionNewStatus)) {
    throw new AppError(
      "STATE_TRANSITION_INVALID",
      `Cannot transition mission from "${currentStatus}" to "${missionNewStatus}".`
    );
  }

  await db.update(missions)
    .set({
      status: missionNewStatus,
      completedAt: finalStatus !== "uncertain" ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(eq(missions.id, missionId));

  // 6b. If uncertain, escalate to review
  if (finalStatus === "uncertain") {
    const { escalateToReview } = await import("./review");
    await escalateToReview(missionId);
  }

  // 7. End session if exists
  await db.update(missionSessions)
    .set({ status: finalStatus === "passed" ? "completed" : "failed", endedAt: new Date() })
    .where(and(
      eq(missionSessions.missionId, missionId),
      eq(missionSessions.status, "active")
    ));

  logSecurity("mission_verified", {
    missionId,
    status: finalStatus,
    confidence: finalConfidence,
    reason: input.reasonCode,
  });

  return {
    resultId: result.id,
    status: finalStatus,
    confidenceClass,
    reasonCode: input.reasonCode,
  };
}

/**
 * Submit a verification event (presence, checkpoint, rep, etc.)
 */
export async function submitMissionEvent(
  missionId: string,
  userId: string,
  eventType: string,
  metadata?: Record<string, unknown>
): Promise<{ eventId: string }> {
  // Validate mission exists and belongs to user
  const mission = await db.select().from(missions).where(eq(missions.id, missionId)).limit(1);
  if (!mission[0]) throw new AppError("MISSION_NOT_FOUND", "Mission not found.");
  if (mission[0].userId !== userId) throw new AppError("FORBIDDEN", "Not your mission.");
  if (mission[0].status !== "active") {
    throw new AppError("MISSION_NOT_READY", "Mission is not active.");
  }

  // Get active session
  const session = await db.select().from(missionSessions)
    .where(and(eq(missionSessions.missionId, missionId), eq(missionSessions.status, "active")))
    .limit(1);

  // Validate event type
  const validEventTypes = [
    "SESSION_STARTED", "PRESENCE_CONFIRMED", "REP_CONFIRMED",
    "SESSION_CHECKPOINT", "SESSION_PAUSED", "SESSION_RESUMED", "SESSION_COMPLETED",
  ];
  if (!validEventTypes.includes(eventType)) {
    throw new AppError("VALIDATION_ERROR", `Invalid event type: ${eventType}`);
  }

  const [event] = await db.insert(missionEvents).values({
    missionId,
    sessionId: session[0]?.id,
    type: eventType,
    metadata,
  }).returning();

  return { eventId: event.id };
}
