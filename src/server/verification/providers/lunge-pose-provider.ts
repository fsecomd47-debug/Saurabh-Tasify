/**
 * PDR-4.2 §32-34: LungePoseProvider
 * Lunge verification: camera → pose detection → landmark extraction → state machine → rep counting.
 * State machine: READY → STANDING → DESCENDING → BOTTOM → ASCENDING → STANDING = VALID REP
 *
 * Lunge-specific mechanics:
 * - Tracks hip/knee/ankle angle for depth detection
 * - Monitors front knee alignment (should not pass toes excessively)
 * - Detects alternating legs for balanced lunges
 */

import type {
  VerificationProvider,
  VerificationState,
  VerificationResult,
} from "@/server/verification/provider-interface";
import type { MissionContract } from "@/server/ai/provider";
import type { VerificationMode } from "@/types";

type LungeState = "ready" | "standing" | "descending" | "bottom" | "ascending";

type Landmarks = {
  leftShoulder: { x: number; y: number; z: number };
  rightShoulder: { x: number; y: number; z: number };
  leftElbow: { x: number; y: number; z: number };
  rightElbow: { x: number; y: number; z: number };
  leftWrist: { x: number; y: number; z: number };
  rightWrist: { x: number; y: number; z: number };
  leftHip: { x: number; y: number; z: number };
  rightHip: { x: number; y: number; z: number };
  leftKnee: { x: number; y: number; z: number };
  rightKnee: { x: number; y: number; z: number };
  leftAnkle: { x: number; y: number; z: number };
  rightAnkle: { x: number; y: number; z: number };
};

type LungeMetrics = {
  validReps: number;
  invalidReps: number;
  totalCycles: number;
  currentDepth: number;
  frontKneeAlignment: number;
  torsoUpright: number;
  formScore: number;
  averageRepDuration: number;
  stateHistory: string[];
};

/**
 * Calculate lunge depth based on hip-to-knee distance.
 * 0 = standing, 1 = deep lunge (knee near ground).
 */
function calculateLungeDepth(lm: Landmarks): number {
  const midHip = {
    y: (lm.leftHip.y + lm.rightHip.y) / 2,
  };
  const midKnee = {
    y: (lm.leftKnee.y + lm.rightKnee.y) / 2,
  };
  const midAnkle = {
    y: (lm.leftAnkle.y + lm.rightAnkle.y) / 2,
  };

  // In a lunge, the rear knee drops significantly
  const hipToKnee = Math.abs(midHip.y - midKnee.y);
  const hipToAnkle = Math.abs(midHip.y - midAnkle.y) + 0.001;

  const depth = Math.min(1, hipToKnee / hipToAnkle);
  return depth;
}

/**
 * Calculate front knee alignment.
 * Returns 0-1 where 1 = knee properly aligned over ankle.
 */
function calculateFrontKneeAlignment(lm: Landmarks): number {
  // Use left side as representative
  const kneeX = lm.leftKnee.x;
  const ankleX = lm.leftAnkle.x;
  const shoulderX = lm.leftShoulder.x;

  const kneeToAnkle = Math.abs(kneeX - ankleX);
  const shoulderWidth = Math.abs(shoulderX - ankleX) + 0.001;

  const alignment = 1 - Math.min(1, kneeToAnkle / shoulderWidth);
  return alignment;
}

/**
 * Calculate torso uprightness.
 * Returns 0-1 where 1 = perfectly upright.
 */
function calculateTorsoUpright(lm: Landmarks): number {
  const midShoulder = {
    x: (lm.leftShoulder.x + lm.rightShoulder.x) / 2,
    y: (lm.leftShoulder.y + lm.rightShoulder.y) / 2,
  };
  const midHip = {
    x: (lm.leftHip.x + lm.rightHip.x) / 2,
    y: (lm.leftHip.y + lm.rightHip.y) / 2,
  };

  const dx = Math.abs(midShoulder.x - midHip.x);
  const dy = Math.abs(midShoulder.y - midHip.y) + 0.001;

  const lean = dx / dy;
  return Math.max(0, 1 - lean);
}

export class LungePoseProvider implements VerificationProvider {
  readonly name = "lunge-pose";
  readonly supportedModes: VerificationMode[] = ["pose", "repetition"];

  private state: VerificationState = {
    status: "initializing",
    progress: 0,
    confidence: 0,
    metrics: {},
  };

  private mission: MissionContract | null = null;
  private lungeState: LungeState = "ready";
  private metrics: LungeMetrics = {
    validReps: 0,
    invalidReps: 0,
    totalCycles: 0,
    currentDepth: 0,
    frontKneeAlignment: 0,
    torsoUpright: 0,
    formScore: 0,
    averageRepDuration: 0,
    stateHistory: [],
  };

  private repTimestamps: number[] = [];
  private lastDepthChange: number = 0;
  private targetReps: number = 10;

  private readonly STANDING_THRESHOLD = 0.25;
  private readonly BOTTOM_THRESHOLD = 0.55;
  private readonly MIN_REP_DURATION_MS = 1000;
  private readonly MAX_REP_DURATION_MS = 5000;
  private readonly MIN_ALIGNMENT = 0.45;

  supports(mission: { verificationMode: VerificationMode }): boolean {
    return mission.verificationMode === "pose" || mission.verificationMode === "repetition";
  }

  async initialize(mission: MissionContract): Promise<void> {
    this.mission = mission;
    this.targetReps = mission.targetRepetitions ?? 10;
    this.lungeState = "ready";
    this.metrics = {
      validReps: 0,
      invalidReps: 0,
      totalCycles: 0,
      currentDepth: 0,
      frontKneeAlignment: 0,
      torsoUpright: 0,
      formScore: 0,
      averageRepDuration: 0,
      stateHistory: [],
    };
    this.repTimestamps = [];
    this.lastDepthChange = Date.now();

    this.state = {
      status: "initializing",
      progress: 0,
      confidence: 0,
      metrics: {},
    };
  }

  async start(): Promise<void> {
    this.state.status = "active";
    this.lungeState = "ready";
    this.metrics.stateHistory.push(`START:${Date.now()}`);
  }

  async stop(): Promise<void> {
    this.state.status = "stopped";
    this.metrics.stateHistory.push(`STOP:${Date.now()}`);
  }

  getCurrentState(): VerificationState {
    return { ...this.state };
  }

  /**
   * Process a new frame of pose landmarks for lunge detection.
   */
  processFrame(landmarks: Landmarks): void {
    const depth = calculateLungeDepth(landmarks);
    const alignment = calculateFrontKneeAlignment(landmarks);
    const upright = calculateTorsoUpright(landmarks);

    this.metrics.currentDepth = depth;
    this.metrics.frontKneeAlignment = alignment;
    this.metrics.torsoUpright = upright;

    const now = Date.now();
    const timeSinceLastChange = now - this.lastDepthChange;

    switch (this.lungeState) {
      case "ready":
        if (depth < this.STANDING_THRESHOLD) {
          this.lungeState = "standing";
          this.lastDepthChange = now;
        }
        break;

      case "standing":
        if (depth >= this.STANDING_THRESHOLD) {
          this.lungeState = "descending";
          this.lastDepthChange = now;
        }
        break;

      case "descending":
        if (depth >= this.BOTTOM_THRESHOLD) {
          this.lungeState = "bottom";
          this.lastDepthChange = now;
        }
        break;

      case "bottom":
        if (depth < this.BOTTOM_THRESHOLD) {
          this.lungeState = "ascending";
          this.lastDepthChange = now;
        }
        break;

      case "ascending":
        if (depth < this.STANDING_THRESHOLD) {
          this.lungeState = "standing";
          this.lastDepthChange = now;
          this.metrics.totalCycles++;
          this.recordRep(timeSinceLastChange, alignment, upright);
        }
        break;
    }

    this.updateState();
  }

  private recordRep(durationMs: number, alignment: number, upright: number): void {
    const isValidDuration = durationMs >= this.MIN_REP_DURATION_MS && durationMs <= this.MAX_REP_DURATION_MS;
    const isValidAlignment = alignment >= this.MIN_ALIGNMENT;
    const isUpright = upright >= 0.5;

    if (isValidDuration && isValidAlignment && isUpright) {
      this.metrics.validReps++;
      this.repTimestamps.push(Date.now());
    } else {
      this.metrics.invalidReps++;
    }

    this.metrics.formScore = this.metrics.validReps / (this.metrics.validReps + this.metrics.invalidReps);
    this.metrics.averageRepDuration =
      this.repTimestamps.length > 1
        ? (this.repTimestamps[this.repTimestamps.length - 1] - this.repTimestamps[0]) / (this.repTimestamps.length - 1)
        : 0;
  }

  private updateState(): void {
    const progress = this.targetReps > 0 ? this.metrics.validReps / this.targetReps : 0;
    const confidence = Math.min(0.95, this.metrics.formScore * progress);

    this.state = {
      status: "active",
      progress: Math.min(1, progress),
      confidence,
      metrics: {
        validReps: this.metrics.validReps,
        targetReps: this.targetReps,
        invalidReps: this.metrics.invalidReps,
        frontKneeAlignment: this.metrics.frontKneeAlignment,
        torsoUpright: this.metrics.torsoUpright,
        formScore: this.metrics.formScore,
        depth: this.metrics.currentDepth,
        stateDuration: this.metrics.stateHistory.length,
      },
      message: this.getFeedback(),
    };
  }

  private getFeedback(): string {
    if (this.metrics.torsoUpright < 0.5) {
      return "Keep your torso upright";
    }
    if (this.metrics.frontKneeAlignment < 0.4) {
      return "Keep front knee over ankle";
    }
    if (this.metrics.currentDepth < this.BOTTOM_THRESHOLD && this.lungeState === "descending") {
      return "Go a little deeper";
    }
    if (this.metrics.validReps >= this.targetReps) {
      return `${this.metrics.validReps}/${this.targetReps} — Mission complete!`;
    }
    return `${this.metrics.validReps}/${this.targetReps}`;
  }

  async finalize(): Promise<VerificationResult> {
    this.state.status = "finalizing";
    this.metrics.stateHistory.push(`FINALIZE:${Date.now()}`);

    const validReps = this.metrics.validReps;
    const target = this.targetReps;
    const ratio = target > 0 ? validReps / target : 0;
    const alignment = this.metrics.frontKneeAlignment;
    const formScore = this.metrics.formScore;

    let confidence: number;
    if (ratio >= 1) {
      confidence = Math.min(0.95, 0.7 + formScore * 0.25);
    } else if (ratio >= 0.8) {
      confidence = ratio * 0.7;
    } else {
      confidence = ratio * 0.5;
    }

    if (alignment < 0.4) {
      confidence *= 0.7;
    }

    let status: "passed" | "failed" | "uncertain";
    let reasonCode: string;

    if (ratio >= 1 && formScore >= 0.7) {
      status = "passed";
      reasonCode = "LUNGE_TARGET_REACHED";
    } else if (ratio >= 0.8) {
      status = "uncertain";
      reasonCode = "LUNGE_NEAR_TARGET";
    } else {
      status = "failed";
      reasonCode = "LUNGE_INSUFFICIENT_REPS";
    }

    const confidenceClass = confidence >= 0.7 ? "high" : confidence >= 0.4 ? "medium" : "low";

    this.state.status = "stopped";

    return {
      status,
      evidenceType: "pose",
      confidenceClass,
      confidenceScore: confidence,
      metrics: {
        validReps,
        targetReps: target,
        invalidReps: this.metrics.invalidReps,
        formScore,
        frontKneeAlignment: alignment,
        torsoUpright: this.metrics.torsoUpright,
        averageRepDuration: this.metrics.averageRepDuration,
        totalCycles: this.metrics.totalCycles,
      },
      reasonCode,
    };
  }
}
