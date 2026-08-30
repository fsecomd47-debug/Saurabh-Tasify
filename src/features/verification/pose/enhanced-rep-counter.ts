"use client";

/**
 * PDR-4.2: Generic Repetition Engine
 * Activity-specific geometry policies with jitter filtering and cooldown.
 * Supports pushups, squats, lunges, and custom activities.
 */

import type {
  Landmark,
  JointAngle,
  FormSignal,
  ActivityGeometryPolicy,
  RepetitionPhase,
  VisionObservation,
} from "../vision/types";

// ============================================================================
// Repetition State Machine
// ============================================================================

export type RepState =
  | "ready"
  | "descending"
  | "bottom_confirmed"
  | "ascending"
  | "top_confirmed"
  | "cooldown";

export type RepEvent = {
  repCount: number;
  state: RepState;
  formScore: number;
  phase: RepetitionPhase;
  timestamp: number;
  quality: "good" | "acceptable" | "poor";
  feedback?: string;
};

export type RepetitionEngineConfig = {
  activityType: string;
  targetReps: number;
  onRep?: (event: RepEvent) => void;
  onFormFeedback?: (feedback: string) => void;
  onStateChange?: (state: RepState) => void;
  enableJitterFilter?: boolean;
  enableCooldown?: boolean;
  cooldownFrames?: number;
};

// ============================================================================
// Activity Geometry Policies
// ============================================================================

export const ACTIVITY_POLICIES: Record<string, ActivityGeometryPolicy> = {
  pushup: {
    activityType: "pushup",
    primaryJoints: ["left_elbow", "right_elbow", "body_alignment"],
    angleThresholds: {
      left_elbow: { min: 60, max: 120 },
      right_elbow: { min: 60, max: 120 },
      body_alignment: { min: 160, max: 200 },
    },
    repPhases: [
      {
        phase: "up",
        jointAngles: [
          { joint: "elbow", angle: 160, targetMin: 140, targetMax: 180, visibility: 0.8 },
        ],
        timestamp: 0,
        frameIndex: 0,
      },
      {
        phase: "down",
        jointAngles: [
          { joint: "elbow", angle: 70, targetMin: 50, targetMax: 90, visibility: 0.8 },
        ],
        timestamp: 0,
        frameIndex: 0,
      },
    ],
    formSignals: [],
  },
  squat: {
    activityType: "squat",
    primaryJoints: ["left_knee", "right_knee", "hip"],
    angleThresholds: {
      left_knee: { min: 70, max: 110 },
      right_knee: { min: 70, max: 110 },
      hip: { min: 60, max: 120 },
    },
    repPhases: [
      {
        phase: "up",
        jointAngles: [
          { joint: "knee", angle: 170, targetMin: 150, targetMax: 180, visibility: 0.8 },
          { joint: "hip", angle: 170, targetMin: 150, targetMax: 180, visibility: 0.8 },
        ],
        timestamp: 0,
        frameIndex: 0,
      },
      {
        phase: "down",
        jointAngles: [
          { joint: "knee", angle: 90, targetMin: 70, targetMax: 110, visibility: 0.8 },
          { joint: "hip", angle: 90, targetMin: 60, targetMax: 120, visibility: 0.8 },
        ],
        timestamp: 0,
        frameIndex: 0,
      },
    ],
    formSignals: [],
  },
  lunge: {
    activityType: "lunge",
    primaryJoints: ["left_knee", "right_knee", "hip"],
    angleThresholds: {
      left_knee: { min: 70, max: 110 },
      right_knee: { min: 70, max: 110 },
      hip: { min: 150, max: 210 },
    },
    repPhases: [
      {
        phase: "up",
        jointAngles: [
          { joint: "knee", angle: 170, targetMin: 150, targetMax: 180, visibility: 0.8 },
        ],
        timestamp: 0,
        frameIndex: 0,
      },
      {
        phase: "down",
        jointAngles: [
          { joint: "knee", angle: 90, targetMin: 70, targetMax: 110, visibility: 0.8 },
        ],
        timestamp: 0,
        frameIndex: 0,
      },
    ],
    formSignals: [],
  },
};

// ============================================================================
// Jitter Filter
// ============================================================================

export class JitterFilter {
  private history: number[] = [];
  private readonly maxHistory: number;
  private readonly threshold: number;

  constructor(maxHistory: number = 5, threshold: number = 5) {
    this.maxHistory = maxHistory;
    this.threshold = threshold;
  }

  addValue(value: number): number {
    this.history.push(value);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    if (this.history.length === 1) {
      return value;
    }

    // Calculate median
    const sorted = [...this.history].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    // Filter out spikes
    if (Math.abs(value - median) > this.threshold) {
      return median;
    }

    return value;
  }

  reset(): void {
    this.history = [];
  }
}

// ============================================================================
// Enhanced Repetition Engine
// ============================================================================

export class RepetitionEngine {
  private config: RepetitionEngineConfig;
  private policy: ActivityGeometryPolicy;
  private state: RepState = "ready";
  private repCount: number = 0;
  private formScore: number = 1.0;
  private cooldownCounter: number = 0;

  // Jitter filtering
  private leftElbowFilter: JitterFilter;
  private rightElbowFilter: JitterFilter;
  private leftKneeFilter: JitterFilter;
  private rightKneeFilter: JitterFilter;

  // Angle thresholds
  private bottomAngle: number;
  private topAngle: number;
  private angleBuffer: number = 10;

  // Current angles
  private currentLeftElbow: number = 180;
  private currentRightElbow: number = 180;
  private currentLeftKnee: number = 180;
  private currentRightKnee: number = 180;
  private currentHip: number = 180;

  // Form tracking
  private formHistory: number[] = [];
  private lastFeedbackTime: number = 0;
  private readonly FEEDBACK_COOLDOWN_MS = 2000;

  constructor(config: RepetitionEngineConfig) {
    this.config = config;
    this.policy = ACTIVITY_POLICIES[config.activityType] || ACTIVITY_POLICIES.pushup;

    // Initialize thresholds based on activity type
    if (config.activityType === "pushup") {
      this.bottomAngle = 70;
      this.topAngle = 160;
    } else if (config.activityType === "squat") {
      this.bottomAngle = 90;
      this.topAngle = 170;
    } else if (config.activityType === "lunge") {
      this.bottomAngle = 70;
      this.topAngle = 160;
    } else {
      this.bottomAngle = 70;
      this.topAngle = 160;
    }

    // Initialize jitter filters
    this.leftElbowFilter = new JitterFilter(5, 5);
    this.rightElbowFilter = new JitterFilter(5, 5);
    this.leftKneeFilter = new JitterFilter(5, 5);
    this.rightKneeFilter = new JitterFilter(5, 5);
  }

  /**
   * Process a pose observation and update repetition count
   */
  processObservation(observation: VisionObservation): RepEvent {
    // Extract joint angles from observation
    if (observation.landmarks && observation.landmarks.length >= 33) {
      this.extractAnglesFromLandmarks(observation.landmarks);
    }

    // Apply jitter filtering if enabled
    const leftElbow = this.config.enableJitterFilter !== false
      ? this.leftElbowFilter.addValue(this.currentLeftElbow)
      : this.currentLeftElbow;
    const rightElbow = this.config.enableJitterFilter !== false
      ? this.rightElbowFilter.addValue(this.currentRightElbow)
      : this.currentRightElbow;

    // Use average elbow angle for pushups, knee angle for squats/lunges
    let primaryAngle: number;
    if (this.config.activityType === "pushup") {
      primaryAngle = (leftElbow + rightElbow) / 2;
    } else {
      const leftKnee = this.config.enableJitterFilter !== false
        ? this.leftKneeFilter.addValue(this.currentLeftKnee)
        : this.currentLeftKnee;
      const rightKnee = this.config.enableJitterFilter !== false
        ? this.rightKneeFilter.addValue(this.currentRightKnee)
        : this.currentRightKnee;
      primaryAngle = (leftKnee + rightKnee) / 2;
    }

    // Check body visibility
    const bodyVisible = this.checkBodyVisibility(observation.landmarks || []);

    // Update state machine
    this.updateStateMachine(primaryAngle, bodyVisible);

    // Calculate form score
    const currentFormScore = this.calculateFormScore(primaryAngle);

    // Generate form signals
    const formSignals = this.generateFormSignals();

    // Create phase info
    const phase: RepetitionPhase = {
      phase: this.state === "descending" || this.state === "bottom_confirmed" ? "down" : "up",
      jointAngles: this.getCurrentJointAngles(),
      timestamp: observation.timestamp,
      frameIndex: observation.frameIndex,
    };

    // Determine quality
    let quality: "good" | "acceptable" | "poor";
    if (currentFormScore >= 0.8) {
      quality = "good";
    } else if (currentFormScore >= 0.6) {
      quality = "acceptable";
    } else {
      quality = "poor";
    }

    // Generate feedback (with cooldown)
    const feedback = this.generateFeedback(primaryAngle, quality);

    return {
      repCount: this.repCount,
      state: this.state,
      formScore: currentFormScore,
      phase,
      timestamp: observation.timestamp,
      quality,
      feedback,
    };
  }

  /**
   * Process frame with legacy API (elbow angle + visibility)
   */
  processFrame(elbowAngle: number, bodyVisible: boolean): RepEvent {
    this.currentLeftElbow = elbowAngle;
    this.currentRightElbow = elbowAngle;

    // Apply jitter filtering
    const filteredAngle = this.config.enableJitterFilter !== false
      ? this.leftElbowFilter.addValue(elbowAngle)
      : elbowAngle;

    // Update state machine
    this.updateStateMachine(filteredAngle, bodyVisible);

    // Calculate form score
    const currentFormScore = this.calculateFormScore(filteredAngle);

    // Create phase info
    const phase: RepetitionPhase = {
      phase: this.state === "descending" || this.state === "bottom_confirmed" ? "down" : "up",
      jointAngles: [{ joint: "elbow", angle: filteredAngle, targetMin: this.bottomAngle, targetMax: this.topAngle, visibility: bodyVisible ? 1 : 0 }],
      timestamp: Date.now(),
      frameIndex: 0,
    };

    // Determine quality
    let quality: "good" | "acceptable" | "poor";
    if (currentFormScore >= 0.8) {
      quality = "good";
    } else if (currentFormScore >= 0.6) {
      quality = "acceptable";
    } else {
      quality = "poor";
    }

    return {
      repCount: this.repCount,
      state: this.state,
      formScore: currentFormScore,
      phase,
      timestamp: Date.now(),
      quality,
    };
  }

  getRepCount(): number {
    return this.repCount;
  }

  isComplete(): boolean {
    return this.repCount >= this.config.targetReps;
  }

  reset(): void {
    this.state = "ready";
    this.repCount = 0;
    this.formScore = 1.0;
    this.cooldownCounter = 0;
    this.formHistory = [];
    this.leftElbowFilter.reset();
    this.rightElbowFilter.reset();
    this.leftKneeFilter.reset();
    this.rightKneeFilter.reset();
  }

  getState(): RepState {
    return this.state;
  }

  getFormScore(): number {
    return this.formScore;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private extractAnglesFromLandmarks(landmarks: Landmark[]): void {
    if (landmarks.length < 33) return;

    // MediaPipe landmark indices
    const LEFT_SHOULDER = 11;
    const RIGHT_SHOULDER = 12;
    const LEFT_ELBOW = 13;
    const RIGHT_ELBOW = 14;
    const LEFT_WRIST = 15;
    const RIGHT_WRIST = 16;
    const LEFT_HIP = 23;
    const RIGHT_HIP = 24;
    const LEFT_KNEE = 25;
    const RIGHT_KNEE = 26;
    const LEFT_ANKLE = 27;
    const RIGHT_ANKLE = 28;

    // Calculate elbow angles
    this.currentLeftElbow = this.calculateAngle(
      landmarks[LEFT_SHOULDER],
      landmarks[LEFT_ELBOW],
      landmarks[LEFT_WRIST]
    );
    this.currentRightElbow = this.calculateAngle(
      landmarks[RIGHT_SHOULDER],
      landmarks[RIGHT_ELBOW],
      landmarks[RIGHT_WRIST]
    );

    // Calculate knee angles
    this.currentLeftKnee = this.calculateAngle(
      landmarks[LEFT_HIP],
      landmarks[LEFT_KNEE],
      landmarks[LEFT_ANKLE]
    );
    this.currentRightKnee = this.calculateAngle(
      landmarks[RIGHT_HIP],
      landmarks[RIGHT_KNEE],
      landmarks[RIGHT_ANKLE]
    );

    // Calculate hip angle
    this.currentHip = this.calculateAngle(
      landmarks[LEFT_SHOULDER],
      landmarks[LEFT_HIP],
      landmarks[LEFT_KNEE]
    );
  }

  private calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
    const radians =
      Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180) / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
  }

  private checkBodyVisibility(landmarks: Landmark[]): boolean {
    if (landmarks.length === 0) return false;
    const visibleCount = landmarks.filter((l) => l.visibility > 0.5).length;
    return visibleCount >= landmarks.length * 0.6;
  }

  private updateStateMachine(angle: number, bodyVisible: boolean): void {
    if (!bodyVisible) {
      return;
    }

    const previousState = this.state;

    switch (this.state) {
      case "ready":
        if (angle < this.topAngle + this.angleBuffer) {
          this.state = "descending";
        }
        break;

      case "descending":
        if (angle < this.bottomAngle + this.angleBuffer) {
          this.state = "bottom_confirmed";
        }
        break;

      case "bottom_confirmed":
        if (angle > this.bottomAngle + this.angleBuffer) {
          this.state = "ascending";
        }
        break;

      case "ascending":
        if (angle > this.topAngle - this.angleBuffer) {
          this.state = "top_confirmed";
          this.repCount++;
          this.formScore = this.calculateFormScore(angle);

          // Notify callback
          this.config.onRep?.({
            repCount: this.repCount,
            state: this.state,
            formScore: this.formScore,
            phase: { phase: "up", jointAngles: [], timestamp: Date.now(), frameIndex: 0 },
            timestamp: Date.now(),
            quality: this.formScore >= 0.8 ? "good" : this.formScore >= 0.6 ? "acceptable" : "poor",
          });

          // Enter cooldown if enabled
          if (this.config.enableCooldown !== false) {
            this.state = "cooldown";
            this.cooldownCounter = this.config.cooldownFrames || 10;
          } else {
            this.state = "ready";
          }
        }
        break;

      case "cooldown":
        this.cooldownCounter--;
        if (this.cooldownCounter <= 0) {
          this.state = "ready";
        }
        break;

      case "top_confirmed":
        this.state = "ready";
        break;
    }

    // Notify state change
    if (previousState !== this.state) {
      this.config.onStateChange?.(this.state);
    }
  }

  private calculateFormScore(angle: number): number {
    // Score based on how close to full extension at top
    const extensionPct = Math.min(1, angle / this.topAngle);
    const quality = 0.7 + extensionPct * 0.3;

    // Track form history
    this.formHistory.push(quality);
    if (this.formHistory.length > 10) {
      this.formHistory.shift();
    }

    // Return average form score
    if (this.formHistory.length > 0) {
      return this.formHistory.reduce((a, b) => a + b, 0) / this.formHistory.length;
    }

    return quality;
  }

  private getCurrentJointAngles(): JointAngle[] {
    const angles: JointAngle[] = [];

    if (this.config.activityType === "pushup") {
      angles.push({
        joint: "left_elbow",
        angle: this.currentLeftElbow,
        targetMin: this.bottomAngle,
        targetMax: this.topAngle,
        visibility: 1,
      });
      angles.push({
        joint: "right_elbow",
        angle: this.currentRightElbow,
        targetMin: this.bottomAngle,
        targetMax: this.topAngle,
        visibility: 1,
      });
    } else if (this.config.activityType === "lunge") {
      angles.push({
        joint: "front_knee",
        angle: this.currentLeftKnee,
        targetMin: this.bottomAngle,
        targetMax: this.topAngle,
        visibility: 1,
      });
      angles.push({
        joint: "rear_knee",
        angle: this.currentRightKnee,
        targetMin: this.bottomAngle,
        targetMax: this.topAngle,
        visibility: 1,
      });
      angles.push({
        joint: "torso_alignment",
        angle: this.currentHip,
        targetMin: 150,
        targetMax: 210,
        visibility: 1,
      });
    } else {
      angles.push({
        joint: "left_knee",
        angle: this.currentLeftKnee,
        targetMin: this.bottomAngle,
        targetMax: this.topAngle,
        visibility: 1,
      });
      angles.push({
        joint: "right_knee",
        angle: this.currentRightKnee,
        targetMin: this.bottomAngle,
        targetMax: this.topAngle,
        visibility: 1,
      });
      angles.push({
        joint: "hip",
        angle: this.currentHip,
        targetMin: 60,
        targetMax: 120,
        visibility: 1,
      });
    }

    return angles;
  }

  private generateFormSignals(): FormSignal[] {
    const signals: FormSignal[] = [];

    if (this.config.activityType === "pushup") {
      // Check elbow form
      const leftElbowDev = Math.abs(this.currentLeftElbow - 90);
      signals.push({
        joint: "left_elbow",
        angle: this.currentLeftElbow,
        targetAngle: 90,
        deviation: leftElbowDev,
        quality: leftElbowDev < 30 ? "good" : leftElbowDev < 60 ? "acceptable" : "poor",
        feedback: leftElbowDev >= 60 ? "Keep elbows closer to body" : undefined,
      });

      // Check body alignment (simplified)
      signals.push({
        joint: "body_alignment",
        angle: 180, // Would need more landmarks to calculate
        targetAngle: 180,
        deviation: 0,
        quality: "good",
      });
    } else if (this.config.activityType === "squat") {
      // Check knee form
      const leftKneeDev = Math.abs(this.currentLeftKnee - 90);
      signals.push({
        joint: "left_knee",
        angle: this.currentLeftKnee,
        targetAngle: 90,
        deviation: leftKneeDev,
        quality: leftKneeDev < 20 ? "good" : leftKneeDev < 40 ? "acceptable" : "poor",
        feedback: leftKneeDev >= 40 ? "Bend knees more" : undefined,
      });

      // Check hip form
      const hipDev = Math.abs(this.currentHip - 90);
      signals.push({
        joint: "hip",
        angle: this.currentHip,
        targetAngle: 90,
        deviation: hipDev,
        quality: hipDev < 30 ? "good" : hipDev < 60 ? "acceptable" : "poor",
        feedback: hipDev >= 60 ? "Keep chest up" : undefined,
      });
    } else if (this.config.activityType === "lunge") {
      // Front knee form
      const frontKneeDev = Math.abs(this.currentLeftKnee - 90);
      signals.push({
        joint: "front_knee",
        angle: this.currentLeftKnee,
        targetAngle: 90,
        deviation: frontKneeDev,
        quality: frontKneeDev < 20 ? "good" : frontKneeDev < 40 ? "acceptable" : "poor",
        feedback: frontKneeDev >= 40 ? "Bend front knee more" : undefined,
      });

      // Rear knee form
      const rearKneeDev = Math.abs(this.currentRightKnee - 90);
      signals.push({
        joint: "rear_knee",
        angle: this.currentRightKnee,
        targetAngle: 90,
        deviation: rearKneeDev,
        quality: rearKneeDev < 20 ? "good" : rearKneeDev < 40 ? "acceptable" : "poor",
        feedback: rearKneeDev >= 40 ? "Lower rear knee" : undefined,
      });

      // Torso alignment
      signals.push({
        joint: "torso_alignment",
        angle: this.currentHip,
        targetAngle: 180,
        deviation: Math.abs(this.currentHip - 180),
        quality: Math.abs(this.currentHip - 180) < 15 ? "good" : Math.abs(this.currentHip - 180) < 30 ? "acceptable" : "poor",
        feedback: Math.abs(this.currentHip - 180) >= 30 ? "Keep torso upright" : undefined,
      });
    }

    return signals;
  }

  private generateFeedback(angle: number, quality: "good" | "acceptable" | "poor"): string | undefined {
    const now = Date.now();
    if (now - this.lastFeedbackTime < this.FEEDBACK_COOLDOWN_MS) {
      return undefined;
    }

    let feedback: string | undefined;

    if (quality === "poor") {
      if (angle < this.bottomAngle) {
        feedback = "Go lower on the next rep";
      } else if (angle > this.topAngle) {
        feedback = "Extend fully at the top";
      } else {
        feedback = "Try to maintain better form";
      }
    } else if (quality === "good" && this.repCount > 0 && this.repCount % 5 === 0) {
      feedback = "Great form! Keep it up!";
    }

    if (feedback) {
      this.lastFeedbackTime = now;
      this.config.onFormFeedback?.(feedback);
    }

    return feedback;
  }
}