/**
 * PDR-4.2 §37: Lunge Repetition Engine
 * STANDING → LUNGE_DOWN → DEPTH_CONFIRMED → LUNGE_UP → STANDING = VALID REP
 * Tracks front knee angle, rear knee angle, hip alignment.
 */

import type {
  PoseLandmarks,
  FormSignals,
  RepetitionContext,
  RepetitionObservation,
  RepetitionResult,
} from "../types";
import {
  JitterFilter,
  calculateAngle,
  calculateBodyAlignment,
  calculateSymmetry,
  midpoint,
} from "./repetition-engine";

type LungeState = "standing" | "descending" | "depth_confirmed" | "ascending";

/**
 * Calculate lunge depth based on knee angles.
 * Returns 0-1 where 0 = standing, 1 = deep lunge.
 */
function calculateLungeDepth(landmarks: PoseLandmarks): number {
  const leftKneeAngle = calculateAngle(landmarks.leftHip, landmarks.leftKnee, landmarks.leftAnkle);
  const rightKneeAngle = calculateAngle(landmarks.rightHip, landmarks.rightKnee, landmarks.rightAnkle);

  // In a lunge, one knee bends more than the other
  const minKneeAngle = Math.min(leftKneeAngle, rightKneeAngle);
  // Map 170° (standing) to 0, 90° (deep lunge) to 1
  const depth = Math.max(0, Math.min(1, (170 - minKneeAngle) / 80));
  return depth;
}

/**
 * Calculate lunge-specific alignment.
 * Checks if the torso is upright and hips are square.
 */
function calculateLungeAlignment(landmarks: PoseLandmarks): number {
  const bodyAlignment = calculateBodyAlignment(landmarks);

  // Additional check: hip squareness
  const leftHip = landmarks.leftHip;
  const rightHip = landmarks.rightHip;
  const hipWidth = Math.abs(leftHip.x - rightHip.x);
  const hipDepth = Math.abs(leftHip.z - rightHip.z);
  const squareness = hipWidth > 0.01 ? 1 - Math.min(1, hipDepth / hipWidth) : 0.5;

  return (bodyAlignment + squareness) / 2;
}

export class LungeRepetitionEngine {
  private context: RepetitionContext | null = null;
  private state: LungeState = "standing";
  private count = 0;
  private invalidCount = 0;
  private jitterFilter = new JitterFilter(0.4);
  private repTimestamps: number[] = [];
  private lastStateChange = 0;
  private lastRepTime = 0;
  private currentFormSignals: FormSignals = {};

  private depthThreshold = 0.6;
  private cooldownMs = 400;
  private minRepDurationMs = 1200;
  private maxRepDurationMs = 6000;

  initialize(context: RepetitionContext): void {
    this.context = context;
    this.state = "standing";
    this.count = 0;
    this.invalidCount = 0;
    this.repTimestamps = [];
    this.lastStateChange = Date.now();
    if (context.depthThreshold) this.depthThreshold = context.depthThreshold;
    if (context.cooldownMs) this.cooldownMs = context.cooldownMs;
    if (context.minRepDurationMs) this.minRepDurationMs = context.minRepDurationMs;
    if (context.maxRepDurationMs) this.maxRepDurationMs = context.maxRepDurationMs;
  }

  update(landmarks: PoseLandmarks, timestamp: number): RepetitionObservation {
    const filtered = this.jitterFilter.filterLandmarks(landmarks);
    const depth = calculateLungeDepth(filtered);
    const alignment = calculateLungeAlignment(filtered);
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
      targetCount: this.context?.targetReps ?? 12,
      formSignals: { ...this.currentFormSignals },
      state: this.state,
      message: this.getFeedback(),
    };
  }

  getCount(): number { return this.count; }
  getSignals(): FormSignals { return { ...this.currentFormSignals }; }

  finalize(): RepetitionResult {
    const durations: number[] = [];
    for (let i = 1; i < this.repTimestamps.length; i++) {
      durations.push(this.repTimestamps[i] - this.repTimestamps[i - 1]);
    }
    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    return {
      validReps: this.count,
      invalidReps: this.invalidCount,
      targetReps: this.context?.targetReps ?? 12,
      formScore: this.count / (this.count + this.invalidCount || 1),
      formSignals: { ...this.currentFormSignals },
      averageRepDuration: avgDuration,
      consistency: this.calculateConsistency(durations),
    };
  }

  reset(): void {
    this.state = "standing";
    this.count = 0;
    this.invalidCount = 0;
    this.repTimestamps = [];
    this.jitterFilter.reset();
  }

  private calculateConsistency(durations: number[]): number {
    if (durations.length < 2) return 1;
    const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
    const variance = durations.reduce((sum, d) => sum + (d - mean) ** 2, 0) / durations.length;
    const cv = Math.sqrt(variance) / mean;
    return Math.max(0, 1 - cv);
  }

  private getFeedback(): string {
    if (this.currentFormSignals.alignment !== undefined && this.currentFormSignals.alignment < 0.5) {
      return "Keep your torso upright";
    }
    if (this.state === "depth_confirmed") {
      return "Good depth!";
    }
    if (this.count >= (this.context?.targetReps ?? 12)) {
      return `${this.count}/${this.context?.targetReps ?? 12} — Nice work!`;
    }
    return `${this.count}/${this.context?.targetReps ?? 12}`;
  }
}
