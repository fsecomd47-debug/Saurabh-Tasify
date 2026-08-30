"use client";

/**
 * PDR-4 §21: Verification Orchestrator
 * Coordinates verification providers, manages lifecycle, aggregates observations.
 * The orchestrator does NOT settle wallet rewards — that's server-side.
 *
 * Architecture:
 * Mission Contract → Orchestrator → Provider Selection → Lifecycle → Observations → Result
 */

import { CameraSession, type CameraHealth, type CameraIssue } from "./camera/camera-session";
import { FocusSession } from "./focus/focus-session";
import type { VerificationState, VerificationEvent, MissionVerifierConfig } from "./types";
import type { MissionDTO } from "@/server/services/mission-service";

// ============================================================================
// Types
// ============================================================================

export type OrchestratorPhase =
  | "idle"
  | "preparing"
  | "camera-requesting"
  | "camera-check"
  | "calibrating"
  | "active"
  | "paused"
  | "completing"
  | "completed"
  | "failed"
  | "error";

export type OrchestratorSnapshot = {
  phase: OrchestratorPhase;
  progress: number;
  elapsed: number;
  remaining: number;
  repCount: number;
  targetReps: number;
  presence: boolean;
  cameraReady: boolean;
  cameraHealth: CameraHealth | null;
  cameraIssue: CameraIssue;
  formFeedback: string | null;
  error: string | null;
  canPause: boolean;
  canResume: boolean;
  verificationMode: string;
};

export type OrchestratorCallbacks = {
  onPhaseChange?: (phase: OrchestratorPhase) => void;
  onSnapshot?: (snapshot: OrchestratorSnapshot) => void;
  onComplete?: (result: OrchestratorResult) => void;
  onError?: (error: string) => void;
  onEvent?: (event: VerificationEvent) => void;
};

export type OrchestratorResult = {
  status: "passed" | "failed" | "uncertain";
  confidence: number;
  evidence: {
    duration?: number;
    repetitions?: number;
    presenceSamples?: number;
    formScore?: number;
  };
  reasonCode: string;
  metadata?: Record<string, unknown>;
};

// ============================================================================
// Verification Orchestrator
// ============================================================================

export class VerificationOrchestrator {
  private mission: MissionDTO;
  private callbacks: OrchestratorCallbacks;
  private _phase: OrchestratorPhase = "idle";
  private _snapshot: OrchestratorSnapshot;

  // Sub-sessions
  private cameraSession: CameraSession | null = null;
  private focusSession: FocusSession | null = null;

  // Timing
  private startedAt: number = 0;
  private elapsedBase: number = 0;
  private pausedAt: number = 0;
  private totalPausedMs: number = 0;
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  // Pose tracking
  private repTimestamps: number[] = [];
  private repQualities: number[] = [];
  private completed = false;

  constructor(mission: MissionDTO, callbacks: OrchestratorCallbacks = {}) {
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
      cameraHealth: null,
      cameraIssue: null,
      formFeedback: null,
      error: null,
      canPause: false,
      canResume: false,
      verificationMode: mission.verificationMode,
    };
  }

  get phase(): OrchestratorPhase {
    return this._phase;
  }

  get snapshot(): Readonly<OrchestratorSnapshot> {
    return { ...this._snapshot };
  }

  // ─── Phase Management ───────────────────────────────

  private setPhase(phase: OrchestratorPhase): void {
    this._phase = phase;
    this._snapshot.phase = phase;
    this._snapshot.canPause = phase === "active";
    this._snapshot.canResume = phase === "paused";
    this.callbacks.onPhaseChange?.(phase);
    this.emitSnapshot();
  }

  private emitSnapshot(): void {
    this.callbacks.onSnapshot?.({ ...this._snapshot });
  }

  private updateSnapshot(partial: Partial<OrchestratorSnapshot>): void {
    Object.assign(this._snapshot, partial);
    this.emitSnapshot();
  }

  private emitEvent(type: string, metadata?: Record<string, unknown>): void {
    const event: VerificationEvent = { type, timestamp: Date.now(), metadata };
    this.callbacks.onEvent?.(event);
  }

  // ─── Camera Lifecycle ───────────────────────────────

  async requestCamera(video: HTMLVideoElement): Promise<void> {
    if (this._phase !== "idle" && this._phase !== "preparing") return;

    this.setPhase("camera-requesting");

    const session = CameraSession.tryAcquire();
    if (!session) {
      this.fail("Another camera session is active.");
      return;
    }
    this.cameraSession = session;

    session.onHealth((health: CameraHealth, issue: CameraIssue) => {
      this.updateSnapshot({ cameraHealth: health, cameraIssue: issue });
      if (!health.healthy && this._phase === "active") {
        this.updateSnapshot({
          formFeedback: issue === "SCENE_DARK"
            ? "Improve lighting so your movement is visible."
            : issue === "FROZEN_FRAME"
              ? "The camera feed froze. Try switching cameras."
              : "Camera issue detected.",
        });
      }
    });

    try {
      await session.start(video, {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 480 },
      });
      this.setPhase("camera-check");
      this.updateSnapshot({ cameraReady: true });
    } catch (err) {
      const code = (err as Error & { issue?: CameraIssue }).issue ?? "PERMISSION_DENIED";
      const message =
        code === "PERMISSION_DENIED"
          ? "Camera permission was denied."
          : code === "NO_DEVICE"
            ? "No camera was found."
            : "Camera could not start.";
      this.fail(message);
    }
  }

  async releaseCamera(): Promise<void> {
    if (this.cameraSession) {
      await this.cameraSession.stop();
      this.cameraSession = null;
    }
    this.updateSnapshot({ cameraReady: false, cameraHealth: null });
  }

  // ─── Focus Session Lifecycle ────────────────────────

  async startFocusSession(): Promise<void> {
    if (this._phase !== "idle" && this._phase !== "preparing") return;

    this.setPhase("preparing");

    this.focusSession = new FocusSession({
      missionId: this.mission.id,
      durationSeconds: this.mission.durationSeconds ?? undefined,
      onStateChange: (state: VerificationState) => {
        // Map focus state to orchestrator events
      },
      onEvent: (event: VerificationEvent) => {
        this.emitEvent(event.type, event.metadata);
      },
    });

    await this.focusSession.start();
    this.startedAt = Date.now();
    this.totalPausedMs = 0;
    this.elapsedBase = 0;
    this.setPhase("active");
    this.startTick();
    this.emitEvent("SESSION_STARTED", { durationSeconds: this.mission.durationSeconds });
  }

  // ─── Active Mission Lifecycle ───────────────────────

  async startActive(): Promise<void> {
    this.startedAt = Date.now();
    this.totalPausedMs = 0;
    this.elapsedBase = 0;
    this.repTimestamps = [];
    this.repQualities = [];
    this.completed = false;
    this.setPhase("active");
    this.startTick();
    this.emitEvent("SESSION_STARTED", { mode: this.mission.verificationMode });
    if (this.cameraSession) {
      this.cameraSession.markActive();
    }
  }

  // ─── Timer Tick ─────────────────────────────────────

  private startTick(): void {
    this.tickInterval = setInterval(() => {
      if (this._phase !== "active") return;
      const elapsed = this.getElapsed();
      const remaining = Math.max(0, (this.mission.durationSeconds ?? 0) - elapsed);
      const progress = this.mission.durationSeconds
        ? Math.min(1, elapsed / this.mission.durationSeconds)
        : 0;
      this.updateSnapshot({ elapsed, remaining, progress });

      // Auto-complete for timed missions
      if (this.mission.durationSeconds && elapsed >= this.mission.durationSeconds) {
        this.completeMission();
      }
    }, 1000);
  }

  private stopTick(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  private getElapsed(): number {
    if (this.startedAt === 0) return 0;
    const now = this._phase === "paused" ? this.pausedAt : Date.now();
    return Math.max(0, Math.round((now - this.startedAt - this.totalPausedMs) / 1000));
  }

  // ─── Pause / Resume ─────────────────────────────────

  pause(): void {
    if (this._phase !== "active") return;
    this.pausedAt = Date.now();
    this.setPhase("paused");
    this.emitEvent("SESSION_PAUSED", { elapsedSeconds: this.getElapsed() });
  }

  resume(): void {
    if (this._phase !== "paused") return;
    this.totalPausedMs += Date.now() - this.pausedAt;
    this.setPhase("active");
    this.emitEvent("SESSION_RESUMED", {});
  }

  // ─── Rep Tracking (for pose missions) ───────────────

  recordRep(repCount: number, quality: number, formFeedback?: string): void {
    this.repTimestamps.push(Date.now());
    this.repQualities.push(quality);
    this.updateSnapshot({
      repCount,
      progress: this._snapshot.targetReps
        ? Math.min(1, repCount / this._snapshot.targetReps)
        : 0,
      formFeedback: formFeedback ?? this._snapshot.formFeedback,
    });

    if (repCount % 3 === 0 || repCount === this._snapshot.targetReps) {
      this.emitEvent("REP_CONFIRMED", { count: repCount, quality });
    }

    if (this._snapshot.targetReps > 0 && repCount >= this._snapshot.targetReps) {
      this.completeMission();
    }
  }

  // ─── Presence Update ────────────────────────────────

  updatePresence(present: boolean): void {
    this.updateSnapshot({ presence: present });
    if (!present && this._phase === "active") {
      this.emitEvent("INTERRUPTION", { atSecond: this.getElapsed() });
    }
  }

  // ─── Form Feedback ──────────────────────────────────

  updateFormFeedback(feedback: string | null): void {
    this.updateSnapshot({ formFeedback: feedback });
  }

  // ─── Completion ─────────────────────────────────────

  async completeMission(): Promise<void> {
    if (this.completed) return;
    this.completed = true;
    this.stopTick();

    this.setPhase("completing");

    const elapsed = this.getElapsed();
    const reps = this._snapshot.repCount;
    const avgQuality =
      this.repQualities.length > 0
        ? this.repQualities.reduce((s, q) => s + q, 0) / this.repQualities.length
        : 0.8;

    // Build result based on verification mode
    let result: OrchestratorResult;

    if (this.mission.verificationMode === "focus" || this.mission.verificationMode === "timed") {
      const targetSeconds = this.mission.durationSeconds ?? 0;
      const durationPct = targetSeconds > 0 ? Math.min(1, elapsed / targetSeconds) : 0;
      const confidence = Math.min(0.95, 0.5 + durationPct * 0.45);

      result = {
        status: confidence >= 0.65 ? "passed" : "uncertain",
        confidence,
        evidence: { duration: elapsed, presenceSamples: 0 },
        reasonCode: confidence >= 0.65 ? "SESSION_VERIFIED" : "PARTIAL_SESSION",
        metadata: { elapsed, target: targetSeconds },
      };
    } else if (this.mission.verificationMode === "pose" || this.mission.verificationMode === "repetition") {
      const targetReps = this._snapshot.targetReps;
      const repPct = targetReps > 0 ? Math.min(1, reps / targetReps) : 0;
      const confidence = Math.min(0.95, 0.55 + avgQuality * 0.4);

      result = {
        status: repPct >= 1 ? "passed" : "uncertain",
        confidence,
        evidence: { repetitions: reps, duration: elapsed, formScore: avgQuality },
        reasonCode: repPct >= 1 ? "REPETITION_VERIFIED" : "INCOMPLETE_REPS",
        metadata: {
          targetReps,
          actualReps: reps,
          averageRepQuality: Math.round(avgQuality * 1000) / 1000,
          repTimestampCount: this.repTimestamps.length,
        },
      };
    } else {
      // Default: pass with moderate confidence
      result = {
        status: "passed",
        confidence: 0.7,
        evidence: { duration: elapsed },
        reasonCode: "MISSION_COMPLETED",
        metadata: {},
      };
    }

    // Release camera
    await this.releaseCamera();

    this.setPhase("completed");
    this.callbacks.onComplete?.(result);
  }

  // ─── Failure ────────────────────────────────────────

  fail(error: string): void {
    this.stopTick();
    this.updateSnapshot({ error });
    this.setPhase("failed");
    this.callbacks.onError?.(error);
  }

  // ─── Cancel ─────────────────────────────────────────

  async cancel(): Promise<void> {
    this.stopTick();
    await this.releaseCamera();
    this.setPhase("failed");
    this.callbacks.onError?.("USER_CANCELLED");
  }

  // ─── Cleanup ────────────────────────────────────────

  async dispose(): Promise<void> {
    this.stopTick();
    await this.releaseCamera();
    if (this.focusSession) {
      this.focusSession.cleanup();
      this.focusSession = null;
    }
    this._phase = "idle";
  }
}
