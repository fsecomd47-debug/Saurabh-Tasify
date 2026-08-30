/**
 * PDR-4.1 §27-31: FocusTimerProvider
 * Focus session verification: duration + presence + continuity.
 * Tracks page visibility, session continuity, optional presence.
 */

import type {
  VerificationProvider,
  VerificationState,
  VerificationResult,
} from "@/server/verification/provider-interface";
import type { MissionContract } from "@/server/ai/provider";
import type { VerificationMode } from "@/types";

type FocusMetrics = {
  totalDurationMs: number;
  activeDurationMs: number;
  pauseCount: number;
  pauseDurationMs: number;
  visibilityChanges: number;
  backgroundTimeMs: number;
  continuousBlocks: number;
  presenceSamples: number;
};

export class FocusTimerProvider implements VerificationProvider {
  readonly name = "focus-timer";
  readonly supportedModes: VerificationMode[] = ["focus"];

  private state: VerificationState = {
    status: "initializing",
    progress: 0,
    confidence: 0,
    metrics: {},
  };

  private mission: MissionContract | null = null;
  private startTime: number = 0;
  private pauseTime: number = 0;
  private totalPauseMs: number = 0;
  private isPaused: boolean = false;
  private metrics: FocusMetrics = {
    totalDurationMs: 0,
    activeDurationMs: 0,
    pauseCount: 0,
    pauseDurationMs: 0,
    visibilityChanges: 0,
    backgroundTimeMs: 0,
    continuousBlocks: 0,
    presenceSamples: 0,
  };

  private visibilityHandler: (() => void) | null = null;
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;

  supports(mission: { verificationMode: VerificationMode }): boolean {
    return mission.verificationMode === "focus";
  }

  async initialize(mission: MissionContract): Promise<void> {
    this.mission = mission;
    this.state = {
      status: "initializing",
      progress: 0,
      confidence: 0,
      metrics: {},
    };
    this.metrics = {
      totalDurationMs: 0,
      activeDurationMs: 0,
      pauseCount: 0,
      pauseDurationMs: 0,
      visibilityChanges: 0,
      backgroundTimeMs: 0,
      continuousBlocks: 0,
      presenceSamples: 0,
    };
    this.totalPauseMs = 0;
    this.isPaused = false;
  }

  async start(): Promise<void> {
    this.startTime = Date.now();
    this.state.status = "active";

    // Track page visibility
    if (typeof document !== "undefined") {
      this.visibilityHandler = () => {
        if (document.hidden) {
          this.metrics.visibilityChanges++;
          this.metrics.backgroundTimeMs += 1000;
        } else {
          this.metrics.visibilityChanges++;
        }
      };
      document.addEventListener("visibilitychange", this.visibilityHandler);
    }

    // Health check at 5Hz for progress updates
    this.healthCheckInterval = setInterval(() => {
      this.updateProgress();
    }, 200);
  }

  async pause(): Promise<void> {
    if (this.isPaused) return;
    this.isPaused = true;
    this.pauseTime = Date.now();
    this.metrics.pauseCount++;
    this.state.status = "paused";
  }

  async resume(): Promise<void> {
    if (!this.isPaused) return;
    const pauseDuration = Date.now() - this.pauseTime;
    this.totalPauseMs += pauseDuration;
    this.metrics.pauseDurationMs += pauseDuration;
    this.isPaused = false;
    this.state.status = "active";
  }

  async stop(): Promise<void> {
    this.cleanup();
    this.state.status = "stopped";
  }

  getCurrentState(): VerificationState {
    return { ...this.state };
  }

  async finalize(): Promise<VerificationResult> {
    this.cleanup();

    const targetMs = (this.mission?.durationSeconds ?? 0) * 1000;
    const elapsed = Date.now() - this.startTime - this.totalPauseMs;
    this.metrics.totalDurationMs = elapsed;
    this.metrics.activeDurationMs = elapsed;

    // Calculate focus score
    const durationRatio = targetMs > 0 ? Math.min(1, elapsed / targetMs) : 0;
    const pausePenalty = this.metrics.pauseCount > 3 ? 0.85 : 1;
    const backgroundPenalty = this.metrics.backgroundTimeMs > 30000 ? 0.8 : 1;
    const confidence = Math.min(0.95, durationRatio * pausePenalty * backgroundPenalty);

    let status: "passed" | "failed" | "uncertain";
    let reasonCode: string;

    if (confidence >= 0.7) {
      status = "passed";
      reasonCode = "FOCUS_SESSION_COMPLETED";
    } else if (confidence >= 0.4) {
      status = "uncertain";
      reasonCode = "FOCUS_SESSION_INCOMPLETE";
    } else {
      status = "failed";
      reasonCode = "FOCUS_SESSION_INSUFFICIENT";
    }

    const confidenceClass = confidence >= 0.7 ? "high" : confidence >= 0.4 ? "medium" : "low";

    return {
      status,
      evidenceType: "focus_session",
      confidenceClass,
      confidenceScore: confidence,
      metrics: {
        durationMs: elapsed,
        targetMs,
        pauseCount: this.metrics.pauseCount,
        pauseDurationMs: this.metrics.pauseDurationMs,
        visibilityChanges: this.metrics.visibilityChanges,
        backgroundTimeMs: this.metrics.backgroundTimeMs,
      },
      reasonCode,
    };
  }

  private updateProgress(): void {
    if (this.isPaused || !this.mission) return;

    const elapsed = Date.now() - this.startTime - this.totalPauseMs;
    const targetMs = (this.mission.durationSeconds ?? 0) * 1000;
    const progress = targetMs > 0 ? Math.min(1, elapsed / targetMs) : 0;

    this.state = {
      ...this.state,
      progress,
      confidence: progress * 0.8,
      metrics: {
        elapsedMs: elapsed,
        targetMs,
        pauseCount: this.metrics.pauseCount,
      },
      message: this.formatTime(targetMs - elapsed),
    };
  }

  private formatTime(remainingMs: number): string {
    const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  private cleanup(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    if (this.visibilityHandler && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }
}
