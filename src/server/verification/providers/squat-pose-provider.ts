/**
 * PDR-4.2 §32-34: SquatPoseProvider
 * Squat verification: camera → pose detection → landmark extraction → state machine → rep counting.
 * State machine: READY → TOP → DESCENDING → BOTTOM → ASCENDING → TOP = VALID REP
 *
 * Squat-specific mechanics:
 * - Tracks knee/hip/ankle angles for depth detection
 * - Monitors torso lean to detect forward lean (poor form)
 * - Uses knee-over-toe alignment for form feedback
 */

import type {
  VerificationProvider,
  VerificationState,
  VerificationResult,
} from "@/server/verification/provider-interface";
import type { MissionContract } from "@/server/ai/provider";
import type { VerificationMode } from "@/types";

type SquatState = "ready" | "top" | "descending" | "bottom" | "ascending";

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

type SquatMetrics = {
  validReps: number;
  invalidReps: number;
  totalCycles: number;
  currentDepth: number;
  torsoLean: number;
  kneeAlignment: number;
  formScore: number;
  averageRepDuration: number;
  stateHistory: string[];
};

/**
 * Calculate knee angle for squat depth detection.
 * 0 = fully extended, increases as knee bends.
 */
function calculateKneeAngle(lm: Landmarks): number {
  const midHip = {
    x: (lm.leftHip.x + lm.rightHip.x) / 2,
    y: (lm.leftHip.y + lm.rightHip.y) / 2,
  };
  const midKnee = {
    x: (lm.leftKnee.x + lm.rightKnee.x) / 2,
    y: (lm.leftKnee.y + lm.rightKnee.y) / 2,
  };
  const midAnkle = {
    x: (lm.leftAnkle.x + lm.rightAnkle.x) / 2,
    y: (lm.leftAnkle.y + lm.rightAnkle.y) / 2,
  };

  // Vector from knee to hip
  const v1x = midHip.x - midKnee.x;
  const v1y = midHip.y - midKnee.y;
  // Vector from knee to ankle
  const v2x = midAnkle.x - midKnee.x;
  const v2y = midAnkle.y - midKnee.y;

  const dot = v1x * v2x + v1y * v2y;
  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);

  if (mag1 === 0 || mag2 === 0) return 0;

  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  const angleDeg = Math.acos(cosAngle) * (180 / Math.PI);

  // Convert to 0-1 depth scale: 180° = 0 depth (standing), 90° = 1 depth (deep squat)
  return Math.max(0, Math.min(1, (180 - angleDeg) / 90));
}

/**
 * Calculate torso lean angle.
 * Returns 0-1 where 0 = upright, 1 = leaning far forward.
 */
function calculateTorsoLean(lm: Landmarks): number {
  const midShoulder = {
    x: (lm.leftShoulder.x + lm.rightShoulder.x) / 2,
    y: (lm.leftShoulder.y + lm.rightShoulder.y) / 2,
  };
  const midHip = {
    x: (lm.leftHip.x + lm.rightHip.x) / 2,
    y: (lm.leftHip.y + lm.rightHip.y) / 2,
  };

  // Torso vector
  const dx = midShoulder.x - midHip.x;
  const dy = midShoulder.y - midHip.y;

  // Vertical line from hip
  const lean = Math.abs(dx) / (Math.abs(dy) + 0.001);
  return Math.min(1, lean);
}

/**
 * Calculate knee-over-toe alignment.
 * Returns 0-1 where 1 = perfect alignment, 0 = knees caving or extending past toes.
 */
function calculateKneeAlignment(lm: Landmarks): number {
  const leftKneeX = (lm.leftKnee.x + lm.rightKnee.x) / 2;
  const leftAnkleX = (lm.leftAnkle.x + lm.rightAnkle.x) / 2;
  const leftShoulderX = (lm.leftShoulder.x + lm.rightShoulder.x) / 2;

  // Knees should be roughly over ankles, not past toes
  const kneeOverAnkle = Math.abs(leftKneeX - leftAnkleX);
  const shoulderWidth = Math.abs(leftShoulderX - leftAnkleX) + 0.001;

  // Knees should not extend far past toes
  const alignment = 1 - Math.min(1, kneeOverAnkle / shoulderWidth);
  return alignment;
}

export class SquatPoseProvider implements VerificationProvider {
  readonly name = "squat-pose";
  readonly supportedModes: VerificationMode[] = ["pose", "repetition"];

  private state: VerificationState = {
    status: "initializing",
    progress: 0,
    confidence: 0,
    metrics: {},
  };

  private mission: MissionContract | null = null;
  private squatState: SquatState = "ready";
  private metrics: SquatMetrics = {
    validReps: 0,
    invalidReps: 0,
    totalCycles: 0,
    currentDepth: 0,
    torsoLean: 0,
    kneeAlignment: 0,
    formScore: 0,
    averageRepDuration: 0,
    stateHistory: [],
  };

  private repTimestamps: number[] = [];
  private lastDepthChange: number = 0;
  private targetReps: number = 15;

  private readonly TOP_THRESHOLD = 0.2;
  private readonly BOTTOM_THRESHOLD = 0.6;
  private readonly MIN_REP_DURATION_MS = 800;
  private readonly MAX_REP_DURATION_MS = 5000;
  private readonly MIN_ALIGNMENT = 0.5;

  supports(mission: { verificationMode: VerificationMode }): boolean {
    return mission.verificationMode === "pose" || mission.verificationMode === "repetition";
  }

  async initialize(mission: MissionContract): Promise<void> {
    this.mission = mission;
    this.targetReps = mission.targetRepetitions ?? 15;
    this.squatState = "ready";
    this.metrics = {
      validReps: 0,
      invalidReps: 0,
      totalCycles: 0,
      currentDepth: 0,
      torsoLean: 0,
      kneeAlignment: 0,
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
    this.squatState = "ready";
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
   * Process a new frame of pose landmarks for squat detection.
   * Squat state machine: TOP → DESCENDING → BOTTOM → ASCENDING → TOP = VALID REP
   */
  processFrame(landmarks: Landmarks): void {
    const depth = calculateKneeAngle(landmarks);
    const lean = calculateTorsoLean(landmarks);
    const alignment = calculateKneeAlignment(landmarks);

    this.metrics.currentDepth = depth;
    this.metrics.torsoLean = lean;
    this.metrics.kneeAlignment = alignment;

    const now = Date.now();
    const timeSinceLastChange = now - this.lastDepthChange;

    switch (this.squatState) {
      case "ready":
        if (depth < this.TOP_THRESHOLD) {
          this.squatState = "top";
          this.lastDepthChange = now;
        }
        break;

      case "top":
        if (depth >= this.TOP_THRESHOLD) {
          this.squatState = "descending";
          this.lastDepthChange = now;
        }
        break;

      case "descending":
        if (depth >= this.BOTTOM_THRESHOLD) {
          this.squatState = "bottom";
          this.lastDepthChange = now;
        }
        break;

      case "bottom":
        if (depth < this.BOTTOM_THRESHOLD) {
          this.squatState = "ascending";
          this.lastDepthChange = now;
        }
        break;

      case "ascending":
        if (depth < this.TOP_THRESHOLD) {
          this.squatState = "top";
          this.lastDepthChange = now;
          this.metrics.totalCycles++;
          this.recordRep(timeSinceLastChange, alignment, lean);
        }
        break;
    }

    this.updateState();
  }

  private recordRep(durationMs: number, alignment: number, lean: number): void {
    const isValidDuration = durationMs >= this.MIN_REP_DURATION_MS && durationMs <= this.MAX_REP_DURATION_MS;
    const isValidAlignment = alignment >= this.MIN_ALIGNMENT;
    const isValidLean = lean < 0.6;

    if (isValidDuration && isValidAlignment && isValidLean) {
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
        kneeAlignment: this.metrics.kneeAlignment,
        torsoLean: this.metrics.torsoLean,
        formScore: this.metrics.formScore,
        depth: this.metrics.currentDepth,
        stateDuration: this.metrics.stateHistory.length,
      },
      message: this.getFeedback(),
    };
  }

  private getFeedback(): string {
    if (this.metrics.torsoLean > 0.5) {
      return "Keep your chest up";
    }
    if (this.metrics.currentDepth < this.BOTTOM_THRESHOLD && this.squatState === "descending") {
      return "Go a little deeper";
    }
    if (this.metrics.kneeAlignment < 0.4) {
      return "Keep knees over toes";
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
    const alignment = this.metrics.kneeAlignment;
    const formScore = this.metrics.formScore;

    let confidence: number;
    if (ratio >= 1) {
      confidence = Math.min(0.95, 0.7 + formScore * 0.25);
    } else if (ratio >= 0.8) {
      confidence = ratio * 0.7;
    } else {
      confidence = ratio * 0.5;
    }

    if (alignment < 0.5) {
      confidence *= 0.7;
    }

    let status: "passed" | "failed" | "uncertain";
    let reasonCode: string;

    if (ratio >= 1 && formScore >= 0.7) {
      status = "passed";
      reasonCode = "SQUAT_TARGET_REACHED";
    } else if (ratio >= 0.8) {
      status = "uncertain";
      reasonCode = "SQUAT_NEAR_TARGET";
    } else {
      status = "failed";
      reasonCode = "SQUAT_INSUFFICIENT_REPS";
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
        kneeAlignment: alignment,
        torsoLean: this.metrics.torsoLean,
        averageRepDuration: this.metrics.averageRepDuration,
        totalCycles: this.metrics.totalCycles,
      },
      reasonCode,
    };
  }
}
