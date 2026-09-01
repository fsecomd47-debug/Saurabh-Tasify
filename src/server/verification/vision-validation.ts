/**
 * PDR-4.2 §39-§47 + §54: Pure validation and confidence logic for
 * client-derived vision observations. No DB, no side effects — unit
 * testable. The server never trusts raw counts blindly; every signal
 * must land inside physically plausible bands before it can influence
 * verification confidence.
 */

export type ObservationTiming = {
  frameIndex: number;
  timestamp: number;
};

export type SequenceCheckResult =
  | { ok: true }
  | { ok: false; reasonCode: "TIMESTAMP_REGRESSION" | "FRAME_INDEX_REGRESSION" };

/**
 * §54: Derived events must be temporally coherent. Rejects impossible
 * orderings rather than trusting client array order.
 */
export function validateObservationSequence(
  observations: ObservationTiming[]
): SequenceCheckResult {
  for (let i = 1; i < observations.length; i++) {
    const prev = observations[i - 1];
    const curr = observations[i];
    // Small clock jitter tolerated; real regressions are not.
    if (curr.timestamp < prev.timestamp - 1000) {
      return { ok: false, reasonCode: "TIMESTAMP_REGRESSION" };
    }
    if (curr.frameIndex <= prev.frameIndex) {
      return { ok: false, reasonCode: "FRAME_INDEX_REGRESSION" };
    }
  }
  return { ok: true };
}

/* ─────────────────── Object counting ─────────────────── */

export type ObjectCountSignal = {
  objectCount: number;
  expectedCount?: number;
};

export type ObjectCountCheck = {
  plausible: boolean;
  ratio: number;
  reasonCode?: "OBJECT_COUNT_IMPLAUSIBLE";
};

/**
 * §40: Counting comes from measurable detections. A count is plausible
 * when non-negative, below sensor-realistic ceilings, and (when the
 * mission declares a target) not absurdly far from it.
 */
export function validateObjectCountSignal(signal: ObjectCountSignal): ObjectCountCheck {
  const { objectCount, expectedCount } = signal;

  if (!Number.isFinite(objectCount) || objectCount < 0 || objectCount > 200) {
    return { plausible: false, ratio: 0, reasonCode: "OBJECT_COUNT_IMPLAUSIBLE" };
  }

  if (expectedCount == null || expectedCount <= 0) {
    return { plausible: objectCount > 0, ratio: 1 };
  }

  // Occlusion tolerance: accept ≥80% of target as detectable success,
  // but anything above 3x target suggests detection noise, not reality.
  const ratio = objectCount / expectedCount;
  if (ratio > 3) {
    return { plausible: false, ratio, reasonCode: "OBJECT_COUNT_IMPLAUSIBLE" };
  }
  return { plausible: true, ratio };
}

export function objectCountConfidence(check: ObjectCountCheck, qualityScore: number): number {
  if (!check.plausible) return 0;
  if (check.ratio >= 1) return 0.85 + Math.min(qualityScore, 1) * 0.1;
  // Partial counts degrade smoothly — honest uncertainty, not failure.
  return Math.min(0.72, 0.45 + check.ratio * 0.35);
}

/* ─────────────────── Scene comparison ─────────────────── */

export type SceneChangeSignal = {
  changeScore: number;
  regionChangeScore: number;
};

export type SceneChangeCheck = {
  plausible: boolean;
  meaningful: boolean;
  reasonCode?: "SCENE_SIGNAL_IMPLAUSIBLE";
};

/**
 * §41-43: A cleaned scene shows moderate, region-focused change.
 * Zero change means nothing happened; near-total change usually means
 * the camera moved. Both fail to support completion.
 */
export function validateSceneChangeSignal(signal: SceneChangeSignal): SceneChangeCheck {
  const { changeScore, regionChangeScore } = signal;

  const inBand = (v: number) => Number.isFinite(v) && v >= 0 && v <= 1;
  if (!inBand(changeScore) || !inBand(regionChangeScore)) {
    return { plausible: false, meaningful: false, reasonCode: "SCENE_SIGNAL_IMPLAUSIBLE" };
  }

  const plausible = changeScore <= 0.95;
  const meaningful = changeScore >= 0.03 || regionChangeScore >= 0.06;
  return { plausible, meaningful };
}

export function sceneChangeConfidence(
  check: SceneChangeCheck,
  signal: SceneChangeSignal,
  qualityScore: number
): number {
  if (!check.plausible) return 0;
  if (!check.meaningful) return Math.min(0.4, signal.changeScore * 4);

  // Region-focused change scores higher than diffuse whole-frame change:
  // cleaning a desk changes the desk area, not the entire room.
  const focused = signal.regionChangeScore >= signal.changeScore * 0.5;
  const base = 0.55 + Math.min(signal.changeScore, 0.5) * 0.7 + (focused ? 0.1 : 0);
  return Math.min(0.88, base) * (0.7 + Math.min(qualityScore, 1) * 0.3);
}

/* ─────────────────── Document / OCR ─────────────────── */

export type DocumentSignal = {
  textLength: number;
  fieldCount: number;
};

export function documentSignalPlausible(signal: DocumentSignal): boolean {
  return (
    Number.isFinite(signal.textLength) &&
    signal.textLength >= 0 &&
    signal.textLength <= 100_000 &&
    Number.isFinite(signal.fieldCount) &&
    signal.fieldCount >= 0 &&
    signal.fieldCount <= 50
  );
}

export function documentConfidence(signal: DocumentSignal, qualityScore: number): number {
  if (!documentSignalPlausible(signal)) return 0;
  const lengthScore = Math.min(1, signal.textLength / 200);
  const fieldScore = Math.min(1, signal.fieldCount / 3);
  const base = 0.40 + lengthScore * 0.30 + fieldScore * 0.20;
  return Math.min(0.95, base * (0.75 + Math.min(qualityScore, 1) * 0.25));
}

/* ─────────────────── Unified entry ─────────────────── */

export type VisionSummaryInput = {
  averageConfidence: number;
  qualityScore: number;
  formScore?: number;
  repCount?: number;
  objectCount?: number;
  changeScore?: number;
  regionChangeScore?: number;
  textLength?: number;
  fieldCount?: number;
};

export type VisionVerdict = {
  supported: boolean;
  uncertain: boolean;
  confidence: number;
  reasonCode: string;
};

/**
 * Convert a client vision summary into a server-derived verdict.
 * Local-first processing produced these numbers; the server decides
 * whether they support completion (§53).
 */
export function deriveVisionVerdict(
  mode: string,
  summary: VisionSummaryInput,
  expectedObjectCount?: number
): VisionVerdict {
  const quality = summary.qualityScore ?? 0;

  if (quality < 0.3) {
    return {
      supported: false,
      uncertain: false,
      confidence: 0,
      reasonCode: "LOW_QUALITY",
    };
  }

  let confidence: number;
  let reasonCode: string;

  if (summary.repCount != null && summary.repCount > 0) {
    confidence = Math.min(summary.averageConfidence, 0.95);
    reasonCode = "REPETITION_VERIFIED";
  } else if (summary.objectCount != null) {
    const check = validateObjectCountSignal({
      objectCount: summary.objectCount,
      expectedCount: expectedObjectCount,
    });
    if (!check.plausible) {
      return {
        supported: false,
        uncertain: false,
        confidence: 0,
        reasonCode: check.reasonCode ?? "OBJECT_COUNT_IMPLAUSIBLE",
      };
    }
    confidence = objectCountConfidence(check, quality);
    reasonCode = check.ratio >= 1 ? "OBJECT_COUNT_VERIFIED" : "OBJECT_COUNT_PARTIAL";
  } else if (summary.changeScore != null && summary.regionChangeScore != null) {
    const signal: SceneChangeSignal = {
      changeScore: summary.changeScore,
      regionChangeScore: summary.regionChangeScore,
    };
    const check = validateSceneChangeSignal(signal);
    if (!check.plausible) {
      return {
        supported: false,
        uncertain: false,
        confidence: 0,
        reasonCode: check.reasonCode ?? "SCENE_SIGNAL_IMPLAUSIBLE",
      };
    }
    confidence = sceneChangeConfidence(check, signal, quality);
    reasonCode = check.meaningful ? "SCENE_CHANGE_VERIFIED" : "SCENE_UNCHANGED";
  } else if (summary.textLength != null) {
    confidence = documentConfidence(
      { textLength: summary.textLength, fieldCount: summary.fieldCount ?? 0 },
      quality
    );
    reasonCode = "DOCUMENT_ANALYZED";
  } else {
    confidence = summary.averageConfidence;
    reasonCode = "VISION_VERIFIED";
  }

  const supported = confidence >= 0.7;
  const uncertain = !supported && confidence >= 0.42;

  return {
    supported,
    uncertain,
    confidence: Math.round(confidence * 1000) / 1000,
    reasonCode,
  };
}
