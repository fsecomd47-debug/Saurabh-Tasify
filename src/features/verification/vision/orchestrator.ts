"use client";

/**
 * PDR-4.2: Vision Verification Orchestrator
 * Coordinates vision providers, aggregates observations, manages verification lifecycle.
 * Implements privacy-first architecture with derived-data-only storage.
 */

import { EventEmitter } from "events";
import type {
  VisionProvider,
  VisionProviderRegistry,
  VisionContext,
  VisionRequirements,
  VisionObservation,
  VisionResult,
  OrchestratorConfig,
  OrchestratorState,
  OrchestratorResult,
  VisionConfidence,
  FrameData,
  QualityMetrics,
  ProcessingMode,
} from "./types";
import { VisionProviderRegistry as ProviderRegistry } from "./registry";
import { QualityProvider } from "./quality-provider";
import { EnhancedPoseEngine } from "../pose/enhanced-pose-engine";

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: OrchestratorConfig = {
  maxConcurrentProviders: 3,
  frameIntervalMs: 100, // 10 FPS
  qualityThreshold: 0.5,
  confidenceThreshold: 0.6,
  enableAntiCheat: true,
  enablePrivacyMode: true,
  maxSessionDurationMs: 600000, // 10 minutes
};

// ============================================================================
// Vision Verification Orchestrator
// ============================================================================

export class VisionVerificationOrchestrator extends EventEmitter {
  private registry: VisionProviderRegistry;
  private config: OrchestratorConfig;
  private state: OrchestratorState;
  private context: VisionContext | null = null;
  private requirements: VisionRequirements | null = null;

  // Frame processing
  private frameQueue: FrameData[] = [];
  private processingInterval: NodeJS.Timeout | null = null;
  private sessionStartTime: number = 0;

  // Observation aggregation
  private allObservations: VisionObservation[] = [];
  private providerResults: VisionResult[] = [];

  // Quality tracking
  private qualityScores: number[] = [];
  private confidenceScores: number[] = [];

  constructor(config?: Partial<OrchestratorConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.registry = new ProviderRegistry();
    this.state = {
      phase: "idle",
      activeProviders: [],
      currentFrameIndex: 0,
      totalFramesProcessed: 0,
      averageConfidence: 0,
      qualityScore: 0,
    };

    // Register default providers
    this.registerDefaultProviders();
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Initialize the orchestrator for a verification session
   */
  async initialize(context: VisionContext, requirements: VisionRequirements): Promise<void> {
    this.context = context;
    this.requirements = requirements;
    this.sessionStartTime = Date.now();

    this.setState("initializing");

    // Initialize required providers
    for (const capability of requirements.capabilities) {
      const provider = this.registry.getProvider(requirements, context.processingMode);
      if (provider) {
        try {
          await provider.initialize(context, requirements);
          this.state.activeProviders.push(provider.id);
        } catch (error) {
          console.error(`Failed to initialize provider ${provider.id}:`, error);
        }
      }
    }

    this.setState("processing");
    this.emit("initialized", { context, requirements });
  }

  /**
   * Submit a frame for processing
   */
  async processFrame(frame: FrameData): Promise<VisionResult[]> {
    if (this.state.phase !== "processing") {
      throw new Error("Orchestrator is not in processing phase");
    }

    // Check session duration limit
    if (Date.now() - this.sessionStartTime > this.config.maxSessionDurationMs) {
      this.setState("error", "Session duration limit exceeded");
      return [];
    }

    const results: VisionResult[] = [];

    // Process frame with all active providers
    for (const providerId of this.state.activeProviders) {
      // Find the provider entry by its registered ID, not hardcoded capability
      const entries = this.registry.getProvidersByCapability(this.requirements?.capabilities[0] ?? "pose_detection");
      const entry = entries.find((e) => e.provider.id === providerId);

      if (entry && entry.provider) {
        const startTime = performance.now();
        try {
          const result = await entry.provider.processFrame(frame, this.context!);
          const latencyMs = performance.now() - startTime;

          this.registry.updateMetrics(providerId, latencyMs, result.success);
          results.push(result);

          // Aggregate observations
          this.allObservations.push(...result.observations);

          // Track scores
          if (result.success) {
            this.confidenceScores.push(result.confidence);
            if (result.summary.qualityScore > 0) {
              this.qualityScores.push(result.summary.qualityScore);
            }
          }
        } catch (error) {
          this.registry.updateMetrics(providerId, performance.now() - startTime, false);
          console.error(`Provider ${providerId} failed:`, error);
        }
      }
    }

    this.state.currentFrameIndex++;
    this.state.totalFramesProcessed++;
    this.updateMetrics();

    this.emit("frameProcessed", {
      frameIndex: this.state.currentFrameIndex,
      results,
      metrics: this.getMetrics(),
    });

    return results;
  }

  /**
   * Process a batch of frames (for snapshot mode)
   */
  async processBatch(frames: FrameData[]): Promise<VisionResult[]> {
    const results: VisionResult[] = [];

    for (const frame of frames) {
      const frameResults = await this.processFrame(frame);
      results.push(...frameResults);
    }

    return results;
  }

  /**
   * Start automatic frame processing
   */
  startAutoProcessing(videoElement: HTMLVideoElement): void {
    if (this.processingInterval) {
      this.stopAutoProcessing();
    }

    this.processingInterval = setInterval(() => {
      if (videoElement.readyState >= 2) {
        const canvas = document.createElement("canvas");
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(videoElement, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          const frame: FrameData = {
            width: canvas.width,
            height: canvas.height,
            format: "rgba",
            data: imageData.data.buffer,
            timestamp: Date.now(),
            frameIndex: this.state.currentFrameIndex,
          };

          this.processFrame(frame).catch(console.error);
        }
      }
    }, this.config.frameIntervalMs);
  }

  /**
   * Stop automatic frame processing
   */
  stopAutoProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * Finalize the verification session
   */
  async finalize(): Promise<OrchestratorResult> {
    this.stopAutoProcessing();
    this.setState("finalizing");

    // Calculate final metrics
    const avgConfidence = this.confidenceScores.length > 0
      ? this.confidenceScores.reduce((a, b) => a + b, 0) / this.confidenceScores.length
      : 0;

    const avgQuality = this.qualityScores.length > 0
      ? this.qualityScores.reduce((a, b) => a + b, 0) / this.qualityScores.length
      : 0;

    // Determine status
    let status: "passed" | "failed" | "uncertain";
    let confidenceClass: VisionConfidence;

    if (avgConfidence >= 0.75) {
      status = "passed";
      confidenceClass = "high";
    } else if (avgConfidence >= 0.45) {
      status = "uncertain";
      confidenceClass = "medium";
    } else {
      status = "failed";
      confidenceClass = "low";
    }

    // Check quality threshold
    if (avgQuality < this.config.qualityThreshold) {
      status = "failed";
      confidenceClass = "low";
    }

    // Create evidence hash for audit trail
    const evidenceHash = await this.createEvidenceHash();

    const result: OrchestratorResult = {
      status,
      confidence: avgConfidence,
      confidenceClass,
      observations: this.allObservations,
      summary: {
        totalFrames: this.state.totalFramesProcessed,
        processedFrames: this.state.totalFramesProcessed,
        averageConfidence: avgConfidence,
        qualityScore: avgQuality,
        formScore: this.calculateOverallFormScore(),
      },
      evidenceHash,
      processingTimeMs: Date.now() - this.sessionStartTime,
      providerResults: this.providerResults,
      metadata: {
        sessionId: this.context?.sessionId,
        missionId: this.context?.missionId,
        userId: this.context?.userId,
      },
    };

    // Clean up providers
    await this.cleanup();

    this.setState("completed");
    this.emit("finalized", result);

    return result;
  }

  /**
   * Get current orchestrator state
   */
  getState(): OrchestratorState {
    return { ...this.state };
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      phase: this.state.phase,
      totalFramesProcessed: this.state.totalFramesProcessed,
      averageConfidence: this.state.averageConfidence,
      qualityScore: this.state.qualityScore,
      activeProviders: this.state.activeProviders.length,
      observationsCount: this.allObservations.length,
    };
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    this.stopAutoProcessing();

    // Clean up all providers
    for (const providerId of this.state.activeProviders) {
      const entries = this.registry.getProvidersByCapability(this.requirements?.capabilities[0] ?? "pose_detection");
      const entry = entries.find((e) => e.provider.id === providerId);
      if (entry?.provider) {
        try {
          await entry.provider.cleanup();
        } catch (error) {
          console.error(`Failed to cleanup provider ${providerId}:`, error);
        }
      }
    }

    this.state.activeProviders = [];
    this.allObservations = [];
    this.providerResults = [];
    this.qualityScores = [];
    this.confidenceScores = [];
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private registerDefaultProviders(): void {
    // Register quality provider
    const qualityProvider = new QualityProvider();
    this.registry.register(
      qualityProvider,
      ["quality_assessment"],
      ["snapshot", "realtime", "interactive"],
      50 // High priority
    );

    // Register pose engine
    const poseEngine = new EnhancedPoseEngine();
    this.registry.register(
      poseEngine,
      ["pose_detection", "pose_tracking"],
      ["realtime", "interactive"],
      100 // Normal priority
    );
  }

  private setState(
    phase: OrchestratorState["phase"],
    error?: string
  ): void {
    this.state.phase = phase;
    this.state.error = error;
    this.emit("stateChange", this.state);
  }

  private updateMetrics(): void {
    this.state.averageConfidence = this.confidenceScores.length > 0
      ? this.confidenceScores.reduce((a, b) => a + b, 0) / this.confidenceScores.length
      : 0;

    this.state.qualityScore = this.qualityScores.length > 0
      ? this.qualityScores.reduce((a, b) => a + b, 0) / this.qualityScores.length
      : 0;
  }

  private calculateOverallFormScore(): number {
    const formObservations = this.allObservations.filter(
      (obs) => obs.formSignals && obs.formSignals.length > 0
    );

    if (formObservations.length === 0) {
      return 0.5; // Default score
    }

    let totalFormScore = 0;
    let count = 0;

    for (const obs of formObservations) {
      if (obs.formSignals) {
        for (const signal of obs.formSignals) {
          if (signal.quality === "good") {
            totalFormScore += 1;
          } else if (signal.quality === "acceptable") {
            totalFormScore += 0.5;
          }
          count++;
        }
      }
    }

    return count > 0 ? totalFormScore / count : 0.5;
  }

  private async createEvidenceHash(): Promise<string> {
    // Create a hash of the derived evidence for audit trail
    const evidenceData = {
      sessionId: this.context?.sessionId,
      missionId: this.context?.missionId,
      userId: this.context?.userId,
      timestamp: Date.now(),
      frameCount: this.state.totalFramesProcessed,
      averageConfidence: this.state.averageConfidence,
      qualityScore: this.state.qualityScore,
      observationCount: this.allObservations.length,
    };

    // Use SubtleCrypto for hashing (browser-compatible)
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(evidenceData));
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }

    // Fallback for environments without SubtleCrypto
    return `hash_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}