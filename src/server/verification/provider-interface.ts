/**
 * PDR-4.1 §56-58: VerificationProvider Interface & Provider Registry
 * Common interface for all verification providers.
 * Provider Registry maps verification modes to providers.
 */

import type { VerificationMode } from "@/types";
import type { MissionContract } from "@/server/ai/provider";

/**
 * §56: VerificationProvider interface.
 * All verification providers implement this contract.
 */
export interface VerificationProvider {
  readonly name: string;
  readonly supportedModes: VerificationMode[];

  /**
   * Check if this provider can handle the given mission.
   */
  supports(mission: { verificationMode: VerificationMode }): boolean;

  /**
   * Initialize the provider for a specific mission.
   * Called once when the mission starts.
   */
  initialize(mission: MissionContract): Promise<void>;

  /**
   * Start the verification process.
   */
  start(): Promise<void>;

  /**
   * Pause verification (if supported).
   */
  pause?(): Promise<void>;

  /**
   * Resume verification (if supported).
   */
  resume?(): Promise<void>;

  /**
   * Stop verification and release resources.
   */
  stop(): Promise<void>;

  /**
   * Get the current verification state.
   * Called frequently by the UI for display.
   */
  getCurrentState(): VerificationState;

  /**
   * Finalize and produce the verification result.
   * Called when the mission completes or is abandoned.
   */
  finalize(): Promise<VerificationResult>;
}

/**
 * Current state of an active verification.
 */
export type VerificationState = {
  status: "initializing" | "active" | "paused" | "finalizing" | "stopped";
  progress: number;
  confidence: number;
  metrics: Record<string, number>;
  message?: string;
};

/**
 * §39: Verification result after finalization.
 */
export type VerificationResult = {
  status: "passed" | "failed" | "uncertain" | "review";
  evidenceType: string;
  confidenceClass: "high" | "medium" | "low";
  confidenceScore: number;
  metrics?: Record<string, number>;
  reasonCode: string;
  metadata?: Record<string, unknown>;
};

/**
 * §58: Provider Registry.
 * Maps verification modes to their providers.
 * Supports activity-specific routing for pose providers.
 */
class ProviderRegistry {
  private providers: VerificationProvider[] = [];

  /**
   * Register a new provider.
   */
  register(provider: VerificationProvider): void {
    this.providers.push(provider);
  }

  /**
   * Find the best provider for a given verification mode.
   * For pose/repetition mode, routes to activity-specific provider.
   */
  resolve(mode: VerificationMode, activityId?: string): VerificationProvider | undefined {
    if (mode === "pose" || mode === "repetition") {
      // Route to activity-specific provider
      if (activityId === "squat") {
        return this.providers.find((p) => p.name === "squat-pose");
      }
      if (activityId === "lunge") {
        return this.providers.find((p) => p.name === "lunge-pose");
      }
      // Default to pushup
      return this.providers.find((p) => p.name === "pushup-pose");
    }
    return this.providers.find((p) => p.supportedModes.includes(mode));
  }

  /**
   * Get all registered providers.
   */
  getAll(): VerificationProvider[] {
    return [...this.providers];
  }

  /**
   * Check if a provider exists for the given mode.
   */
  has(mode: VerificationMode): boolean {
    return this.providers.some((p) => p.supportedModes.includes(mode));
  }
}

/**
 * Singleton provider registry.
 */
export const providerRegistry = new ProviderRegistry();
