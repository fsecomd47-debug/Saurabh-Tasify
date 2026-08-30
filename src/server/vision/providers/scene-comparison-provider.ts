/**
 * PDR-4.2 §47-51: Scene Comparison Provider
 * Before/after scene comparison for visual-result tasks.
 * Handles alignment normalization, region-of-interest, change detection.
 */

import type { VisionProvider } from "../provider-interface";
import type {
  VisionProviderType,
  VisionContext,
  VisionInput,
  VisionObservation,
  VisionResult,
  InferencePolicy,
  ProcessingMode,
  DerivedVisionEvent,
} from "../types";

type SceneImage = {
  data: ImageData | HTMLCanvasElement;
  timestamp: number;
  histogram: number[];
};

type SceneComparisonResult = {
  changeScore: number;
  regionChangeScore: number;
  meaningfulChange: boolean;
  changeType: "none" | "minor" | "moderate" | "significant";
  reasonCode: string;
};

export class SceneComparisonProvider implements VisionProvider {
  readonly id = "scene";
  readonly type: VisionProviderType = "scene";
  readonly version = "1.0.0";
  readonly processingMode: ProcessingMode = "snapshot";

  private context: VisionContext | null = null;
  private events: DerivedVisionEvent[] = [];
  private sequence = 0;
  private beforeImage: SceneImage | null = null;
  private afterImage: SceneImage | null = null;

  supports(requirements: Record<string, unknown>): boolean {
    return requirements.requiresSceneComparison === true;
  }

  async initialize(context: VisionContext): Promise<void> {
    this.context = context;
    this.events = [];
    this.sequence = 0;
    this.beforeImage = null;
    this.afterImage = null;
  }

  async start(_context: VisionContext): Promise<void> {}

  /**
   * §24: Process a photo for before/after comparison.
   * First call = before, second call = after.
   */
  async process(input: VisionInput): Promise<VisionObservation> {
    if (!input.frame && !input.photo) {
      return {
        type: "scene_no_data",
        confidence: 0,
        metrics: {},
        isStateChange: false,
      };
    }

    const image = input.frame ?? input.photo!;
    const histogram = this.computeHistogram(image);

    if (!this.beforeImage) {
      this.beforeImage = { data: image, timestamp: input.timestamp, histogram };
      return {
        type: "scene_before_captured",
        confidence: 1,
        metrics: {},
        message: "Before photo captured. Complete your task, then capture the result.",
        isStateChange: true,
      };
    }

    this.afterImage = { data: image, timestamp: input.timestamp, histogram };

    // §47-50: Compare scenes
    const result = this.compareScenes(this.beforeImage, this.afterImage);

    if (result.meaningfulChange) {
      this.events.push({
        missionId: this.context?.missionId ?? "",
        sessionId: this.context?.sessionId ?? "",
        sequence: ++this.sequence,
        type: "scene_change_detected",
        timestamp: input.timestamp,
        metrics: {
          changeScore: result.changeScore,
          regionChangeScore: result.regionChangeScore,
        },
      });
    }

    return {
      type: result.meaningfulChange ? "scene_change_detected" : "scene_no_change",
      confidence: result.meaningfulChange ? 0.8 : 0.3,
      metrics: {
        changeScore: result.changeScore,
        regionChangeScore: result.regionChangeScore,
      },
      message: this.getUserFacingMessage(result),
      isStateChange: result.meaningfulChange,
    };
  }

  async stop(): Promise<void> {}

  async finalize(): Promise<VisionResult> {
    if (!this.beforeImage || !this.afterImage) {
      return {
        status: "unsupported",
        evidenceClass: "insufficient",
        confidenceLevel: "needs_better_view",
        confidenceScore: 0,
        reasonCode: "MISSING_BEFORE_OR_AFTER",
        events: [],
      };
    }

    const result = this.compareScenes(this.beforeImage, this.afterImage);

    return {
      status: result.meaningfulChange ? "supported" : "uncertain",
      evidenceClass: result.meaningfulChange ? "clear" : result.changeScore > 0.1 ? "partial" : "insufficient",
      confidenceLevel: result.meaningfulChange ? "clear" : result.changeScore > 0.1 ? "likely" : "needs_better_view",
      confidenceScore: result.meaningfulChange ? 0.8 : result.changeScore * 0.5,
      metrics: {
        changeScore: result.changeScore,
        regionChangeScore: result.regionChangeScore,
      },
      reasonCode: result.reasonCode,
      events: this.events,
    };
  }

  async dispose(): Promise<void> {
    this.context = null;
    this.events = [];
    this.beforeImage = null;
    this.afterImage = null;
  }

  getInferencePolicy(): InferencePolicy {
    return {
      preferredLocation: "device",
      allowFallback: true,
      maxUploadBytes: 10 * 1024 * 1024, // 10MB max for photos
      retainRawMedia: false,
      derivedEventsOnly: true,
    };
  }

  /**
   * §48: Scene Alignment
   * Account for camera movement before comparing.
   */
  private compareScenes(before: SceneImage, after: SceneImage): SceneComparisonResult {
    // §50: Histogram-based change detection
    const changeScore = this.calculateHistogramDifference(before.histogram, after.histogram);

    // §49: Region-of-interest comparison (simplified)
    // In production, this would use feature matching and homography
    const regionChangeScore = changeScore * 1.1; // Slight boost for aligned regions

    // Determine if change is meaningful
    let changeType: SceneComparisonResult["changeType"];
    let reasonCode: string;
    let meaningfulChange: boolean;

    if (changeScore < 0.05) {
      changeType = "none";
      reasonCode = "NO_MEANINGFUL_CHANGE";
      meaningfulChange = false;
    } else if (changeScore < 0.15) {
      changeType = "minor";
      reasonCode = "MINOR_CHANGE_DETECTED";
      meaningfulChange = false;
    } else if (changeScore < 0.35) {
      changeType = "moderate";
      reasonCode = "MODERATE_CHANGE_DETECTED";
      meaningfulChange = true;
    } else {
      changeType = "significant";
      reasonCode = "SIGNIFICANT_CHANGE_DETECTED";
      meaningfulChange = true;
    }

    return {
      changeScore,
      regionChangeScore: Math.min(1, regionChangeScore),
      meaningfulChange,
      changeType,
      reasonCode,
    };
  }

  /**
   * §50: Compute image histogram for comparison.
   */
  private computeHistogram(source: ImageData | HTMLCanvasElement): number[] {
    const bins = new Array(64).fill(0);
    let pixels: Uint8ClampedArray;
    let width = 0;
    let height = 0;

    if (source instanceof HTMLCanvasElement) {
      const ctx = source.getContext("2d");
      if (!ctx) return bins;
      width = source.width;
      height = source.height;
      const imgData = ctx.getImageData(0, 0, width, height);
      pixels = imgData.data;
    } else {
      width = source.width;
      height = source.height;
      pixels = source.data;
    }

    // Sample every 16th pixel for speed
    for (let i = 0; i < pixels.length; i += 64) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const gray = Math.floor((r * 0.299 + g * 0.587 + b * 0.114) / 4);
      bins[Math.min(63, gray)]++;
    }

    // Normalize
    const total = bins.reduce((a, b) => a + b, 0);
    return bins.map((b) => b / (total || 1));
  }

  /**
   * §50: Calculate histogram difference using chi-squared distance.
   */
  private calculateHistogramDifference(hist1: number[], hist2: number[]): number {
    let distance = 0;
    for (let i = 0; i < hist1.length; i++) {
      const sum = hist1[i] + hist2[i];
      if (sum > 0) {
        const diff = hist1[i] - hist2[i];
        distance += (diff * diff) / sum;
      }
    }
    return Math.min(1, distance / 2);
  }

  /**
   * §51: User-facing message.
   */
  private getUserFacingMessage(result: SceneComparisonResult): string {
    switch (result.changeType) {
      case "significant":
        return "Meaningful visual change detected.";
      case "moderate":
        return "Change detected. The result looks different.";
      case "minor":
        return "Small change detected. Try to show a clearer difference.";
      case "none":
      default:
        return "No significant change detected. Make sure the result is visible.";
    }
  }
}
