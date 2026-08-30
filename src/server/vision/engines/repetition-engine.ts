/**
 * PDR-4.2 §25-40: Advanced Pose Engine
 * Joint geometry, body alignment, depth, symmetry, tempo, jitter filtering.
 * Generic RepetitionEngine interface with activity-specific implementations.
 */

import type {
  PoseLandmarks,
  Point3D,
  FormSignals,
  RepetitionContext,
  RepetitionObservation,
  RepetitionResult,
} from "../types";

/**
 * §38: Repetition Engine Interface
 * Generic interface for all repetition-based activities.
 */
export interface RepetitionEngine {
  initialize(context: RepetitionContext): void;
  update(landmarks: PoseLandmarks, timestamp: number): RepetitionObservation;
  getCount(): number;
  getSignals(): FormSignals;
  finalize(): RepetitionResult;
  reset(): void;
}

/**
 * §31: Jitter Filter
 * Smoothing for landmark coordinates.
 * Uses exponential moving average.
 */
export class JitterFilter {
  private alpha: number;
  private previous: Map<string, Point3D> = new Map();

  constructor(alpha: number = 0.4) {
    this.alpha = alpha;
  }

  filter(key: string, point: Point3D): Point3D {
    const prev = this.previous.get(key);
    if (!prev) {
      this.previous.set(key, point);
      return point;
    }

    const smoothed: Point3D = {
      x: prev.x + this.alpha * (point.x - prev.x),
      y: prev.y + this.alpha * (point.y - prev.y),
      z: prev.z + this.alpha * (point.z - prev.z),
      visibility: point.visibility,
    };

    this.previous.set(key, smoothed);
    return smoothed;
  }

  filterLandmarks(landmarks: PoseLandmarks): PoseLandmarks {
    return {
      leftShoulder: this.filter("ls", landmarks.leftShoulder),
      rightShoulder: this.filter("rs", landmarks.rightShoulder),
      leftElbow: this.filter("le", landmarks.leftElbow),
      rightElbow: this.filter("re", landmarks.rightElbow),
      leftWrist: this.filter("lw", landmarks.leftWrist),
      rightWrist: this.filter("rw", landmarks.rightWrist),
      leftHip: this.filter("lh", landmarks.leftHip),
      rightHip: this.filter("rh", landmarks.rightHip),
      leftKnee: this.filter("lk", landmarks.leftKnee),
      rightKnee: this.filter("rk", landmarks.rightKnee),
      leftAnkle: this.filter("la", landmarks.leftAnkle),
      rightAnkle: this.filter("ra", landmarks.rightAnkle),
    };
  }

  reset(): void {
    this.previous.clear();
  }
}

/**
 * §26: Joint Geometry Calculations
 */
export function calculateAngle(a: Point3D, b: Point3D, c: Point3D): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let degrees = Math.abs((radians * 180) / Math.PI);
  if (degrees > 180) degrees = 360 - degrees;
  return degrees;
}

export function calculateDistance(a: Point3D, b: Point3D): number {
  return Math.sqrt(
    (b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2
  );
}

export function midpoint(a: Point3D, b: Point3D): Point3D {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
  };
}

/**
 * §27: Body Alignment Calculation
 * Checks if body is in a straight line from shoulders to ankles.
 */
export function calculateBodyAlignment(landmarks: PoseLandmarks): number {
  const midShoulder = midpoint(landmarks.leftShoulder, landmarks.rightShoulder);
  const midHip = midpoint(landmarks.leftHip, landmarks.rightHip);
  const midKnee = midpoint(landmarks.leftKnee, landmarks.rightKnee);
  const midAnkle = midpoint(landmarks.leftAnkle, landmarks.rightAnkle);

  // Check collinearity using cross product
  const dx1 = midHip.x - midShoulder.x;
  const dy1 = midHip.y - midShoulder.y;
  const dx2 = midAnkle.x - midHip.x;
  const dy2 = midAnkle.y - midHip.y;

  const cross = Math.abs(dx1 * dy2 - dy1 * dx2);
  const mag = Math.sqrt(dx1 * dx1 + dy1 * dy1) * Math.sqrt(dx2 * dx2 + dy2 * dy2);
  return mag > 0 ? 1 - Math.min(1, cross / mag) : 0.5;
}

/**
 * §29: Symmetry Signal
 * Compare left/right movement symmetry.
 */
export function calculateSymmetry(landmarks: PoseLandmarks): number {
  const leftArmAngle = calculateAngle(
    landmarks.leftShoulder,
    landmarks.leftElbow,
    landmarks.leftWrist
  );
  const rightArmAngle = calculateAngle(
    landmarks.rightShoulder,
    landmarks.rightElbow,
    landmarks.rightWrist
  );

  const diff = Math.abs(leftArmAngle - rightArmAngle);
  return Math.max(0, 1 - diff / 45); // Normalize: 45° difference = 0 symmetry
}

/**
 * §28: Depth Calculation (Pushup-specific)
 * Returns 0-1 where 0 = top, 1 = bottom.
 */
export function calculatePushupDepth(landmarks: PoseLandmarks): number {
  const shoulderY = (landmarks.leftShoulder.y + landmarks.rightShoulder.y) / 2;
  const hipY = (landmarks.leftHip.y + landmarks.rightHip.y) / 2;
  const elbowY = (landmarks.leftElbow.y + landmarks.rightElbow.y) / 2;

  const bodyLength = Math.abs(hipY - shoulderY) + 0.001;
  const armBend = Math.abs(shoulderY - elbowY) / bodyLength;

  return Math.min(1, armBend);
}

/**
 * §36: Squat Depth Calculation
 * Returns 0-1 where 0 = standing, 1 = deep squat.
 */
export function calculateSquatDepth(landmarks: PoseLandmarks): number {
  const hipY = (landmarks.leftHip.y + landmarks.rightHip.y) / 2;
  const kneeY = (landmarks.leftKnee.y + landmarks.rightKnee.y) / 2;
  const ankleY = (landmarks.leftAnkle.y + landmarks.rightAnkle.y) / 2;

  const legLength = Math.abs(ankleY - hipY) + 0.001;
  const kneeBend = Math.abs(hipY - kneeY) / legLength;

  return Math.min(1, kneeBend);
}

/**
 * §32: Pushup Repetition State Machine
 * READY → TOP → DESCENDING → BOTTOM → ASCENDING → TOP = VALID REP
 */
type PushupState = "ready" | "top" | "descending" | "bottom" | "ascending";

export class PushupRepetitionEngine implements RepetitionEngine {
  private context: RepetitionContext | null = null;
  private state: PushupState = "ready";
  private count = 0;
  private invalidCount = 0;
  private jitterFilter = new JitterFilter(0.4);
  private repTimestamps: number[] = [];
  private lastStateChange = 0;
  private currentFormSignals: FormSignals = {};

  // Configurable thresholds
  private topThreshold = 0.15;
  private bottomThreshold = 0.65;
  private minRepDurationMs = 800;
  private maxRepDurationMs = 5000;
  private cooldownMs = 300;
  private lastRepTime = 0;

  initialize(context: RepetitionContext): void {
    this.context = context;
    this.state = "ready";
    this.count = 0;
    this.invalidCount = 0;
    this.repTimestamps = [];
    this.lastStateChange = Date.now();
    this.currentFormSignals = {};

    // Apply context thresholds
    if (context.depthThreshold) this.bottomThreshold = context.depthThreshold;
    if (context.alignmentThreshold) this.topThreshold = context.alignmentThreshold;
    if (context.cooldownMs) this.cooldownMs = context.cooldownMs;
    if (context.minRepDurationMs) this.minRepDurationMs = context.minRepDurationMs;
    if (context.maxRepDurationMs) this.maxRepDurationMs = context.maxRepDurationMs;
  }

  update(landmarks: PoseLandmarks, timestamp: number): RepetitionObservation {
    // §31: Apply jitter filtering
    const filtered = this.jitterFilter.filterLandmarks(landmarks);

    // Calculate signals
    const depth = calculatePushupDepth(filtered);
    const alignment = calculateBodyAlignment(filtered);
    const symmetry = calculateSymmetry(filtered);

    this.currentFormSignals = {
      depth,
      alignment,
      symmetry,
      tempo: this.calculateTempo(timestamp),
      stability: this.calculateStability(depth),
    };

    // §32: State machine transitions
    const timeSinceLastChange = timestamp - this.lastStateChange;
    const timeSinceLastRep = timestamp - this.lastRepTime;
    let isValidRep = false;

    switch (this.state) {
      case "ready":
        if (depth >= this.topThreshold) {
          this.state = "top";
          this.lastStateChange = timestamp;
        }
        break;

      case "top":
        if (depth < this.topThreshold) {
          this.state = "descending";
          this.lastStateChange = timestamp;
        }
        break;

      case "descending":
        if (depth >= this.bottomThreshold) {
          this.state = "bottom";
          this.lastStateChange = timestamp;
        }
        break;

      case "bottom":
        if (depth < this.bottomThreshold) {
          this.state = "ascending";
          this.lastStateChange = timestamp;
        }
        break;

      case "ascending":
        if (depth >= this.topThreshold) {
          // §33: Check cooldown
          if (timeSinceLastRep >= this.cooldownMs) {
            // Valid rep cycle completed
            isValidRep = this.validateRep(timeSinceLastChange, alignment, timestamp);
            if (isValidRep) {
              this.count++;
              this.repTimestamps.push(timestamp);
              this.lastRepTime = timestamp;
            } else {
              this.invalidCount++;
            }
          }
          this.state = "top";
          this.lastStateChange = timestamp;
        }
        break;
    }

    return {
      isValidRep,
      currentCount: this.count,
      targetCount: this.context?.targetReps ?? 10,
      formSignals: { ...this.currentFormSignals },
      state: this.state,
      message: this.getFeedback(),
    };
  }

  getCount(): number {
    return this.count;
  }

  getSignals(): FormSignals {
    return { ...this.currentFormSignals };
  }

  finalize(): RepetitionResult {
    const durations: number[] = [];
    for (let i = 1; i < this.repTimestamps.length; i++) {
      durations.push(this.repTimestamps[i] - this.repTimestamps[i - 1]);
    }

    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    // §40: Validity vs Quality distinction
    const formScore = this.count > 0
      ? this.count / (this.count + this.invalidCount)
      : 0;

    return {
      validReps: this.count,
      invalidReps: this.invalidCount,
      targetReps: this.context?.targetReps ?? 10,
      formScore,
      formSignals: { ...this.currentFormSignals },
      averageRepDuration: avgDuration,
      consistency: this.calculateConsistency(durations),
    };
  }

  reset(): void {
    this.state = "ready";
    this.count = 0;
    this.invalidCount = 0;
    this.repTimestamps = [];
    this.jitterFilter.reset();
  }

  /**
   * §30: Validate a rep based on temporal profile.
   */
  private validateRep(durationMs: number, alignment: number, _timestamp: number): boolean {
    const validDuration = durationMs >= this.minRepDurationMs && durationMs <= this.maxRepDurationMs;
    const validAlignment = alignment >= (this.context?.alignmentThreshold ?? 0.6);

    return validDuration && validAlignment;
  }

  /**
   * §30: Speed/Tempo Signal
   */
  private calculateTempo(timestamp: number): number {
    if (this.repTimestamps.length < 2) return 0.5;
    const lastInterval = timestamp - this.repTimestamps[this.repTimestamps.length - 1];
    // Ideal tempo: 2-4 seconds per rep
    if (lastInterval >= 2000 && lastInterval <= 4000) return 1;
    if (lastInterval < 1000) return 0.3; // Too fast
    return 0.7; // Acceptable
  }

  /**
   * §31: Stability Signal
   */
  private calculateStability(currentDepth: number): number {
    // Simple stability: how consistent is the depth reading
    return this.currentFormSignals.depth !== undefined
      ? 1 - Math.abs(currentDepth - this.currentFormSignals.depth)
      : 0.5;
  }

  /**
   * §30: Consistency calculation
   */
  private calculateConsistency(durations: number[]): number {
    if (durations.length < 2) return 1;
    const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
    const variance = durations.reduce((sum, d) => sum + (d - mean) ** 2, 0) / durations.length;
    const cv = Math.sqrt(variance) / mean;
    return Math.max(0, 1 - cv);
  }

  /**
   * §34: Pushup feedback (non-shaming).
   */
  private getFeedback(): string {
    if (this.currentFormSignals.alignment !== undefined && this.currentFormSignals.alignment < 0.6) {
      return "Keep your body aligned";
    }
    if (this.state === "descending" && this.currentFormSignals.depth !== undefined && this.currentFormSignals.depth < this.bottomThreshold) {
      return "A little deeper";
    }
    if (this.count >= (this.context?.targetReps ?? 10)) {
      return `${this.count}/${this.context?.targetReps ?? 10} — Nice work!`;
    }
    return `${this.count}/${this.context?.targetReps ?? 10}`;
  }
}

/**
 * §36: Squat Repetition Engine
 * STANDING → DESCENDING → TARGET_DEPTH → ASCENDING → STANDING = VALID REP
 */
type SquatState = "standing" | "descending" | "depth_confirmed" | "ascending";

export class SquatRepetitionEngine implements RepetitionEngine {
  private context: RepetitionContext | null = null;
  private state: SquatState = "standing";
  private count = 0;
  private invalidCount = 0;
  private jitterFilter = new JitterFilter(0.4);
  private repTimestamps: number[] = [];
  private lastStateChange = 0;
  private lastRepTime = 0;
  private currentFormSignals: FormSignals = {};

  private depthThreshold = 0.6;
  private cooldownMs = 300;
  private minRepDurationMs = 1000;
  private maxRepDurationMs = 5000;

  initialize(context: RepetitionContext): void {
    this.context = context;
    this.state = "standing";
    this.count = 0;
    this.invalidCount = 0;
    this.repTimestamps = [];
    this.lastStateChange = Date.now();
    if (context.depthThreshold) this.depthThreshold = context.depthThreshold;
  }

  update(landmarks: PoseLandmarks, timestamp: number): RepetitionObservation {
    const filtered = this.jitterFilter.filterLandmarks(landmarks);
    const depth = calculateSquatDepth(filtered);
    const alignment = calculateBodyAlignment(filtered);
    const symmetry = calculateSymmetry(filtered);

    this.currentFormSignals = { depth, alignment, symmetry };

    const timeSinceLastRep = timestamp - this.lastRepTime;
    let isValidRep = false;

    switch (this.state) {
      case "standing":
        if (depth < 0.3) {
          this.state = "descending";
          this.lastStateChange = timestamp;
        }
        break;
      case "descending":
        if (depth >= this.depthThreshold) {
          this.state = "depth_confirmed";
          this.lastStateChange = timestamp;
        }
        break;
      case "depth_confirmed":
        if (depth < 0.3) {
          this.state = "ascending";
          this.lastStateChange = timestamp;
        }
        break;
      case "ascending":
        if (depth < 0.1) {
          if (timeSinceLastRep >= this.cooldownMs) {
            const duration = timestamp - this.lastStateChange;
            if (duration >= this.minRepDurationMs && duration <= this.maxRepDurationMs) {
              isValidRep = true;
              this.count++;
              this.repTimestamps.push(timestamp);
              this.lastRepTime = timestamp;
            } else {
              this.invalidCount++;
            }
          }
          this.state = "standing";
          this.lastStateChange = timestamp;
        }
        break;
    }

    return {
      isValidRep,
      currentCount: this.count,
      targetCount: this.context?.targetReps ?? 15,
      formSignals: { ...this.currentFormSignals },
      state: this.state,
      message: this.getFeedback(),
    };
  }

  getCount(): number { return this.count; }
  getSignals(): FormSignals { return { ...this.currentFormSignals }; }
  finalize(): RepetitionResult {
    return {
      validReps: this.count,
      invalidReps: this.invalidCount,
      targetReps: this.context?.targetReps ?? 15,
      formScore: this.count / (this.count + this.invalidCount || 1),
      formSignals: { ...this.currentFormSignals },
      averageRepDuration: 0,
      consistency: 1,
    };
  }
  reset(): void { this.state = "standing"; this.count = 0; this.invalidCount = 0; }
  private getFeedback(): string {
    if (this.state === "depth_confirmed") return "Good depth!";
    return `${this.count}/${this.context?.targetReps ?? 15}`;
  }
}
