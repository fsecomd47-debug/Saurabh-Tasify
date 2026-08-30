/**
 * PDR-4.1 §22-26: PushupPoseProvider
 * Pushup verification: camera → pose detection → landmark extraction → state machine → rep counting.
 * State machine: READY → TOP → DESCENDING → BOTTOM → ASCENDING → TOP = VALID REP
 */

import type {
  VerificationProvider,
  VerificationState,
  VerificationResult,
} from "@/server/verification/provider-interface";
import type { MissionContract } from "@/server/ai/provider";
import type { VerificationMode } from "@/types";

/**
 * Pushup state machine states.
 * §23: Only TOP → DOWN → BOTTOM → UP → TOP counts as one repetition.
 */
type PushupState = "ready" | "top" | "descending" | "bottom" | "ascending";

/**
 * Body landmarks tracked for pushup detection.
 * §24: shoulder, elbow, wrist, hip, knee, ankle
 */
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

type PushupMetrics = {
  validReps: number;
  invalidReps: number;
  totalCycles: number;
  currentDepth: number;
  bodyAlignment: number;
  formScore: number;
  averageRepDuration: number;
  stateHistory: string[];
};

/**
 * Calculate body alignment score from landmarks.
 * Checks if body is in a straight line from shoulders to ankles.
 */
function calculateBodyAlignment(lm: Landmarks): number {
  const midShoulder = {
    x: (lm.leftShoulder.x + lm.rightShoulder.x) / 2,
    y: (lm.leftShoulder.y + lm.rightShoulder.y) / 2,
  };
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

  // Check if points are roughly collinear
  const dx1 = midHip.x - midShoulder.x;
  const dy1 = midHip.y - midShoulder.y;
  const dx2 = midAnkle.x - midHip.x;
  const dy2 = midAnkle.y - midHip.y;

  const cross = Math.abs(dx1 * dy2 - dy1 * dx2);
  const mag = Math.sqrt(dx1 * dx1 + dy1 * dy1) * Math.sqrt(dx2 * dx2 + dy2 * dy2);
  const alignment = mag > 0 ? 1 - Math.min(1, cross / mag) : 0.5;

  return alignment;
}

/**
 * Calculate depth (how far down the pushup is).
 * 0 = top position, 1 = bottom position.
 */
function calculateDepth(lm: Landmarks): number {
  const shoulderY = (lm.leftShoulder.y + lm.rightShoulder.y) / 2;
  const hipY = (lm.leftHip.y + lm.rightHip.y) / 2;
  const shoulderX = (lm.leftShoulder.x + lm.rightShoulder.x) / 2;
  const elbowY = (lm.leftElbow.y + lm.rightElbow.y) / 2;
  const elbowX = (lm.leftElbow.x + lm.rightElbow.x) / 2;

  // Depth based on elbow angle relative to shoulder
  const bodyLength = Math.abs(hipY - shoulderY) + 0.001;
  const armBend = Math.abs(shoulderY - elbowY) / bodyLength;
  const armForward = Math.abs(shoulderX - elbowX) / bodyLength;

  // Combine vertical and horizontal arm position for depth
  const depth = Math.min(1, armBend + armForward * 0.3);
  return depth;
}

export class PushupPoseProvider implements VerificationProvider {
  readonly name = "pushup-pose";
  readonly supportedModes: VerificationMode[] = ["pose", "repetition"];

  private state: VerificationState = {
    status: "initializing",
    progress: 0,
    confidence: 0,
    metrics: {},
  };

  private mission: MissionContract | null = null;
  private pushupState: PushupState = "ready";
  private metrics: PushupMetrics = {
    validReps: 0,
    invalidReps: 0,
    totalCycles: 0,
    currentDepth: 0,
    bodyAlignment: 0,
    formScore: 0,
    averageRepDuration: 0,
    stateHistory: [],
  };

  private repTimestamps: number[] = [];
  private lastDepthChange: number = 0;
  private targetReps: number = 10;

  // Thresholds
  private readonly TOP_THRESHOLD = 0.15;
  private readonly BOTTOM_THRESHOLD = 0.65;
  private readonly MIN_REP_DURATION_MS = 800;
  private readonly MAX_REP_DURATION_MS = 5000;
  private readonly MIN_ALIGNMENT = 0.6;

  supports(mission: { verificationMode: VerificationMode }): boolean {
    return mission.verificationMode === "pose" || mission.verificationMode === "repetition";
  }

  async initialize(mission: MissionContract): Promise<void> {
    this.mission = mission;
    this.targetReps = mission.targetRepetitions ?? 10;
    this.pushupState = "ready";
    this.metrics = {
      validReps: 0,
      invalidReps: 0,
      totalCycles: 0,
      currentDepth: 0,
      bodyAlignment: 0,
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
    this.pushupState = "ready";
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
   * Process a new frame of pose landmarks.
   * This is the core state machine (§23).
   */
  processFrame(landmarks: Landmarks): void {
    const depth = calculateDepth(landmarks);
    const alignment = calculateBodyAlignment(landmarks);

    this.metrics.currentDepth = depth;
    this.metrics.bodyAlignment = alignment;

    const now = Date.now();
    const timeSinceLastChange = now - this.lastDepthChange;

    // State machine transitions
    switch (this.pushupState) {
      case "ready":
        if (depth >= this.TOP_THRESHOLD) {
          this.pushupState = "top";
          this.lastDepthChange = now;
        }
        break;

      case "top":
        if (depth < this.TOP_THRESHOLD) {
          this.pushupState = "descending";
          this.lastDepthChange = now;
        }
        break;

      case "descending":
        if (depth >= this.BOTTOM_THRESHOLD) {
          this.pushupState = "bottom";
          this.lastDepthChange = now;
        }
        break;

      case "bottom":
        if (depth < this.BOTTOM_THRESHOLD) {
          this.pushupState = "ascending";
          this.lastDepthChange = now;
        }
        break;

      case "ascending":
        if (depth >= this.TOP_THRESHOLD) {
          // Complete rep cycle: TOP → DOWN → BOTTOM → UP → TOP
          this.pushupState = "top";
          this.lastDepthChange = now;
          this.metrics.totalCycles++;
          this.recordRep(timeSinceLastChange, alignment);
        }
        break;
    }

    this.updateState();
  }

  private recordRep(durationMs: number, alignment: number): void {
    const isValidDuration = durationMs >= this.MIN_REP_DURATION_MS && durationMs <= this.MAX_REP_DURATION_MS;
    const isValidAlignment = alignment >= this.MIN_ALIGNMENT;

    if (isValidDuration && isValidAlignment) {
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
        bodyAlignment: this.metrics.bodyAlignment,
        formScore: this.metrics.formScore,
        depth: this.metrics.currentDepth,
        stateDuration: this.metrics.stateHistory.length,
      },
      message: this.getFeedback(),
    };
  }

  /**
   * §25: Pushup feedback.
   * Gentle, non-shaming feedback based on form.
   */
  private getFeedback(): string {
    if (this.metrics.bodyAlignment < 0.6) {
      return "Keep your body aligned";
    }
    if (this.metrics.currentDepth < this.BOTTOM_THRESHOLD && this.pushupState === "descending") {
      return "Go a little lower";
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
    const alignment = this.metrics.bodyAlignment;
    const formScore = this.metrics.formScore;

    // Confidence calculation
    let confidence: number;
    if (ratio >= 1) {
      confidence = Math.min(0.95, 0.7 + formScore * 0.25);
    } else if (ratio >= 0.8) {
      confidence = ratio * 0.7;
    } else {
      confidence = ratio * 0.5;
    }

    // Alignment penalty
    if (alignment < 0.5) {
      confidence *= 0.7;
    }

    let status: "passed" | "failed" | "uncertain";
    let reasonCode: string;

    if (ratio >= 1 && formScore >= 0.7) {
      status = "passed";
      reasonCode = "PUSHUP_TARGET_REACHED";
    } else if (ratio >= 0.8) {
      status = "uncertain";
      reasonCode = "PUSHUP_NEAR_TARGET";
    } else {
      status = "failed";
      reasonCode = "PUSHUP_INSUFFICIENT_REPS";
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
        bodyAlignment: alignment,
        averageRepDuration: this.metrics.averageRepDuration,
        totalCycles: this.metrics.totalCycles,
      },
      reasonCode,
    };
  }
}
