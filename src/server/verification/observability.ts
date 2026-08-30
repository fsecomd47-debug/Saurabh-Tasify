/**
 * PDR-4.1 §62: Observability
 * Structured event logging for mission verification pipeline.
 * Do not log sensitive camera content.
 */

export type ObservabilityEvent =
  | "TASK_ANALYZED"
  | "TASK_NORMALIZED"
  | "MISSION_CREATED"
  | "MISSION_STARTED"
  | "VERIFICATION_STARTED"
  | "CAMERA_REQUESTED"
  | "CAMERA_GRANTED"
  | "CAMERA_DENIED"
  | "CAMERA_STARTED"
  | "VISION_STARTED"
  | "POSE_DETECTED"
  | "REP_COUNTED"
  | "VERIFICATION_PASSED"
  | "VERIFICATION_FAILED"
  | "VERIFICATION_UNCERTAIN"
  | "VERIFICATION_REVIEW"
  | "EVIDENCE_SUBMITTED"
  | "PHOTO_CAPTURED"
  | "PHOTO_QUALITY_CHECK"
  | "REWARD_SETTLED"
  | "MISSION_COMPLETED"
  | "MISSION_FAILED"
  | "MISSION_EXPIRED"
  | "PROVIDER_INITIALIZED"
  | "PROVIDER_STARTED"
  | "PROVIDER_STOPPED"
  | "PROVIDER_FINALIZED"
  | "COMPOUND_STEP_CREATED"
  | "COMPOUND_STEP_COMPLETED"
  | "CHAIN_STARTED"
  | "CHAIN_STEP_COMPLETED"
  | "CHECKPOINT_RECORDED"
  | "VERIFICATION_FEEDBACK_RECORDED";

type EventPayload = {
  event: ObservabilityEvent;
  timestamp: number;
  missionId?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
};

const eventLog: EventPayload[] = [];
const MAX_LOG_SIZE = 1000;

/**
 * Log an observability event.
 * §62: Do not log sensitive camera content.
 */
export function logEvent(
  event: ObservabilityEvent,
  metadata?: Record<string, unknown>,
  context?: { missionId?: string; userId?: string; sessionId?: string }
): void {
  const payload: EventPayload = {
    event,
    timestamp: Date.now(),
    ...context,
    metadata: metadata ? sanitizeMetadata(metadata) : undefined,
  };

  eventLog.push(payload);

  // Trim log if too large
  if (eventLog.length > MAX_LOG_SIZE) {
    eventLog.splice(0, eventLog.length - MAX_LOG_SIZE);
  }

  // Console output in development
  if (process.env.NODE_ENV === "development") {
    console.log(`[OBS] ${event}`, payload);
  }
}

/**
 * Sanitize metadata to remove sensitive content.
 * §62: Do not log sensitive camera content.
 */
function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    // Skip camera/video/image data
    if (key.includes("camera") || key.includes("video") || key.includes("image") || key.includes("frame")) {
      sanitized[key] = "[REDACTED]";
      continue;
    }

    // Skip PII
    if (key.includes("email") || key.includes("phone") || key.includes("address")) {
      sanitized[key] = "[REDACTED]";
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
}

/**
 * Get recent events (for debugging).
 */
export function getRecentEvents(count: number = 50): EventPayload[] {
  return eventLog.slice(-count);
}

/**
 * Get events for a specific mission.
 */
export function getMissionEvents(missionId: string): EventPayload[] {
  return eventLog.filter((e) => e.missionId === missionId);
}

/**
 * Clear event log (for testing).
 */
export function clearEventLog(): void {
  eventLog.length = 0;
}
