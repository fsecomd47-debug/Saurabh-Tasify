/**
 * PDR-4.2 §18-19: QualityProvider
 * Image quality checks before expensive inference.
 * Checks resolution, blur, exposure, brightness, subject visibility.
 */

import type { VisionProvider } from "../provider-interface";
import type {
  VisionProviderType,
  VisionContext,
  VisionInput,
  VisionObservation,
  VisionResult,
  EvidenceQuality,
  InferencePolicy,
  ProcessingMode,
} from "../types";

export class QualityProvider implements VisionProvider {
  readonly id = "quality";
  readonly type: VisionProviderType = "quality";
  readonly version = "1.0.0";
  readonly processingMode: ProcessingMode = "snapshot";

  private context: VisionContext | null = null;
  private observations: VisionObservation[] = [];
  private lastQuality: EvidenceQuality | null = null;

  supports(): boolean {
    return true; // Quality checks apply to all missions
  }

  async initialize(context: VisionContext): Promise<void> {
    this.context = context;
    this.observations = [];
  }

  async start(_context: VisionContext): Promise<void> {
    // Quality provider doesn't need continuous start
  }

  /**
   * §17: Process a frame/image for quality assessment.
   * Runs before expensive vision inference.
   */
  async process(input: VisionInput): Promise<VisionObservation> {
    if (!input.frame && !input.photo) {
      return {
        type: "quality_failed",
        confidence: 0,
        metrics: {},
        message: "No image data provided",
        isStateChange: true,
      };
    }

    const imageData = input.frame ?? input.photo!;
    const quality = assessImageQuality(imageData);
    this.lastQuality = quality;

    const observation: VisionObservation = {
      type: quality.status === "usable" ? "quality_passed" : "quality_failed",
      confidence: quality.status === "usable" ? 0.9 : 0.1,
      metrics: {
        brightness: quality.brightness,
        blurScore: quality.blurScore,
        width: quality.resolution.width,
        height: quality.resolution.height,
        issueCount: quality.issues.length,
      },
      message: this.getUserFacingMessage(quality),
      isStateChange: true,
    };

    this.observations.push(observation);
    return observation;
  }

  async stop(): Promise<void> {
    // Nothing to stop
  }

  async finalize(): Promise<VisionResult> {
    const quality = this.lastQuality;
    const isUsable = quality?.status === "usable";

    return {
      status: isUsable ? "supported" : "unsupported",
      evidenceClass: isUsable ? "clear" : "insufficient",
      confidenceLevel: isUsable ? "clear" : "needs_better_view",
      confidenceScore: isUsable ? 0.9 : 0.1,
      metrics: quality
        ? {
            brightness: quality.brightness,
            blurScore: quality.blurScore,
            width: quality.resolution.width,
            height: quality.resolution.height,
          }
        : {},
      reasonCode: isUsable ? "QUALITY_PASSED" : `QUALITY_FAILED_${quality?.issues[0]?.toUpperCase() ?? "UNKNOWN"}`,
      events: [],
    };
  }

  async dispose(): Promise<void> {
    this.context = null;
    this.observations = [];
    this.lastQuality = null;
  }

  getInferencePolicy(): InferencePolicy {
    return {
      preferredLocation: "device",
      allowFallback: false,
      retainRawMedia: false,
      derivedEventsOnly: true,
    };
  }

  /**
   * §19: User-facing quality feedback.
   * Never display raw scores.
   */
  private getUserFacingMessage(quality: EvidenceQuality): string {
    if (quality.status === "usable") return "Image quality OK";

    const issueMessages: Record<string, string> = {
      too_dark: "The scene is too dark. Try better lighting.",
      too_blurry: "The image is blurry. Hold the camera steady.",
      too_small: "Move the camera a little closer.",
      subject_missing: "Keep your full body inside the frame.",
      wrong_orientation: "Rotate your device to landscape.",
      too_many_subjects: "We need one person clearly visible.",
      low_resolution: "Image quality is too low. Try again.",
      motion_blur: "The image is blurry from movement. Hold steady.",
    };

    const firstIssue = quality.issues[0];
    return issueMessages[firstIssue] ?? "Please retake the photo.";
  }
}

/**
 * §18: Assess image quality from canvas/image data.
 */
export function assessImageQuality(
  source: ImageData | HTMLCanvasElement,
  options?: {
    minWidth?: number;
    minHeight?: number;
    maxBlur?: number;
    minBrightness?: number;
    maxBrightness?: number;
  }
): EvidenceQuality {
  const defaults = {
    minWidth: 480,
    minHeight: 480,
    maxBlur: 100,
    minBrightness: 30,
    maxBrightness: 220,
  };
  const opts = { ...defaults, ...options };

  let width = 0;
  let height = 0;
  let pixels: Uint8ClampedArray;

  if (source instanceof HTMLCanvasElement) {
    const ctx = source.getContext("2d");
    if (!ctx) {
      return createQualityResult("unsupported", ["low_resolution"], 0, 0, { width: 0, height: 0 });
    }
    width = source.width;
    height = source.height;
    const imgData = ctx.getImageData(0, 0, width, height);
    pixels = imgData.data;
  } else {
    width = source.width;
    height = source.height;
    pixels = source.data;
  }

  const issues: EvidenceQuality["issues"] = [];

  // Resolution check
  if (width < opts.minWidth || height < opts.minHeight) {
    issues.push("too_small");
  }

  // Brightness check
  let totalBrightness = 0;
  const pixelCount = width * height;
  for (let i = 0; i < pixels.length; i += 16) { // Sample every 4th pixel for speed
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    totalBrightness += r * 0.299 + g * 0.587 + b * 0.114;
  }
  const brightness = totalBrightness / (pixelCount / 4);

  if (brightness < opts.minBrightness) {
    issues.push("too_dark");
  }
  if (brightness > opts.maxBrightness) {
    issues.push("too_blurry"); // Overexposed
  }

  // Blur detection using edge variance
  let edgeSum = 0;
  let edgeSquareSum = 0;
  let edgeCount = 0;
  for (let y = 1; y < height - 1; y += 2) { // Sample every other row
    for (let x = 1; x < width - 1; x += 2) {
      const idx = (y * width + x) * 4;
      const left = pixels[idx - 4] ?? 0;
      const right = pixels[idx + 4] ?? 0;
      const top = pixels[idx - width * 4] ?? 0;
      const bottom = pixels[idx + width * 4] ?? 0;
      const gx = right - left;
      const gy = bottom - top;
      const edge = Math.sqrt(gx * gx + gy * gy);
      edgeSum += edge;
      edgeSquareSum += edge * edge;
      edgeCount++;
    }
  }
  const meanEdge = edgeCount > 0 ? edgeSum / edgeCount : 0;
  const variance = edgeCount > 0 ? edgeSquareSum / edgeCount - meanEdge * meanEdge : 0;
  const blurScore = Math.sqrt(Math.max(0, variance));

  if (blurScore < opts.maxBlur * 0.3) {
    issues.push("too_blurry");
  }

  const status = issues.length === 0 ? "usable" : "retake";

  return {
    status: status as "usable" | "retake" | "unsupported",
    issues,
    brightness,
    blurScore,
    resolution: { width, height },
  };
}

function createQualityResult(
  status: EvidenceQuality["status"],
  issues: EvidenceQuality["issues"],
  brightness: number,
  blurScore: number,
  resolution: { width: number; height: number }
): EvidenceQuality {
  return { status, issues, brightness, blurScore, resolution };
}
