"use client";

/**
 * PDR-4.2: Quality Provider
 * Performs image quality assessments: blur, brightness, resolution, orientation, subject visibility.
 */

import type {
  VisionProvider,
  VisionCapability,
  ProcessingMode,
  FrameData,
  VisionContext,
  VisionRequirements,
  VisionResult,
  VisionObservation,
  QualityMetrics,
  ProviderState,
} from "./types";

export class QualityProvider implements VisionProvider {
  readonly id = "quality-provider";
  readonly type: VisionCapability = "quality_assessment";
  readonly processingMode: ProcessingMode = "snapshot";

  private state: ProviderState = {
    initialized: false,
    modelLoaded: false,
    processing: false,
    framesProcessed: 0,
    averageLatencyMs: 0,
  };

  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  async initialize(): Promise<void> {
    // Quality analysis doesn't need ML models - uses canvas-based analysis
    if (typeof window !== "undefined") {
      this.canvas = document.createElement("canvas");
      this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    }
    this.state.initialized = true;
    this.state.modelLoaded = true;
  }

  async processFrame(frame: FrameData, _context: VisionContext): Promise<VisionResult> {
    const startTime = performance.now();
    this.state.processing = true;

    try {
      const qualityMetrics = await this.analyzeFrameQuality(frame);
      const observation: VisionObservation = {
        frameIndex: frame.frameIndex,
        timestamp: frame.timestamp,
        source: "camera_front",
        confidence: qualityMetrics.overallQuality,
        qualityMetrics,
      };

      const processingTimeMs = performance.now() - startTime;
      this.updateMetrics(processingTimeMs, true);

      return {
        providerId: this.id,
        providerType: this.type,
        success: true,
        confidence: qualityMetrics.overallQuality,
        observations: [observation],
        summary: {
          totalFrames: 1,
          processedFrames: 1,
          averageConfidence: qualityMetrics.overallQuality,
          qualityScore: qualityMetrics.overallQuality,
        },
        processingTimeMs,
      };
    } catch (error) {
      const processingTimeMs = performance.now() - startTime;
      this.updateMetrics(processingTimeMs, false);

      return {
        providerId: this.id,
        providerType: this.type,
        success: false,
        confidence: 0,
        observations: [],
        summary: {
          totalFrames: 1,
          processedFrames: 0,
          averageConfidence: 0,
          qualityScore: 0,
        },
        processingTimeMs,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      this.state.processing = false;
    }
  }

  async processBatch(frames: FrameData[], context: VisionContext): Promise<VisionResult> {
    const startTime = performance.now();
    const allObservations: VisionObservation[] = [];

    for (const frame of frames) {
      const result = await this.processFrame(frame, context);
      allObservations.push(...result.observations);
    }

    const avgConfidence =
      allObservations.reduce((sum, obs) => sum + obs.confidence, 0) /
      allObservations.length;

    const processingTimeMs = performance.now() - startTime;

    return {
      providerId: this.id,
      providerType: this.type,
      success: true,
      confidence: avgConfidence,
      observations: allObservations,
      summary: {
        totalFrames: frames.length,
        processedFrames: allObservations.length,
        averageConfidence: avgConfidence,
        qualityScore: avgConfidence,
      },
      processingTimeMs,
    };
  }

  getState(): ProviderState {
    return { ...this.state };
  }

  async cleanup(): Promise<void> {
    this.canvas = null;
    this.ctx = null;
    this.state.initialized = false;
    this.state.modelLoaded = false;
  }

  private async analyzeFrameQuality(frame: FrameData): Promise<QualityMetrics> {
    // For non-canvas environments (SSR), return default metrics
    if (!this.canvas || !this.ctx) {
      return this.getDefaultMetrics();
    }

    // Draw frame to canvas for analysis
    this.canvas.width = frame.width;
    this.canvas.height = frame.height;

    // Create ImageData from frame data
    const imageData = new ImageData(
      new Uint8ClampedArray(frame.data),
      frame.width,
      frame.height
    );
    this.ctx.putImageData(imageData, 0, 0);

    // Get pixel data for analysis
    const pixelData = this.ctx.getImageData(0, 0, frame.width, frame.height);

    const blurScore = this.calculateBlurScore(pixelData);
    const brightnessScore = this.calculateBrightnessScore(pixelData);
    const contrastScore = this.calculateContrastScore(pixelData);
    const resolutionScore = this.calculateResolutionScore(frame.width, frame.height);
    const orientationScore = this.calculateOrientationScore(frame.width, frame.height);
    const subjectVisibility = this.calculateSubjectVisibility(pixelData);

    const overallQuality =
      blurScore * 0.25 +
      brightnessScore * 0.2 +
      contrastScore * 0.15 +
      resolutionScore * 0.15 +
      orientationScore * 0.1 +
      subjectVisibility * 0.15;

    return {
      blurScore,
      brightnessScore,
      contrastScore,
      resolutionScore,
      orientationScore,
      subjectVisibility,
      overallQuality,
    };
  }

  private calculateBlurScore(imageData: ImageData): number {
    // Laplacian variance method for blur detection
    const { data, width, height } = imageData;
    let laplacianSum = 0;
    let count = 0;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const center = data[idx]; // grayscale approximation

        // Laplacian kernel
        const top = data[((y - 1) * width + x) * 4];
        const bottom = data[((y + 1) * width + x) * 4];
        const left = data[(y * width + (x - 1)) * 4];
        const right = data[(y * width + (x + 1)) * 4];

        const laplacian = Math.abs(4 * center - top - bottom - left - right);
        laplacianSum += laplacian;
        count++;
      }
    }

    const variance = count > 0 ? laplacianSum / count : 0;
    // Normalize: higher variance = sharper image
    return Math.min(1, variance / 500);
  }

  private calculateBrightnessScore(imageData: ImageData): number {
    const { data } = imageData;
    let totalBrightness = 0;
    const pixelCount = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      // Perceived brightness formula
      const brightness = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
      totalBrightness += brightness;
    }

    const avgBrightness = totalBrightness / pixelCount;
    // Optimal brightness is around 0.5, penalize extremes
    const deviation = Math.abs(avgBrightness - 0.5);
    return Math.max(0, 1 - deviation * 2);
  }

  private calculateContrastScore(imageData: ImageData): number {
    const { data } = imageData;
    let min = 255;
    let max = 0;

    for (let i = 0; i < data.length; i += 4) {
      const brightness = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      min = Math.min(min, brightness);
      max = Math.max(max, brightness);
    }

    const contrast = (max - min) / 255;
    return Math.min(1, contrast * 1.5); // Scale up slightly
  }

  private calculateResolutionScore(width: number, height: number): number {
    // Minimum recommended resolution for quality analysis
    const minWidth = 640;
    const minHeight = 480;
    const targetWidth = 1280;
    const targetHeight = 720;

    const widthScore = Math.min(1, width / targetWidth);
    const heightScore = Math.min(1, height / targetHeight);

    // Bonus for meeting minimum requirements
    const meetsMinimum = width >= minWidth && height >= minHeight;

    return (widthScore * 0.5 + heightScore * 0.5) * (meetsMinimum ? 1 : 0.5);
  }

  private calculateOrientationScore(width: number, height: number): number {
    // Portrait orientation is typically better for mobile pose detection
    const isPortrait = height > width;
    const aspectRatio = isPortrait ? height / width : width / height;

    // Optimal aspect ratio is around 16:9 or 4:3
    const optimalRatio = 16 / 9;
    const ratioDeviation = Math.abs(aspectRatio - optimalRatio) / optimalRatio;

    // Penalize extreme aspect ratios
    const baseScore = Math.max(0, 1 - ratioDeviation);

    // Bonus for portrait (better for mobile pose detection)
    return isPortrait ? Math.min(1, baseScore * 1.2) : baseScore;
  }

  private calculateSubjectVisibility(imageData: ImageData): number {
    const { data, width, height } = imageData;

    // Simple center-weighted subject detection
    // Look for skin-tone colored pixels in the center region
    let centerPixels = 0;
    let skinTonePixels = 0;

    const centerX = width / 2;
    const centerY = height / 2;
    const regionWidth = width * 0.5;
    const regionHeight = height * 0.7;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Check if in center region
        const inCenter =
          x >= centerX - regionWidth / 2 &&
          x <= centerX + regionWidth / 2 &&
          y >= centerY - regionHeight / 2 &&
          y <= centerY + regionHeight / 2;

        if (inCenter) {
          centerPixels++;

          // Simple skin tone detection (HSV-based)
          const h = this.rgbToHsv(r, g, b).h;
          const s = this.rgbToHsv(r, g, b).v;
          const v = this.rgbToHsv(r, g, b).s;

          if (h >= 0 && h <= 50 && s >= 0.2 && v >= 0.3) {
            skinTonePixels++;
          }
        }
      }
    }

    const skinRatio = centerPixels > 0 ? skinTonePixels / centerPixels : 0;
    // Expect some skin tone in center for person visibility
    return Math.min(1, skinRatio * 5); // Scale up since skin ratio is usually low
  }

  private rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;

    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;

    if (d !== 0) {
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return { h: h * 360, s, v };
  }

  private getDefaultMetrics(): QualityMetrics {
    return {
      blurScore: 0.7,
      brightnessScore: 0.7,
      contrastScore: 0.7,
      resolutionScore: 0.7,
      orientationScore: 0.7,
      subjectVisibility: 0.5,
      overallQuality: 0.65,
    };
  }

  private updateMetrics(latencyMs: number, success: boolean): void {
    this.state.framesProcessed++;
    this.state.averageLatencyMs =
      this.state.averageLatencyMs * 0.8 + latencyMs * 0.2;

    if (!success) {
      this.state.lastError = "Frame processing failed";
    }
  }
}