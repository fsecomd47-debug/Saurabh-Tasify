/**
 * PDR-4.2 §58-61: Evidence Replay Defense
 * Content hashing, temporal continuity, cross-user protection.
 * Every evidence submission gets evidenceId, missionId, userId, contentHash.
 */

import { createHash } from "crypto";
import type { DerivedVisionEvent, VisionEvent } from "./types";

type EvidenceRecord = {
  evidenceId: string;
  missionId: string;
  userId: string;
  contentHash: string;
  createdAt: number;
  consumed: boolean;
};

type ReplayCheckResult = {
  valid: boolean;
  reason?: string;
};

// In-memory store for evidence records (production would use DB)
const evidenceStore = new Map<string, EvidenceRecord>();

/**
 * §58: Generate content hash for evidence.
 * Helps detect duplicate evidence and replayed submissions.
 */
export function generateContentHash(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * §58: Register evidence for replay protection.
 */
export function registerEvidence(
  evidenceId: string,
  missionId: string,
  userId: string,
  contentHash: string
): void {
  evidenceStore.set(evidenceId, {
    evidenceId,
    missionId,
    userId,
    contentHash,
    createdAt: Date.now(),
    consumed: false,
  });
}

/**
 * §58: Check if evidence is valid (not replayed, belongs to user/mission).
 */
export function checkEvidence(evidenceId: string, userId: string, missionId: string): ReplayCheckResult {
  const record = evidenceStore.get(evidenceId);

  if (!record) {
    return { valid: false, reason: "EVIDENCE_NOT_FOUND" };
  }

  // §60: Cross-user protection
  if (record.userId !== userId) {
    return { valid: false, reason: "EVIDENCE_WRONG_USER" };
  }

  // §58: Mission binding
  if (record.missionId !== missionId) {
    return { valid: false, reason: "EVIDENCE_WRONG_MISSION" };
  }

  // §58: Already consumed
  if (record.consumed) {
    return { valid: false, reason: "EVIDENCE_ALREADY_CONSUMED" };
  }

  return { valid: true };
}

/**
 * §58: Mark evidence as consumed.
 */
export function consumeEvidence(evidenceId: string): void {
  const record = evidenceStore.get(evidenceId);
  if (record) {
    record.consumed = true;
  }
}

/**
 * §59: Check for duplicate content hash.
 * Detects obvious reuse of the same image.
 */
export function checkDuplicateContent(contentHash: string, excludeEvidenceId?: string): boolean {
  for (const record of evidenceStore.values()) {
    if (record.contentHash === contentHash && record.evidenceId !== excludeEvidenceId) {
      return true;
    }
  }
  return false;
}

/**
 * §61: Validate event timestamps.
 * Reject impossible sequences and stale sessions.
 */
export function validateEventSequence(
  events: VisionEvent[],
  missionStartedAt: number,
  missionDurationMs: number
): { valid: boolean; reason?: string } {
  if (events.length === 0) {
    return { valid: true };
  }

  // Check chronological order
  for (let i = 1; i < events.length; i++) {
    if (events[i].timestamp < events[i - 1].timestamp) {
      return { valid: false, reason: "EVENTS_NOT_CHRONOLOGICAL" };
    }

    // §98: Check sequence numbers
    if (events[i].sequence <= events[i - 1].sequence) {
      return { valid: false, reason: "INVALID_SEQUENCE" };
    }
  }

  // §61: Check timestamps are within mission window
  const missionEnd = missionStartedAt + missionDurationMs;
  for (const event of events) {
    if (event.timestamp < missionStartedAt - 5000) { // 5s tolerance
      return { valid: false, reason: "EVENT_BEFORE_MISSION" };
    }
    if (event.timestamp > missionEnd + 10000) { // 10s tolerance
      return { valid: false, reason: "EVENT_AFTER_MISSION" };
    }
  }

  // §98: Check session ID consistency
  const sessionId = events[0].sessionId;
  for (const event of events) {
    if (event.sessionId !== sessionId) {
      return { valid: false, reason: "SESSION_MISMATCH" };
    }
  }

  return { valid: true };
}

/**
 * §95: Frame Continuity Check
 * Verify events form a believable temporal trajectory.
 * A single repeated frame should not satisfy 30 seconds of activity.
 */
export function checkTemporalContinuity(
  events: DerivedVisionEvent[],
  minDurationMs: number,
  maxGapMs: number = 5000
): { continuous: boolean; reason?: string } {
  if (events.length === 0) {
    return { continuous: false, reason: "NO_EVENTS" };
  }

  // Check total duration
  const firstEvent = events[0];
  const lastEvent = events[events.length - 1];
  const totalDuration = lastEvent.timestamp - firstEvent.timestamp;

  if (totalDuration < minDurationMs) {
    return { continuous: false, reason: "INSUFFICIENT_DURATION" };
  }

  // Check for gaps
  for (let i = 1; i < events.length; i++) {
    const gap = events[i].timestamp - events[i - 1].timestamp;
    if (gap > maxGapMs) {
      return { continuous: false, reason: "TEMPORAL_GAP" };
    }
  }

  return { continuous: true };
}

/**
 * Clean up old evidence records (call periodically).
 */
export function cleanupEvidence(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
  const now = Date.now();
  for (const [key, record] of evidenceStore.entries()) {
    if (now - record.createdAt > maxAgeMs) {
      evidenceStore.delete(key);
    }
  }
}
