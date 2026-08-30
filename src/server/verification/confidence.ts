import type { ConfidenceClass } from "@/types";

/**
 * Convert a raw confidence score (0-1) to a classified confidence level.
 * Never expose raw decimals to users (PDR-3 §31).
 */
export function classifyConfidence(score: number): ConfidenceClass {
  if (score >= 0.75) return "high";
  if (score >= 0.45) return "medium";
  return "low";
}

/**
 * Calculate confidence for a focus/timer verification session.
 */
export function calculateFocusConfidence(params: {
  targetSeconds: number;
  actualSeconds: number;
  presenceSamples: number;
  expectedSamples: number;
  interruptions: number;
}): number {
  const { targetSeconds, actualSeconds, presenceSamples, expectedSamples, interruptions } = params;

  // Duration coverage (40%)
  const durationPct = Math.min(1, actualSeconds / targetSeconds);

  // Presence ratio (40%)
  const presencePct = expectedSamples > 0 ? Math.min(1, presenceSamples / expectedSamples) : 0.5;

  // Interruption penalty (20%)
  const interruptionPenalty = Math.max(0, 1 - interruptions * 0.1);

  return Math.min(1, durationPct * 0.4 + presencePct * 0.4 + interruptionPenalty * 0.2);
}

/**
 * Calculate confidence for a pose/repetition verification.
 */
export function calculateRepetitionConfidence(params: {
  targetReps: number;
  validReps: number;
  formScore: number; // 0-1
  averageRepQuality: number; // 0-1
}): number {
  const { targetReps, validReps, formScore, averageRepQuality } = params;

  // Rep completion ratio (50%)
  const repPct = Math.min(1, validReps / targetReps);

  // Form quality (25%)
  const formPct = formScore;

  // Average rep quality (25%)
  const qualityPct = averageRepQuality;

  return Math.min(1, repPct * 0.5 + formPct * 0.25 + qualityPct * 0.25);
}
