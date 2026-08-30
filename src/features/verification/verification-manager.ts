"use client";

/**
 * PDR-4.1 §56-58: Client-side VerificationManager
 * Coordinates verification providers and manages the verification lifecycle.
 * One mission → one verification session → one active provider.
 */

import type { MissionDTO } from "@/server/services/mission-service";

export type VerificationMode = MissionDTO["verificationMode"];

export type VerificationPhase =
  | "idle"
  | "consent"
  | "camera-check"
  | "countdown"
  | "active"
  | "paused"
  | "completing"
  | "completed"
  | "failed";

export type VerificationSnapshot = {
  phase: VerificationPhase;
  progress: number;
  elapsed: number;
  remaining: number;
  repCount: number;
  targetReps: number;
  presence: boolean;
  cameraReady: boolean;
  formFeedback: string | null;
  error: string | null;
};

export type VerificationCallbacks = {
  onPhaseChange?: (phase: VerificationPhase) => void;
  onProgress?: (snapshot: VerificationSnapshot) => void;
  onComplete?: (result: VerificationCompleteResult) => void;
  onError?: (error: string) => void;
};

export type VerificationCompleteResult = {
  duration?: number;
  reps?: number;
  confidence: number;
  metadata?: Record<string, unknown>;
};

/**
 * Determine if a verification mode requires camera.
 * §18/§65-66: Camera appears ONLY if policy.requiresCamera === true.
 * Focus missions verify via timer + presence signals — never a forced
 * webcam. Only movement verification uses the camera.
 */
export function requiresCamera(mode: VerificationMode): boolean {
  return mode === "pose" || mode === "repetition";
}

/**
 * Determine if a verification mode requires photo capture.
 */
export function requiresPhoto(mode: VerificationMode): boolean {
  return mode === "photo" || mode === "evidence";
}

/**
 * Focus never requires camera (§66) — optional presence camera is a
 * future opt-in feature, not a requirement.
 */
export function isCameraOptional(mode: VerificationMode): boolean {
  return false;
}

/**
 * Get the camera mode string for camera permission screens.
 * Only movement verification reaches this path.
 */
export function getCameraMode(mode: VerificationMode): "pose" {
  return "pose";
}

/**
 * VerificationManager coordinates the verification lifecycle for a mission.
 * §55: One reusable camera mission view, not every mission creating its own.
 */
export class VerificationManager {
  private mission: MissionDTO;
  private callbacks: VerificationCallbacks;
  private _phase: VerificationPhase = "idle";
  private _snapshot: VerificationSnapshot;

  constructor(mission: MissionDTO, callbacks: VerificationCallbacks = {}) {
    this.mission = mission;
    this.callbacks = callbacks;
    this._snapshot = {
      phase: "idle",
      progress: 0,
      elapsed: 0,
      remaining: mission.durationSeconds ?? 0,
      repCount: 0,
      targetReps: mission.targetRepetitions ?? 0,
      presence: true,
      cameraReady: false,
      formFeedback: null,
      error: null,
    };
  }

  get phase(): VerificationPhase {
    return this._phase;
  }

  get snapshot(): Readonly<VerificationSnapshot> {
    return { ...this._snapshot };
  }

  /**
   * Transition to a new phase.
   */
  private setPhase(phase: VerificationPhase): void {
    this._phase = phase;
    this._snapshot.phase = phase;
    this.callbacks.onPhaseChange?.(phase);
    this.callbacks.onProgress?.({ ...this._snapshot });
  }

  /**
   * Update snapshot and notify.
   */
  private updateSnapshot(partial: Partial<VerificationSnapshot>): void {
    Object.assign(this._snapshot, partial);
    this.callbacks.onProgress?.({ ...this._snapshot });
  }

  /**
   * Begin the verification flow.
   * Routes to camera consent or direct start based on verification mode.
   */
  async begin(): Promise<void> {
    if (requiresCamera(this.mission.verificationMode)) {
      this.setPhase("consent");
    } else {
      await this.start();
    }
  }

  /**
   * User granted camera permission — proceed to camera check.
   */
  async onCameraConsent(): Promise<void> {
    this.setPhase("camera-check");
  }

  /**
   * Camera check passed — start the verification.
   */
  async onCameraReady(): Promise<void> {
    this.updateSnapshot({ cameraReady: true });
    await this.start();
  }

  /**
   * Start the actual verification activity.
   */
  private async start(): Promise<void> {
    this.setPhase("countdown");

    // Countdown 3-2-1
    for (let i = 3; i > 0; i--) {
      this.updateSnapshot({ formFeedback: `${i}` });
      await new Promise((r) => setTimeout(r, 1000));
    }
    this.updateSnapshot({ formFeedback: null });

    this.setPhase("active");
  }

  /**
   * Pause the verification (if supported).
   */
  pause(): void {
    if (this._phase === "active") {
      this.setPhase("paused");
    }
  }

  /**
   * Resume from pause.
   */
  resume(): void {
    if (this._phase === "paused") {
      this.setPhase("active");
    }
  }

  /**
   * Update elapsed time (called by timer ticks).
   */
  updateElapsed(elapsed: number): void {
    const remaining = Math.max(0, (this.mission.durationSeconds ?? 0) - elapsed);
    const progress = this.mission.durationSeconds
      ? Math.min(1, elapsed / this.mission.durationSeconds)
      : 0;
    this.updateSnapshot({ elapsed, remaining, progress });
  }

  /**
   * Update rep count (called by pose engine).
   */
  updateReps(reps: number, formFeedback?: string): void {
    const progress = this._snapshot.targetReps
      ? Math.min(1, reps / this._snapshot.targetReps)
      : 0;
    this.updateSnapshot({ repCount: reps, progress, formFeedback: formFeedback ?? null });
  }

  /**
   * Update presence status.
   */
  updatePresence(present: boolean): void {
    this.updateSnapshot({ presence: present });
  }

  /**
   * Complete the verification successfully.
   */
  async complete(result: VerificationCompleteResult): Promise<void> {
    this.setPhase("completing");
    this.updateSnapshot({ progress: 1 });
    this.callbacks.onComplete?.(result);
    this.setPhase("completed");
  }

  /**
   * Fail the verification.
   */
  fail(error: string): void {
    this.updateSnapshot({ error });
    this.setPhase("failed");
    this.callbacks.onError?.(error);
  }

  /**
   * Cancel the verification.
   */
  cancel(): void {
    this.setPhase("failed");
    this.callbacks.onError?.("USER_CANCELLED");
  }

  /**
   * Clean up resources.
   */
  cleanup(): void {
    this._phase = "idle";
  }
}
