/**
 * PDR-4.3 §30-§41: Enhanced Pose State Machine
 * Full temporal state machine with hysteresis, temporal smoothing,
 * velocity filter, debouncing, and form signals.
 *
 * States: UNKNOWN → READY → LOWERING → BOTTOM → RISING → TOP → REP_COMPLETE
 * Only BOTTOM → RISING → TOP counts as a valid repetition.
 *
 * Uses joint geometry (shoulder, elbow, wrist, hip, knee, ankle),
 * angles, depth, symmetry, alignment, velocity, temporal smoothing, hysteresis.
 */

export type PoseState =
  | "unknown"
  | "ready"
  | "lowering"
  | "bottom"
  | "rising"
  | "top"
  | "rep_complete";

export type PoseLandmark = {
  name: string;
  x: number;
  y: number;
  z?: number;
  visibility?: number;
};

export type PoseObservation = {
  timestamp: number;
  landmarks: PoseLandmark[];
  subjectCount: number;
  visibilityQuality: number;
  boundingBox?: { x: number; y: number; width: number; height: number };
};

export type FormSignals = {
  depth: "valid" | "insufficient";
  alignment: "valid" | "needs_improvement";
  symmetry: "valid" | "needs_improvement";
  velocity: "valid" | "too_fast" | "too_slow";
  continuity: "valid" | "interrupted";
};

export type RepEvent = {
  repCount: number;
  invalidRepCount: number;
  state: PoseState;
  formScore: number;
  formSignals: FormSignals;
  feedback: string;
  timestamp: number;
};

export type EnhancedPoseConfig = {
  targetReps: number;
  activity: "pushup" | "squat" | "lunge" | "burpee" | "jumping_jack";
  minRepDurationMs: number;
  maxRepDurationMs: number;
  minAlignment: number;
  minDepth: number;
  temporalWindowSize: number;
  velocityThreshold: number;
  hysteresisBuffer: number;
};

const DEFAULT_CONFIGS: Record<string, Partial<EnhancedPoseConfig>> = {
  pushup: {
    minRepDurationMs: 800,
    maxRepDurationMs: 5000,
    minAlignment: 0.6,
    minDepth: 0.65,
    velocityThreshold: 0.3,
    hysteresisBuffer: 0.08,
  },
  squat: {
    minRepDurationMs: 800,
    maxRepDurationMs: 5000,
    minAlignment: 0.5,
    minDepth: 0.6,
    velocityThreshold: 0.25,
    hysteresisBuffer: 0.1,
  },
  lunge: {
    minRepDurationMs: 1000,
    maxRepDurationMs: 6000,
    minAlignment: 0.5,
    minDepth: 0.55,
    velocityThreshold: 0.2,
    hysteresisBuffer: 0.1,
  },
  burpee: {
    minRepDurationMs: 2000,
    maxRepDurationMs: 10000,
    minAlignment: 0.4,
    minDepth: 0.5,
    velocityThreshold: 0.15,
    hysteresisBuffer: 0.12,
  },
  jumping_jack: {
    minRepDurationMs: 500,
    maxRepDurationMs: 3000,
    minAlignment: 0.4,
    minDepth: 0.5,
    velocityThreshold: 0.3,
    hysteresisBuffer: 0.1,
  },
};

export class EnhancedPoseStateMachine {
  private config: EnhancedPoseConfig;
  private state: PoseState = "unknown";
  private repCount = 0;
  private invalidRepCount = 0;
  private formScore = 1.0;

  // Temporal smoothing
  private angleHistory: number[] = [];
  private depthHistory: number[] = [];
  private velocityHistory: number[] = [];

  // Hysteresis
  private topThreshold: number;
  private bottomThreshold: number;
  private lastStateChangeTime = 0;
  private minStateDurationMs = 200;

  // Velocity tracking
  private lastAngle = 0;
  private lastAngleTime = 0;

  // Form tracking
  private alignmentHistory: number[] = [];
  private symmetryHistory: number[] = [];

  // Rep tracking
  private repStartAngle = 0;
  private repStartTimestamp = 0;
  private lastRepTimestamp = 0;

  constructor(config: EnhancedPoseConfig) {
    this.config = config;
    this.topThreshold = 1 - config.hysteresisBuffer;
    this.bottomThreshold = config.minDepth;
  }

  /**
   * Process a new frame of pose landmarks.
   * Returns a RepEvent if a rep was counted, null otherwise.
   */
  processFrame(
    landmarks: PoseLandmark[],
    timestamp: number
  ): RepEvent | null {
    // 1. Check subject visibility
    const visibilityQuality = this.calculateVisibilityQuality(landmarks);
    if (visibilityQuality < 0.3) {
      return this.emitEvent(timestamp);
    }

    // 2. Extract key angles and depth
    const depth = this.calculateDepth(landmarks);
    const angle = this.calculateElbowAngle(landmarks);
    const alignment = this.calculateBodyAlignment(landmarks);
    const symmetry = this.calculateSymmetry(landmarks);

    // 3. Temporal smoothing
    this.depthHistory.push(depth);
    this.angleHistory.push(angle);
    this.alignmentHistory.push(alignment);
    this.symmetryHistory.push(symmetry);

    if (this.depthHistory.length > this.config.temporalWindowSize) {
      this.depthHistory.shift();
      this.angleHistory.shift();
      this.alignmentHistory.shift();
      this.symmetryHistory.shift();
    }

    const smoothedDepth = this.getSmoothedDepth();
    const smoothedAngle = this.getSmoothedAngle();

    // 4. Velocity calculation
    const velocity = this.calculateVelocity(smoothedAngle, timestamp);
    this.velocityHistory.push(velocity);
    if (this.velocityHistory.length > this.config.temporalWindowSize) {
      this.velocityHistory.shift();
    }

    // 5. State machine transitions with hysteresis
    const prevState = this.state;
    this.updateState(smoothedDepth, smoothedAngle, velocity, timestamp);

    // 6. Check for rep completion
    if (prevState !== this.state) {
      this.lastStateChangeTime = timestamp;

      if (this.state === "rep_complete") {
        return this.completeRep(timestamp);
      }
    }

    return this.emitEvent(timestamp);
  }

  private updateState(
    depth: number,
    angle: number,
    velocity: number,
    timestamp: number
  ): void {
    // Enforce minimum state duration (debouncing)
    if (timestamp - this.lastStateChangeTime < this.minStateDurationMs) {
      return;
    }

    // Velocity filter: reject implausibly fast movement
    if (Math.abs(velocity) > this.config.velocityThreshold * 3) {
      return;
    }

    switch (this.state) {
      case "unknown":
        if (depth < this.topThreshold) {
          this.state = "ready";
        }
        break;

      case "ready":
        if (depth >= this.bottomThreshold) {
          this.state = "lowering";
          this.repStartAngle = angle;
          this.repStartTimestamp = timestamp;
        }
        break;

      case "lowering":
        if (depth >= this.bottomThreshold) {
          this.state = "bottom";
        }
        // Hysteresis: if depth goes back up significantly, return to ready
        if (depth < this.topThreshold - this.config.hysteresisBuffer) {
          this.state = "ready";
        }
        break;

      case "bottom":
        if (depth < this.bottomThreshold - this.config.hysteresisBuffer) {
          this.state = "rising";
        }
        break;

      case "rising":
        if (depth < this.topThreshold) {
          this.state = "top";
        }
        // Hysteresis: if depth goes back down, return to bottom
        if (depth >= this.bottomThreshold + this.config.hysteresisBuffer) {
          this.state = "bottom";
        }
        break;

      case "top":
        this.state = "rep_complete";
        break;

      case "rep_complete":
        this.state = "ready";
        break;
    }
  }

  private completeRep(timestamp: number): RepEvent {
    const durationMs = timestamp - this.repStartTimestamp;
    const isValidDuration =
      durationMs >= this.config.minRepDurationMs &&
      durationMs <= this.config.maxRepDurationMs;

    const alignment = this.getAverageAlignment();
    const symmetry = this.getAverageSymmetry();
    const velocity = this.getAverageVelocity();
    const isValidAlignment = alignment >= this.config.minAlignment;
    const isValidSymmetry = symmetry >= 0.5;
    const isValidVelocity = Math.abs(velocity) < this.config.velocityThreshold;

    const isValid = isValidDuration && isValidAlignment && isValidSymmetry && isValidVelocity;

    if (isValid) {
      this.repCount++;
    } else {
      this.invalidRepCount++;
    }

    // Update form score
    const formComponents = [
      isValidAlignment ? 1 : alignment / this.config.minAlignment,
      isValidSymmetry ? 1 : symmetry / 0.5,
      isValidVelocity ? 1 : 0.5,
    ];
    this.formScore = formComponents.reduce((s, c) => s + c, 0) / formComponents.length;

    this.lastRepTimestamp = timestamp;
    this.repStartAngle = 0;
    this.repStartTimestamp = 0;

    return this.emitEvent(timestamp);
  }

  // ─── Angle/Depth Calculations ────────────────────────

  private calculateDepth(landmarks: PoseLandmark[]): number {
    const shoulder = this.getMidpoint(landmarks, "left_shoulder", "right_shoulder");
    const hip = this.getMidpoint(landmarks, "left_hip", "right_hip");
    const elbow = this.getMidpoint(landmarks, "left_elbow", "right_elbow");

    if (!shoulder || !hip || !elbow) return 0;

    const bodyLength = Math.abs(hip.y - shoulder.y) + 0.001;
    const armBend = Math.abs(shoulder.y - elbow.y) / bodyLength;
    const armForward = Math.abs(shoulder.x - elbow.x) / bodyLength;

    return Math.min(1, armBend + armForward * 0.3);
  }

  private calculateElbowAngle(landmarks: PoseLandmark[]): number {
    const shoulder = this.getMidpoint(landmarks, "left_shoulder", "right_shoulder");
    const elbow = this.getMidpoint(landmarks, "left_elbow", "right_elbow");
    const wrist = this.getMidpoint(landmarks, "left_wrist", "right_wrist");

    if (!shoulder || !elbow || !wrist) return 180;

    const v1x = shoulder.x - elbow.x;
    const v1y = shoulder.y - elbow.y;
    const v2x = wrist.x - elbow.x;
    const v2y = wrist.y - elbow.y;

    const dot = v1x * v2x + v1y * v2y;
    const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);

    if (mag1 === 0 || mag2 === 0) return 180;

    const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    return Math.acos(cosAngle) * (180 / Math.PI);
  }

  private calculateBodyAlignment(landmarks: PoseLandmark[]): number {
    const shoulder = this.getMidpoint(landmarks, "left_shoulder", "right_shoulder");
    const hip = this.getMidpoint(landmarks, "left_hip", "right_hip");
    const ankle = this.getMidpoint(landmarks, "left_ankle", "right_ankle");

    if (!shoulder || !hip || !ankle) return 0.5;

    const dx1 = hip.x - shoulder.x;
    const dy1 = hip.y - shoulder.y;
    const dx2 = ankle.x - hip.x;
    const dy2 = ankle.y - hip.y;

    const cross = Math.abs(dx1 * dy2 - dy1 * dx2);
    const mag = Math.sqrt(dx1 * dx1 + dy1 * dy1) * Math.sqrt(dx2 * dx2 + dy2 * dy2);

    return mag > 0 ? 1 - Math.min(1, cross / mag) : 0.5;
  }

  private calculateSymmetry(landmarks: PoseLandmark[]): number {
    const leftShoulder = landmarks.find((l) => l.name === "left_shoulder");
    const rightShoulder = landmarks.find((l) => l.name === "right_shoulder");
    const leftHip = landmarks.find((l) => l.name === "left_hip");
    const rightHip = landmarks.find((l) => l.name === "right_hip");

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return 1;

    const shoulderDiff = Math.abs(leftShoulder.y - rightShoulder.y);
    const hipDiff = Math.abs(leftHip.y - rightHip.y);
    const bodyWidth = Math.abs(leftShoulder.x - rightShoulder.x) + 0.001;

    const shoulderSym = 1 - Math.min(1, shoulderDiff / bodyWidth);
    const hipSym = 1 - Math.min(1, hipDiff / bodyWidth);

    return (shoulderSym + hipSym) / 2;
  }

  // ─── Temporal Smoothing ──────────────────────────────

  private getSmoothedDepth(): number {
    if (this.depthHistory.length === 0) return 0;
    // Exponential moving average
    const alpha = 0.3;
    let smoothed = this.depthHistory[0];
    for (let i = 1; i < this.depthHistory.length; i++) {
      smoothed = alpha * this.depthHistory[i] + (1 - alpha) * smoothed;
    }
    return smoothed;
  }

  private getSmoothedAngle(): number {
    if (this.angleHistory.length === 0) return 180;
    const alpha = 0.3;
    let smoothed = this.angleHistory[0];
    for (let i = 1; i < this.angleHistory.length; i++) {
      smoothed = alpha * this.angleHistory[i] + (1 - alpha) * smoothed;
    }
    return smoothed;
  }

  private getAverageAlignment(): number {
    if (this.alignmentHistory.length === 0) return 0.5;
    return this.alignmentHistory.reduce((s, a) => s + a, 0) / this.alignmentHistory.length;
  }

  private getAverageSymmetry(): number {
    if (this.symmetryHistory.length === 0) return 1;
    return this.symmetryHistory.reduce((s, a) => s + a, 0) / this.symmetryHistory.length;
  }

  private getAverageVelocity(): number {
    if (this.velocityHistory.length === 0) return 0;
    return this.velocityHistory.reduce((s, v) => s + v, 0) / this.velocityHistory.length;
  }

  // ─── Velocity ────────────────────────────────────────

  private calculateVelocity(currentAngle: number, timestamp: number): number {
    if (this.lastAngleTime === 0) {
      this.lastAngle = currentAngle;
      this.lastAngleTime = timestamp;
      return 0;
    }

    const dt = (timestamp - this.lastAngleTime) / 1000;
    if (dt <= 0) return 0;

    const velocity = (currentAngle - this.lastAngle) / dt;
    this.lastAngle = currentAngle;
    this.lastAngleTime = timestamp;

    return velocity;
  }

  // ─── Helpers ─────────────────────────────────────────

  private getMidpoint(
    landmarks: PoseLandmark[],
    left: string,
    right: string
  ): { x: number; y: number } | null {
    const l = landmarks.find((lm) => lm.name === left);
    const r = landmarks.find((lm) => lm.name === right);
    if (!l || !r) return null;
    return { x: (l.x + r.x) / 2, y: (l.y + r.y) / 2 };
  }

  private calculateVisibilityQuality(landmarks: PoseLandmark[]): number {
    const required = [
      "left_shoulder", "right_shoulder",
      "left_elbow", "right_elbow",
      "left_hip", "right_hip",
    ];

    let visible = 0;
    for (const name of required) {
      const lm = landmarks.find((l) => l.name === name);
      if (lm && (lm.visibility === undefined || lm.visibility > 0.3)) {
        visible++;
      }
    }

    return visible / required.length;
  }

  // ─── Feedback ────────────────────────────────────────

  private getFeedback(): string {
    const alignment = this.getAverageAlignment();
    const symmetry = this.getAverageSymmetry();
    const velocity = this.getAverageVelocity();

    if (this.repCount >= this.config.targetReps) {
      return `${this.repCount}/${this.config.targetReps} — Mission complete!`;
    }

    if (alignment < 0.5) {
      return "Keep your body aligned";
    }
    if (symmetry < 0.5) {
      return "Keep both sides even";
    }
    if (Math.abs(velocity) > this.config.velocityThreshold * 2) {
      return "Slow down a little";
    }
    if (this.state === "lowering" || this.state === "bottom") {
      return "Go a little lower";
    }

    return `${this.repCount}/${this.config.targetReps}`;
  }

  private emitEvent(timestamp: number): RepEvent {
    return {
      repCount: this.repCount,
      invalidRepCount: this.invalidRepCount,
      state: this.state,
      formScore: this.formScore,
      formSignals: {
        depth: this.state === "bottom" || this.state === "rising" ? "valid" : "insufficient",
        alignment: this.getAverageAlignment() >= this.config.minAlignment ? "valid" : "needs_improvement",
        symmetry: this.getAverageSymmetry() >= 0.5 ? "valid" : "needs_improvement",
        velocity: Math.abs(this.getAverageVelocity()) < this.config.velocityThreshold
          ? "valid"
          : this.getAverageVelocity() > 0 ? "too_fast" : "too_slow",
        continuity: timestamp - this.lastRepTimestamp < this.config.maxRepDurationMs * 2
          ? "valid" : "interrupted",
      },
      feedback: this.getFeedback(),
      timestamp,
    };
  }

  // ─── Public API ──────────────────────────────────────

  getState(): PoseState {
    return this.state;
  }

  getRepCount(): number {
    return this.repCount;
  }

  isComplete(): boolean {
    return this.repCount >= this.config.targetReps;
  }

  reset(): void {
    this.state = "unknown";
    this.repCount = 0;
    this.invalidRepCount = 0;
    this.formScore = 1.0;
    this.angleHistory = [];
    this.depthHistory = [];
    this.velocityHistory = [];
    this.alignmentHistory = [];
    this.symmetryHistory = [];
    this.lastAngle = 0;
    this.lastAngleTime = 0;
    this.lastStateChangeTime = 0;
    this.repStartAngle = 0;
    this.repStartTimestamp = 0;
    this.lastRepTimestamp = 0;
  }
}
