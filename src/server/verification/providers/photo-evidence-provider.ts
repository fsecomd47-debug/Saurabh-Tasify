/**
 * PDR-4.1 §32-35: PhotoEvidenceProvider + Photo Quality Engine
 * Photo evidence verification with quality checks.
 * Validates blur, exposure, resolution before submission.
 */

import type {
  VerificationProvider,
  VerificationState,
  VerificationResult,
} from "@/server/verification/provider-interface";
import type { MissionContract } from "@/server/ai/provider";
import type { VerificationMode } from "@/types";

/**
 * §34: Photo Quality Engine
 * Checks resolution, blur, orientation, exposure before AI analysis.
 */
export type PhotoQualityCheck = {
  passed: boolean;
  resolution: { width: number; height: number };
  brightness: number;
  blurScore: number;
  issues: string[];
};

export function assessPhotoQuality(
  imageData: ImageData | HTMLCanvasElement,
  options?: {
    minWidth?: number;
    minHeight?: number;
    maxBlur?: number;
    minBrightness?: number;
    maxBrightness?: number;
  }
): PhotoQualityCheck {
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

  if (imageData instanceof HTMLCanvasElement) {
    const ctx = imageData.getContext("2d");
    if (!ctx) {
      return {
        passed: false,
        resolution: { width: 0, height: 0 },
        brightness: 0,
        blurScore: 0,
        issues: ["Cannot access canvas context"],
      };
    }
    width = imageData.width;
    height = imageData.height;
    const imgData = ctx.getImageData(0, 0, width, height);
    pixels = imgData.data;
  } else {
    width = imageData.width;
    height = imageData.height;
    pixels = imageData.data;
  }

  const issues: string[] = [];

  // Resolution check
  if (width < opts.minWidth || height < opts.minHeight) {
    issues.push(`Resolution too low: ${width}x${height} (min: ${opts.minWidth}x${opts.minHeight})`);
  }

  // Brightness check
  let totalBrightness = 0;
  const pixelCount = width * height;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    totalBrightness += (r * 0.299 + g * 0.587 + b * 0.114);
  }
  const brightness = totalBrightness / pixelCount;

  if (brightness < opts.minBrightness) {
    issues.push(`Image too dark (brightness: ${brightness.toFixed(1)}, min: ${opts.minBrightness})`);
  }
  if (brightness > opts.maxBrightness) {
    issues.push(`Image too bright (brightness: ${brightness.toFixed(1)}, max: ${opts.maxBrightness})`);
  }

  // Simple blur detection using edge variance
  let edgeSum = 0;
  let edgeSquareSum = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const left = pixels[idx - 4];
      const right = pixels[idx + 4];
      const top = pixels[idx - width * 4];
      const bottom = pixels[idx + width * 4];
      const gx = right - left;
      const gy = bottom - top;
      const edge = Math.sqrt(gx * gx + gy * gy);
      edgeSum += edge;
      edgeSquareSum += edge * edge;
    }
  }
  const edgeCount = (width - 2) * (height - 2);
  const meanEdge = edgeSum / edgeCount;
  const variance = edgeSquareSum / edgeCount - meanEdge * meanEdge;
  const blurScore = Math.sqrt(variance);

  if (blurScore < opts.maxBlur * 0.3) {
    issues.push(`Image may be blurry (blur score: ${blurScore.toFixed(1)})`);
  }

  return {
    passed: issues.length === 0,
    resolution: { width, height },
    brightness,
    blurScore,
    issues,
  };
}

export class PhotoEvidenceProvider implements VerificationProvider {
  readonly name = "photo-evidence";
  readonly supportedModes: VerificationMode[] = ["photo", "evidence"];

  private state: VerificationState = {
    status: "initializing",
    progress: 0,
    confidence: 0,
    metrics: {},
  };

  private mission: MissionContract | null = null;
  private photos: PhotoQualityCheck[] = [];

  supports(mission: { verificationMode: VerificationMode }): boolean {
    return mission.verificationMode === "photo" || mission.verificationMode === "evidence";
  }

  async initialize(mission: MissionContract): Promise<void> {
    this.mission = mission;
    this.photos = [];
    this.state = {
      status: "initializing",
      progress: 0,
      confidence: 0,
      metrics: {},
    };
  }

  async start(): Promise<void> {
    this.state.status = "active";
  }

  async stop(): Promise<void> {
    this.state.status = "stopped";
  }

  getCurrentState(): VerificationState {
    return { ...this.state };
  }

  /**
   * Submit a photo for quality validation.
   * Returns quality assessment for the UI.
   */
  submitPhoto(imageData: ImageData | HTMLCanvasElement): PhotoQualityCheck {
    const quality = assessPhotoQuality(imageData);
    this.photos.push(quality);

    this.state = {
      ...this.state,
      progress: this.photos.length > 0 ? 1 : 0,
      confidence: quality.passed ? 0.7 : 0.3,
      metrics: {
        photoCount: this.photos.length,
        qualityPassed: quality.passed ? 1 : 0,
      },
      message: quality.passed ? "Photo quality OK" : quality.issues[0],
    };

    return quality;
  }

  async finalize(): Promise<VerificationResult> {
    this.state.status = "finalizing";

    const validPhotos = this.photos.filter((p) => p.passed);
    const hasValidPhoto = validPhotos.length > 0;

    let status: "passed" | "failed" | "uncertain";
    let reasonCode: string;
    let confidence: number;

    if (hasValidPhoto) {
      status = "passed";
      reasonCode = "PHOTO_EVIDENCE_SUBMITTED";
      confidence = 0.75;
    } else if (this.photos.length > 0) {
      status = "failed";
      reasonCode = "PHOTO_QUALITY_INSUFFICIENT";
      confidence = 0.3;
    } else {
      status = "failed";
      reasonCode = "NO_PHOTO_SUBMITTED";
      confidence = 0;
    }

    const confidenceClass = confidence >= 0.7 ? "high" : confidence >= 0.4 ? "medium" : "low";

    this.state.status = "stopped";

    return {
      status,
      evidenceType: "photo",
      confidenceClass,
      confidenceScore: confidence,
      metrics: {
        totalPhotos: this.photos.length,
        validPhotos: validPhotos.length,
        averageBrightness: validPhotos.length > 0
          ? validPhotos.reduce((sum, p) => sum + p.brightness, 0) / validPhotos.length
          : 0,
      },
      reasonCode,
    };
  }
}
