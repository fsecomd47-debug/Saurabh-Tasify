import type { VerificationState, VerificationEvent, MissionVerifierConfig } from "../types";
import type { MissionVerifier } from "../base";

type FocusSessionConfig = MissionVerifierConfig & {
  onTick?: (elapsed: number, remaining: number) => void;
  onPresenceChange?: (present: boolean) => void;
  checkpointIntervalMs?: number;
};

/**
 * §64: Adaptive checkpoint intervals based on mission duration.
 * Matches server-side getCheckpointConfig() logic.
 */
function getAdaptiveCheckpointMs(durationSeconds: number): number {
  if (durationSeconds <= 600) return durationSeconds * 1000; // ≤10min: single checkpoint at end
  if (durationSeconds <= 1800) return 300_000;  // 10-30min: every 5 min
  if (durationSeconds <= 3600) return 300_000;  // 30-60min: every 5 min
  return 600_000;                               // 1hr+: every 10 min (save battery)
}

/**
 * §64: Max missed checkpoints before mission is interrupted.
 */
function getMaxMissedCheckpoints(durationSeconds: number): number {
  if (durationSeconds <= 600) return 0;
  if (durationSeconds <= 1800) return 2;
  if (durationSeconds <= 3600) return 3;
  return 4;
}

/**
 * Client-side focus session manager.
 * Tracks time, presence (visibility API), and sends periodic checkpoints.
 * §64: Uses adaptive checkpoint intervals for long missions.
 */
export class FocusSession implements MissionVerifier {
  private state: VerificationState = "idle";
  private config: FocusSessionConfig;
  private listeners: Set<(state: VerificationState) => void> = new Set();

  private startedAt: number = 0;
  private elapsed: number = 0;
  private pausedAt: number = 0;
  private totalPausedMs: number = 0;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private checkpointInterval: ReturnType<typeof setInterval> | null = null;
  private cleanupVisibility: (() => void) | null = null;
  private presenceSamples: number = 0;
  private expectedSamples: number = 0;
  private interruptionCount: number = 0;
  private wasPresent: boolean = true;
  private events: VerificationEvent[] = [];
  private checkpointNumber: number = 0;
  private maxMissedCheckpoints: number = 0;
  private lastCheckpointAt: number = 0;

  constructor(config: FocusSessionConfig) {
    const durationSeconds = config.durationSeconds ?? 0;
    const adaptiveMs = getAdaptiveCheckpointMs(durationSeconds);
    this.config = {
      checkpointIntervalMs: adaptiveMs,
      ...config,
    };
    this.expectedSamples = durationSeconds > 0
      ? Math.ceil(durationSeconds / (adaptiveMs / 1000))
      : 10;
    this.maxMissedCheckpoints = getMaxMissedCheckpoints(durationSeconds);
  }

  getState(): VerificationState {
    return this.state;
  }

  subscribe(listener: (state: VerificationState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setState(state: VerificationState) {
    this.state = state;
    this.listeners.forEach((l) => l(state));
    this.config.onStateChange?.(state);
  }

  private emitEvent(type: string, metadata?: Record<string, unknown>) {
    const event: VerificationEvent = { type, timestamp: Date.now(), metadata };
    this.events.push(event);
    this.config.onEvent?.(event);
  }

  async start(): Promise<void> {
    if (this.state !== "idle") return;

    this.setState("starting");
    this.startedAt = Date.now();
    this.elapsed = 0;
    this.totalPausedMs = 0;
    this.presenceSamples = 0;
    this.interruptionCount = 0;
    this.checkpointNumber = 0;
    this.lastCheckpointAt = Date.now();
    this.events = [];

    // Start presence tracking
    this.setupPresenceTracking();

    // Start timer
    this.timerInterval = setInterval(() => {
      if (this.state !== "active") return;
      const now = Date.now();
      this.elapsed = (now - this.startedAt - this.totalPausedMs) / 1000;
      this.config.onTick?.(this.elapsed, Math.max(0, (this.config.durationSeconds ?? 0) - this.elapsed));
    }, 1000);

    // §64: Start checkpoint interval with adaptive timing
    this.checkpointInterval = setInterval(() => {
      if (this.state !== "active") return;

      const present = this.isBrowserVisible();
      this.presenceSamples++;
      this.checkpointNumber++;
      this.lastCheckpointAt = Date.now();

      this.emitEvent("SESSION_CHECKPOINT", {
        elapsed: this.elapsed,
        present,
        checkpointNumber: this.checkpointNumber,
        totalCheckpoints: this.expectedSamples,
      });
      this.config.onPresenceChange?.(present);
    }, this.config.checkpointIntervalMs);

    this.setState("active");
    this.emitEvent("SESSION_STARTED", {
      durationSeconds: this.config.durationSeconds,
      checkpointIntervalMs: this.config.checkpointIntervalMs,
      totalCheckpoints: this.expectedSamples,
    });
  }

  async pause(): Promise<void> {
    if (this.state !== "active") return;
    this.pausedAt = Date.now();
    this.setState("paused");
    this.emitEvent("SESSION_PAUSED", { elapsed: this.elapsed });
  }

  async resume(): Promise<void> {
    if (this.state !== "paused") return;
    this.totalPausedMs += Date.now() - this.pausedAt;
    this.setState("active");
    this.emitEvent("SESSION_RESUMED", { elapsed: this.elapsed });
  }

  async stop(): Promise<void> {
    this.cleanup();
    if (this.state === "paused" || this.state === "active") {
      this.emitEvent("SESSION_COMPLETED", { elapsed: this.elapsed });
    }
    this.setState("completed");
  }

  async finalize(): Promise<{
    status: "passed" | "failed" | "uncertain";
    confidence: number;
    evidence: { duration: number; presenceSamples: number; checkpointsCompleted: number; totalCheckpoints: number };
    reasonCode: string;
  }> {
    this.cleanup();

    const targetSeconds = this.config.durationSeconds ?? 0;
    const actualSeconds = this.elapsed;

    // Calculate confidence
    const durationPct = targetSeconds > 0 ? Math.min(1, actualSeconds / targetSeconds) : 0;
    const presencePct = this.expectedSamples > 0
      ? Math.min(1, this.presenceSamples / this.expectedSamples)
      : 0.5;
    const interruptionPenalty = Math.max(0, 1 - this.interruptionCount * 0.1);
    const confidence = Math.min(1, durationPct * 0.4 + presencePct * 0.4 + interruptionPenalty * 0.2);

    let status: "passed" | "failed" | "uncertain" = "failed";
    let reasonCode = "INSUFFICIENT_DURATION";

    if (confidence >= 0.75) {
      status = "passed";
      reasonCode = "FOCUS_SESSION_VERIFIED";
    } else if (confidence >= 0.45) {
      status = "uncertain";
      reasonCode = "PARTIAL_VERIFICATION";
    }

    return {
      status,
      confidence,
      evidence: {
        duration: actualSeconds,
        presenceSamples: this.presenceSamples,
        checkpointsCompleted: this.checkpointNumber,
        totalCheckpoints: this.expectedSamples,
      },
      reasonCode,
    };
  }

  private setupPresenceTracking() {
    const handleVisibility = () => {
      const visible = this.isBrowserVisible();
      if (this.wasPresent && !visible) {
        this.interruptionCount++;
      }
      this.wasPresent = visible;
    };

    document.addEventListener("visibilitychange", handleVisibility);
    this.cleanupVisibility = () => document.removeEventListener("visibilitychange", handleVisibility);
  }

  private isBrowserVisible(): boolean {
    return typeof document !== "undefined" ? !document.hidden : true;
  }

  cleanup() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.checkpointInterval) clearInterval(this.checkpointInterval);
    if (this.cleanupVisibility) this.cleanupVisibility();
    this.timerInterval = null;
    this.checkpointInterval = null;
  }

  getElapsed(): number {
    return this.elapsed;
  }

  getCheckpointNumber(): number {
    return this.checkpointNumber;
  }

  getTotalCheckpoints(): number {
    return this.expectedSamples;
  }

  getEvents(): VerificationEvent[] {
    return [...this.events];
  }
}
