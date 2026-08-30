/**
 * PDR-4.2 §72-73: Vision Verification Orchestrator
 * Coordinates vision providers, manages lifecycle, aggregates observations.
 * Does NOT calculate wallet rewards (§74).
 */

import type { VisionProvider } from "./provider-interface";
import type {
  VisionContext,
  VisionInput,
  VisionObservation,
  VisionResult,
  VisionRequirements,
  DerivedVisionEvent,
} from "./types";
import { visionProviderRegistry } from "./registry";

type OrchestratorState = "idle" | "initializing" | "active" | "finalizing" | "completed" | "failed";

export class VisionVerificationOrchestrator {
  private providers: VisionProvider[] = [];
  private state: OrchestratorState = "idle";
  private context: VisionContext | null = null;
  private allEvents: DerivedVisionEvent[] = [];
  private observations: VisionObservation[] = [];
  private startTime = 0;

  /**
   * §72: Initialize orchestrator with mission context.
   * Resolves and initializes appropriate providers.
   */
  async initialize(context: VisionContext, requirements: VisionRequirements): Promise<void> {
    this.state = "initializing";
    this.context = context;
    this.allEvents = [];
    this.observations = [];

    // §4: Resolve providers from registry
    this.providers = visionProviderRegistry.resolve(requirements);

    // Initialize all providers
    for (const provider of this.providers) {
      await provider.initialize(context);
    }

    this.state = "active";
    this.startTime = Date.now();
  }

  /**
   * §72: Start all providers.
   */
  async start(): Promise<void> {
    if (this.state !== "active") return;

    for (const provider of this.providers) {
      await provider.start(this.context!);
    }
  }

  /**
   * §72: Process input through all providers.
   * Aggregates observations from all providers.
   */
  async process(input: VisionInput): Promise<VisionObservation[]> {
    if (this.state !== "active") return [];

    const observations: VisionObservation[] = [];

    for (const provider of this.providers) {
      try {
        const observation = await provider.process(input);
        observations.push(observation);
        this.observations.push(observation);
      } catch (err) {
        console.error(`[VisionOrchestrator] Provider ${provider.id} failed:`, err);
        observations.push({
          type: "provider_error",
          confidence: 0,
          metrics: { providerError: 1 },
          message: `Verification error: ${provider.id}`,
          isStateChange: false,
        });
      }
    }

    return observations;
  }

  /**
   * §72: Pause all providers.
   */
  async pause(): Promise<void> {
    for (const provider of this.providers) {
      if (provider.pause) {
        await provider.pause();
      }
    }
  }

  /**
   * §72: Resume all providers.
   */
  async resume(): Promise<void> {
    for (const provider of this.providers) {
      if (provider.resume) {
        await provider.resume();
      }
    }
  }

  /**
   * §72: Finalize all providers and aggregate results.
   * §74: Returns verification result, NOT wallet mutations.
   */
  async finalize(): Promise<VisionResult> {
    this.state = "finalizing";

    const results: VisionResult[] = [];

    for (const provider of this.providers) {
      try {
        const result = await provider.finalize();
        results.push(result);
        this.allEvents.push(...result.events);
      } catch (err) {
        console.error(`[VisionOrchestrator] Provider ${provider.id} finalize failed:`, err);
      }
    }

    // Aggregate results
    const aggregated = this.aggregateResults(results);
    this.state = "completed";

    return aggregated;
  }

  /**
   * §67: Dispose all providers and release resources.
   */
  async dispose(): Promise<void> {
    for (const provider of this.providers) {
      try {
        await provider.dispose();
      } catch (err) {
        console.error(`[VisionOrchestrator] Provider ${provider.id} dispose failed:`, err);
      }
    }

    this.providers = [];
    this.context = null;
    this.allEvents = [];
    this.observations = [];
    this.state = "idle";
  }

  /**
   * Get all derived events.
   */
  getEvents(): DerivedVisionEvent[] {
    return [...this.allEvents];
  }

  /**
   * Get current state.
   */
  getState(): OrchestratorState {
    return this.state;
  }

  /**
   * §73: Aggregate results from multiple providers.
   * The most restrictive result wins.
   */
  private aggregateResults(results: VisionResult[]): VisionResult {
    if (results.length === 0) {
      return {
        status: "unsupported",
        evidenceClass: "insufficient",
        confidenceLevel: "needs_better_view",
        confidenceScore: 0,
        reasonCode: "NO_PROVIDERS",
        events: this.allEvents,
      };
    }

    // Find the most restrictive result
    const statusPriority: Record<string, number> = {
      unsupported: 0,
      uncertain: 1,
      supported: 2,
    };

    let worstStatus: VisionResult["status"] = "supported";
    let worstEvidenceClass: VisionResult["evidenceClass"] = "clear";
    let worstConfidenceLevel: VisionResult["confidenceLevel"] = "clear";
    let totalConfidence = 0;
    let worstReasonCode = "";

    for (const result of results) {
      if ((statusPriority[result.status] ?? 0) < (statusPriority[worstStatus] ?? 0)) {
        worstStatus = result.status;
        worstEvidenceClass = result.evidenceClass;
        worstConfidenceLevel = result.confidenceLevel;
        worstReasonCode = result.reasonCode;
      }
      totalConfidence += result.confidenceScore;
    }

    const avgConfidence = totalConfidence / results.length;

    // Merge metrics
    const mergedMetrics: Record<string, number> = {};
    for (const result of results) {
      if (result.metrics) {
        Object.assign(mergedMetrics, result.metrics);
      }
    }

    return {
      status: worstStatus,
      evidenceClass: worstEvidenceClass,
      confidenceLevel: worstConfidenceLevel,
      confidenceScore: avgConfidence,
      metrics: mergedMetrics,
      reasonCode: worstReasonCode,
      events: this.allEvents,
    };
  }
}
