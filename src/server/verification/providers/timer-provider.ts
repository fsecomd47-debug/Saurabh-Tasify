/**
 * PDR-4.2 §27-31: TimerProvider
 * Simple timer verification for timed missions (e.g., plank, exercise).
 * Tracks elapsed time, pauses, and continuity.
 * Unlike FocusTimerProvider, this is for fixed-duration activities
 * that don't require presence tracking.
 */

import type {
  VerificationProvider,
  VerificationState,
  VerificationResult,
} from "@/server/verification/provider-interface";
import type { MissionContract } from "@/server/ai/provider";
import type { VerificationMode } from "@/types";

type TimerMetrics = {
  totalDurationMs: number;
  activeDurationMs: number;
  pauseCount: number;
  pauseDurationMs: number;
  continuityScore: number;
};

export class TimerProvider implements VerificationProvider {
  readonly name = "timer";
  readonly supportedModes: VerificationMode[] = ["timed"];

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
  private metrics: TimerMetrics = {
    totalDurationMs: 0,
    activeDurationMs: 0,
    pauseCount: 0,
    pauseDurationMs: 0,
    continuityScore: 1,
  };

  private progressInterval: ReturnType<typeof setInterval> | null = null;

  supports(mission: { verificationMode: VerificationMode }): boolean {
    return mission.verificationMode === "timed";
  }

  async initialize(mission: MissionContract): Promise<void> {
    this.mission = mission;
    this.metrics = {
      totalDurationMs: 0,
      activeDurationMs: 0,
      pauseCount: 0,
      pauseDurationMs: 0,
      continuityScore: 1,
    };
    this.totalPauseMs = 0;
    this.isPaused = false;

    this.state = {
      status: "initializing",
      progress: 0,
      confidence: 0,
      metrics: {},
    };
  }

  async start(): Promise<void> {
    this.startTime = Date.now();
    this.state.status = "active";

    this.progressInterval = setInterval(() => {
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

    const durationRatio = targetMs > 0 ? Math.min(1, elapsed / targetMs) : 0;
    const pausePenalty = this.metrics.pauseCount > 5 ? 0.85 : 1;
    const confidence = Math.min(0.95, durationRatio * pausePenalty);

    let status: "passed" | "failed" | "uncertain";
    let reasonCode: string;

    if (confidence >= 0.7) {
      status = "passed";
      reasonCode = "TIMER_COMPLETED";
    } else if (confidence >= 0.4) {
      status = "uncertain";
      reasonCode = "TIMER_INCOMPLETE";
    } else {
      status = "failed";
      reasonCode = "TIMER_INSUFFICIENT";
    }

    const confidenceClass = confidence >= 0.7 ? "high" : confidence >= 0.4 ? "medium" : "low";

    return {
      status,
      evidenceType: "timer",
      confidenceClass,
      confidenceScore: confidence,
      metrics: {
        durationMs: elapsed,
        targetMs,
        pauseCount: this.metrics.pauseCount,
        pauseDurationMs: this.metrics.pauseDurationMs,
        continuityScore: this.metrics.continuityScore,
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
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }
}
