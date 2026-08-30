/**
 * PDR-4.2 §5: Vision Provider Interface
 * Common interface for all vision providers.
 * Supports both continuous video missions and single-image evidence missions.
 */

import type {
  VisionProviderType,
  VisionContext,
  VisionInput,
  VisionObservation,
  VisionResult,
  ProcessingMode,
  InferencePolicy,
} from "./types";

export interface VisionProvider {
  readonly id: string;
  readonly type: VisionProviderType;
  readonly version: string;
  readonly processingMode: ProcessingMode;

  /**
   * Check if this provider can handle the given requirements.
   */
  supports(requirements: Record<string, unknown>): boolean;

  /**
   * Initialize the provider for a specific mission.
   * Called once when the mission starts.
   */
  initialize(context: VisionContext): Promise<void>;

  /**
   * Start vision processing.
   */
  start(context: VisionContext): Promise<void>;

  /**
   * Process a single input (frame, photo, etc.).
   * Returns observations derived from the input.
   * §12: Frame is processed in memory, then discarded.
   */
  process(input: VisionInput): Promise<VisionObservation>;

  /**
   * Pause vision processing (if supported).
   */
  pause?(): Promise<void>;

  /**
   * Resume vision processing (if supported).
   */
  resume?(): Promise<void>;

  /**
   * Stop vision processing.
   */
  stop(): Promise<void>;

  /**
   * Finalize and produce the vision result.
   * Called when the mission completes or is abandoned.
   */
  finalize(): Promise<VisionResult>;

  /**
   * Dispose of all resources (models, streams, buffers).
   * §67: No persistent memory leaks.
   */
  dispose(): Promise<void>;

  /**
   * Get the inference policy for this provider.
   */
  getInferencePolicy(): InferencePolicy;
}
