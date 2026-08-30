/**
 * PDR-4 §49: Enhanced Confidence Fusion
 * Multi-signal weighted aggregation for combining different verification signals
 * into a single confidence score.
 */

/**
 * §49: Signal weight configuration per verification mode.
 */
const SIGNAL_WEIGHTS: Record<string, Record<string, number>> = {
  pose: {
    repCount: 0.4,
    formScore: 0.25,
    durationMatch: 0.15,
    cameraQuality: 0.1,
    eventConsistency: 0.1,
  },
  focus: {
    durationMatch: 0.35,
    presenceRatio: 0.35,
    interruptionPenalty: 0.15,
    checkpointCompletion: 0.15,
  },
  photo: {
    qualityScore: 0.3,
    subjectPresence: 0.3,
    resolution: 0.2,
    sceneMatch: 0.2,
  },
  evidence: {
    fieldExtraction: 0.4,
    documentQuality: 0.3,
    temporalConsistency: 0.15,
    sourceCredibility: 0.15,
  },
  hybrid: {
    primarySignal: 0.5,
    secondarySignal: 0.3,
    consistencyBonus: 0.2,
  },
  self_reported: {
    selfReport: 1.0, // Single signal
  },
  activity_signal: {
    deviceData: 0.6,
    temporalConsistency: 0.4,
  },
};

export type ConfidenceSignal = {
  name: string;
  value: number; // 0-1
  weight: number;
  source: string;
  metadata?: Record<string, unknown>;
};

export type FusedConfidence = {
  score: number;
  level: "high" | "medium" | "low";
  signals: ConfidenceSignal[];
  weightedAverage: number;
  bonusApplied: number;
  penaltyApplied: number;
  breakdown: Record<string, number>;
};

/**
 * §49: Fuse multiple confidence signals into a single score.
 * Uses weighted average with bonus/penalty adjustments.
 */
export function fuseConfidence(
  signals: ConfidenceSignal[],
  verificationMode: string
): FusedConfidence {
  const weights = SIGNAL_WEIGHTS[verificationMode] ?? {};

  // Normalize weights to sum to 1
  let totalWeight = 0;
  const normalizedSignals = signals.map((s) => {
    const targetWeight = weights[s.name] ?? s.weight;
    totalWeight += targetWeight;
    return { ...s, normalizedWeight: targetWeight };
  });

  if (totalWeight === 0) {
    return {
      score: 0,
      level: "low",
      signals,
      weightedAverage: 0,
      bonusApplied: 0,
      penaltyApplied: 0,
      breakdown: {},
    };
  }

  // Compute weighted average
  let weightedSum = 0;
  const breakdown: Record<string, number> = {};

  for (const signal of normalizedSignals) {
    const normalizedWeight = signal.normalizedWeight / totalWeight;
    const contribution = signal.value * normalizedWeight;
    weightedSum += contribution;
    breakdown[signal.name] = Math.round(contribution * 1000) / 1000;
  }

  let finalScore = weightedSum;

  // §49: Consistency bonus — if all signals agree (all above 0.6 or all below 0.4)
  const allHigh = normalizedSignals.every((s) => s.value >= 0.6);
  const allLow = normalizedSignals.every((s) => s.value <= 0.4);
  let bonusApplied = 0;
  let penaltyApplied = 0;

  if (allHigh && normalizedSignals.length >= 2) {
    bonusApplied = 0.05;
    finalScore = Math.min(1, finalScore + bonusApplied);
  }

  // §49: Conflict penalty — if signals strongly disagree
  const maxSignal = Math.max(...normalizedSignals.map((s) => s.value));
  const minSignal = Math.min(...normalizedSignals.map((s) => s.value));
  if (maxSignal - minSignal > 0.5 && normalizedSignals.length >= 2) {
    penaltyApplied = -0.1;
    finalScore = Math.max(0, finalScore + penaltyApplied);
  }

  // Clamp to [0, 1]
  finalScore = Math.round(Math.max(0, Math.min(1, finalScore)) * 1000) / 1000;

  const level = finalScore >= 0.75 ? "high" : finalScore >= 0.5 ? "medium" : "low";

  return {
    score: finalScore,
    level,
    signals,
    weightedAverage: Math.round(weightedSum * 1000) / 1000,
    bonusApplied,
    penaltyApplied,
    breakdown,
  };
}

/**
 * §49: Create a confidence signal from raw metrics.
 */
export function createSignal(
  name: string,
  rawValue: number,
  min: number,
  max: number,
  source: string,
  metadata?: Record<string, unknown>
): ConfidenceSignal {
  // Normalize to 0-1
  const normalized = Math.max(0, Math.min(1, (rawValue - min) / (max - min)));
  return { name, value: normalized, weight: 1, source, metadata };
}

/**
 * §49: Combine pose-specific signals.
 */
export function fusePoseConfidence(signals: {
  repCount: number;
  targetReps: number;
  formScore: number;
  durationSeconds: number;
  expectedDuration: number;
  qualityScore: number;
  eventConsistency: number;
}): FusedConfidence {
  return fuseConfidence([
    createSignal("repCount", signals.repCount, 0, signals.targetReps, "pose_engine"),
    createSignal("formScore", signals.formScore, 0, 1, "form_analyzer"),
    createSignal("durationMatch", signals.durationSeconds, 0, signals.expectedDuration * 1.5, "timer"),
    createSignal("cameraQuality", signals.qualityScore, 0, 1, "quality_provider"),
    createSignal("eventConsistency", signals.eventConsistency, 0, 1, "event_analyzer"),
  ], "pose");
}

/**
 * §49: Combine focus-specific signals.
 */
export function fuseFocusConfidence(signals: {
  actualSeconds: number;
  targetSeconds: number;
  presenceSamples: number;
  expectedSamples: number;
  interruptions: number;
  checkpointsCompleted: number;
  totalCheckpoints: number;
}): FusedConfidence {
  return fuseConfidence([
    createSignal("durationMatch", signals.actualSeconds, 0, signals.targetSeconds * 1.2, "timer"),
    createSignal("presenceRatio", signals.presenceSamples, 0, Math.max(1, signals.expectedSamples), "presence_tracker"),
    createSignal("interruptionPenalty", signals.interruptions, 10, 0, "visibility_api"), // Inverted: fewer = better
    createSignal("checkpointCompletion", signals.checkpointsCompleted, 0, Math.max(1, signals.totalCheckpoints), "checkpoint_system"),
  ], "focus");
}

/**
 * §49: Combine photo-specific signals.
 */
export function fusePhotoConfidence(signals: {
  qualityScore: number;
  subjectPresent: boolean;
  resolution: { width: number; height: number };
  sceneSimilarity?: number;
}): FusedConfidence {
  return fuseConfidence([
    createSignal("qualityScore", signals.qualityScore, 0, 1, "quality_provider"),
    createSignal("subjectPresence", signals.subjectPresent ? 1 : 0, 0, 1, "subject_detector"),
    createSignal("resolution", Math.min(signals.resolution.width, signals.resolution.height), 0, 1080, "image_info"),
    createSignal("sceneMatch", signals.sceneSimilarity ?? 0.5, 0, 1, "scene_analyzer"),
  ], "photo");
}
