/**
 * PDR-4.2 §25-34: PoseProvider
 * Advanced pose verification using RepetitionEngine.
 * Handles pushups, squats, lunges with form signals.
 */

import type { VisionProvider } from "../provider-interface";
import type {
  VisionProviderType,
  VisionContext,
  VisionInput,
  VisionObservation,
  VisionResult,
  PoseLandmarks,
  InferencePolicy,
  ProcessingMode,
  DerivedVisionEvent,
} from "../types";
import {
  PushupRepetitionEngine,
  SquatRepetitionEngine,
  type RepetitionEngine,
} from "../engines/repetition-engine";
import { LungeRepetitionEngine } from "../engines/lunge-engine";

export class PoseProvider implements VisionProvider {
  readonly id = "pose";
  readonly type: VisionProviderType = "pose";
  readonly version = "1.0.0";
  readonly processingMode: ProcessingMode = "realtime";

  private context: VisionContext | null = null;
  private engine: RepetitionEngine | null = null;
  private events: DerivedVisionEvent[] = [];
  private sequence = 0;
  private startTime = 0;

  supports(requirements: Record<string, unknown>): boolean {
    return requirements.requiresPose === true;
  }

  async initialize(context: VisionContext): Promise<void> {
    this.context = context;
    this.events = [];
    this.sequence = 0;

    // §38: Select engine based on activity
    const activityId = context.activityType.toLowerCase();
    if (activityId.includes("squat")) {
      this.engine = new SquatRepetitionEngine();
    } else if (activityId.includes("lunge")) {
      this.engine = new LungeRepetitionEngine() as unknown as RepetitionEngine;
    } else {
      // Default to pushup engine
      this.engine = new PushupRepetitionEngine();
    }

    this.engine.initialize({
      activityId,
      targetReps: context.target?.value ?? 10,
      cooldownMs: 300,
      minRepDurationMs: 800,
      maxRepDurationMs: 5000,
      depthThreshold: 0.65,
      alignmentThreshold: 0.6,
    });
  }

  async start(_context: VisionContext): Promise<void> {
    this.startTime = Date.now();
  }

  /**
   * §22: Process a frame of pose landmarks.
   * Controlled processing rate, emits meaningful state transitions.
   */
  async process(input: VisionInput): Promise<VisionObservation> {
    if (!this.engine || !input.landmarks) {
      return {
        type: "pose_no_data",
        confidence: 0,
        metrics: {},
        isStateChange: false,
      };
    }

    const repObs = this.engine.update(input.landmarks, input.timestamp);

    // §13: Emit derived events only
    if (repObs.isValidRep) {
      this.events.push({
        missionId: this.context?.missionId ?? "",
        sessionId: this.context?.sessionId ?? "",
        sequence: ++this.sequence,
        type: "rep_completed",
        timestamp: input.timestamp,
        metrics: {
          count: repObs.currentCount,
          target: repObs.targetCount,
          depth: repObs.formSignals.depth ?? 0,
          alignment: repObs.formSignals.alignment ?? 0,
          symmetry: repObs.formSignals.symmetry ?? 0,
        },
      });
    }

    return {
      type: repObs.isValidRep ? "rep_completed" : "pose_observed",
      confidence: repObs.isValidRep ? 0.9 : 0.5,
      metrics: {
        count: repObs.currentCount,
        target: repObs.targetCount,
        depth: repObs.formSignals.depth ?? 0,
        alignment: repObs.formSignals.alignment ?? 0,
        symmetry: repObs.formSignals.symmetry ?? 0,
        tempo: repObs.formSignals.tempo ?? 0,
        stability: repObs.formSignals.stability ?? 0,
      },
      message: repObs.message,
      isStateChange: repObs.isValidRep,
    };
  }

  async stop(): Promise<void> {
    // Engine continues until finalize
  }

  async finalize(): Promise<VisionResult> {
    if (!this.engine) {
      return {
        status: "unsupported",
        evidenceClass: "insufficient",
        confidenceLevel: "needs_better_view",
        confidenceScore: 0,
        reasonCode: "NO_ENGINE",
        events: [],
      };
    }

    const result = this.engine.finalize();
    const ratio = result.targetReps > 0 ? result.validReps / result.targetReps : 0;

    let status: "supported" | "unsupported" | "uncertain";
    let evidenceClass: "clear" | "partial" | "insufficient";
    let confidenceLevel: "clear" | "likely" | "uncertain" | "needs_better_view";
    let confidenceScore: number;
    let reasonCode: string;

    if (ratio >= 1 && result.formScore >= 0.7) {
      status = "supported";
      evidenceClass = "clear";
      confidenceLevel = "clear";
      confidenceScore = Math.min(0.95, 0.7 + result.formScore * 0.25);
      reasonCode = "TARGET_REACHED";
    } else if (ratio >= 0.8) {
      status = "uncertain";
      evidenceClass = "partial";
      confidenceLevel = "likely";
      confidenceScore = ratio * 0.7;
      reasonCode = "NEAR_TARGET";
    } else {
      status = "unsupported";
      evidenceClass = "insufficient";
      confidenceLevel = ratio > 0.3 ? "uncertain" : "needs_better_view";
      confidenceScore = ratio * 0.5;
      reasonCode = "INSUFFICIENT_REPS";
    }

    // Alignment penalty
    if (result.formSignals.alignment !== undefined && result.formSignals.alignment < 0.5) {
      confidenceScore *= 0.7;
    }

    return {
      status,
      evidenceClass,
      confidenceLevel,
      confidenceScore,
      metrics: {
        validReps: result.validReps,
        targetReps: result.targetReps,
        invalidReps: result.invalidReps,
        formScore: result.formScore,
        alignment: result.formSignals.alignment ?? 0,
        symmetry: result.formSignals.symmetry ?? 0,
        averageRepDuration: result.averageRepDuration,
        consistency: result.consistency,
      },
      reasonCode,
      events: this.events,
    };
  }

  async dispose(): Promise<void> {
    this.engine?.reset();
    this.engine = null;
    this.context = null;
    this.events = [];
  }

  getInferencePolicy(): InferencePolicy {
    return {
      preferredLocation: "device",
      allowFallback: false,
      retainRawMedia: false,
      derivedEventsOnly: true,
    };
  }
}
