/**
 * PDR-4 §110-111: Mission State Transition Validation
 * Enforces legal state transitions server-side.
 * Prevents impossible states like mission=completed + verification=active.
 */

import type { MissionStatus } from "@/types";

/**
 * §111: Legal state transitions for missions.
 * Each key is the current status, and the value is an array of allowed next statuses.
 */
const LEGAL_TRANSITIONS: Record<MissionStatus, MissionStatus[]> = {
  draft: ["ready", "cancelled"],
  analyzing: ["ready", "failed", "cancelled"],
  ready: ["active", "cancelled", "expired"],
  active: ["verifying", "passed", "failed", "cancelled"],
  verifying: ["passed", "failed", "review"],
  passed: ["settled"],
  failed: ["ready", "cancelled"], // Allow retry from failed
  settled: [], // Terminal state
  cancelled: [], // Terminal state
  expired: [], // Terminal state
  review: ["passed", "failed", "verifying"],
  starting: ["active", "cancelled"],
};

/**
 * §110: Validate whether a state transition is legal.
 */
export function isValidTransition(from: MissionStatus, to: MissionStatus): boolean {
  const allowed = LEGAL_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

/**
 * §110: Get the reason a transition is invalid (for error messages).
 */
export function getInvalidTransitionReason(from: MissionStatus, to: MissionStatus): string {
  if (!LEGAL_TRANSITIONS[from]) {
    return `Mission is in unknown state: ${from}`;
  }
  if (!isValidTransition(from, to)) {
    return `Cannot transition from "${from}" to "${to}". Allowed: ${LEGAL_TRANSITIONS[from].join(", ")}`;
  }
  return "";
}

/**
 * §110: Check if a status is terminal (no further transitions possible).
 */
export function isTerminalStatus(status: MissionStatus): boolean {
  return LEGAL_TRANSITIONS[status]?.length === 0;
}

/**
 * §110: Check if a status allows user interaction.
 */
export function isInteractiveStatus(status: MissionStatus): boolean {
  return ["active", "verifying"].includes(status);
}

/**
 * §110: Get all legal next states from a given state.
 */
export function getLegalNextStates(from: MissionStatus): MissionStatus[] {
  return LEGAL_TRANSITIONS[from] ?? [];
}

/**
 * §110: Validate a sequence of transitions (for replay/recovery).
 */
export function validateTransitionSequence(sequence: MissionStatus[]): {
  valid: boolean;
  invalidAt?: number;
  reason?: string;
} {
  for (let i = 1; i < sequence.length; i++) {
    if (!isValidTransition(sequence[i - 1], sequence[i])) {
      return {
        valid: false,
        invalidAt: i,
        reason: getInvalidTransitionReason(sequence[i - 1], sequence[i]),
      };
    }
  }
  return { valid: true };
}
