/**
 * PDR-4.3 §127-§136: Frame Throttling & Backpressure
 * Video processing decoupled from rendering.
 * Uses latest-frame-wins strategy, frame dropping, and backpressure.
 *
 * Camera 30fps → Model 15fps → latest frame wins, not queue all 30.
 */

export type FrameThrottlerConfig = {
  targetFps: number;
  maxQueueSize: number;
  dropPolicy: "latest_wins" | "oldest_first" | "priority";
};

const DEFAULT_CONFIG: FrameThrottlerConfig = {
  targetFps: 15,
  maxQueueSize: 2,
  dropPolicy: "latest_wins",
};

export class FrameThrottler {
  private config: FrameThrottlerConfig;
  private lastProcessTime = 0;
  private frameInterval: number;
  private pendingFrame: VideoFrame | null = null;
  private processing = false;
  private droppedFrameCount = 0;
  private processedFrameCount = 0;

  constructor(config?: Partial<FrameThrottlerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.frameInterval = 1000 / this.config.targetFps;
  }

  /**
   * Submit a frame for processing.
   * Returns true if the frame was accepted, false if dropped.
   */
  submitFrame(frame: VideoFrame): boolean {
    const now = performance.now();
    const timeSinceLastProcess = now - this.lastProcessTime;

    // If we're currently processing, apply backpressure
    if (this.processing) {
      if (this.config.dropPolicy === "latest_wins") {
        // Replace pending frame with latest
        if (this.pendingFrame && this.pendingFrame !== frame) {
          this.pendingFrame.close();
          this.droppedFrameCount++;
        }
        this.pendingFrame = frame;
        return true;
      }
      // Drop the frame
      frame.close();
      this.droppedFrameCount++;
      return false;
    }

    // Throttle: not enough time since last process
    if (timeSinceLastProcess < this.frameInterval) {
      if (this.config.dropPolicy === "latest_wins") {
        if (this.pendingFrame && this.pendingFrame !== frame) {
          this.pendingFrame.close();
          this.droppedFrameCount++;
        }
        this.pendingFrame = frame;
        return true;
      }
      frame.close();
      this.droppedFrameCount++;
      return false;
    }

    // Process immediately
    this.lastProcessTime = now;
    this.processedFrameCount++;
    return true;
  }

  /**
   * Get the next frame to process (either the submitted one or the pending one).
   */
  getNextFrame(): VideoFrame | null {
    if (this.pendingFrame) {
      const frame = this.pendingFrame;
      this.pendingFrame = null;
      this.lastProcessTime = performance.now();
      this.processedFrameCount++;
      return frame;
    }
    return null;
  }

  markProcessing(): void {
    this.processing = true;
  }

  markDone(): void {
    this.processing = false;
  }

  getStats(): {
    processed: number;
    dropped: number;
    dropRate: number;
    currentFps: number;
  } {
    const total = this.processedFrameCount + this.droppedFrameCount;
    return {
      processed: this.processedFrameCount,
      dropped: this.droppedFrameCount,
      dropRate: total > 0 ? this.droppedFrameCount / total : 0,
      currentFps: this.config.targetFps,
    };
  }

  reset(): void {
    if (this.pendingFrame) {
      this.pendingFrame.close();
      this.pendingFrame = null;
    }
    this.processing = false;
    this.lastProcessTime = 0;
    this.droppedFrameCount = 0;
    this.processedFrameCount = 0;
  }

  dispose(): void {
    this.reset();
  }
}

/**
 * PDR-4.3 §55: Black Frame Detection
 * Uses luminance-based strategy, not just RGB < 5.
 * Robust thresholding for visually black frames.
 */
export function detectBlackFrame(
  source: ImageData | HTMLCanvasElement,
  options?: {
    luminanceThreshold?: number;
    sampleStep?: number;
    blackPixelRatio?: number;
  }
): { isBlack: boolean; luminance: number; blackPixelRatio: number } {
  const defaults = {
    luminanceThreshold: 15,
    sampleStep: 4,
    blackPixelRatio: 0.95,
  };
  const opts = { ...defaults, ...options };

  let width = 0;
  let height = 0;
  let pixels: Uint8ClampedArray;

  if (source instanceof HTMLCanvasElement) {
    const ctx = source.getContext("2d", { willReadFrequently: true });
    if (!ctx) return { isBlack: true, luminance: 0, blackPixelRatio: 1 };
    width = source.width;
    height = source.height;
    const imgData = ctx.getImageData(0, 0, width, height);
    pixels = imgData.data;
  } else {
    width = source.width;
    height = source.height;
    pixels = source.data;
  }

  let totalLuminance = 0;
  let blackPixels = 0;
  let sampledPixels = 0;

  for (let y = 0; y < height; y += opts.sampleStep) {
    for (let x = 0; x < width; x += opts.sampleStep) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];

      // ITU-R BT.601 luminance
      const luminance = r * 0.299 + g * 0.587 + b * 0.114;
      totalLuminance += luminance;

      if (luminance < opts.luminanceThreshold) {
        blackPixels++;
      }
      sampledPixels++;
    }
  }

  const avgLuminance = sampledPixels > 0 ? totalLuminance / sampledPixels : 0;
  const blackRatio = sampledPixels > 0 ? blackPixels / sampledPixels : 1;

  return {
    isBlack: blackRatio >= opts.blackPixelRatio,
    luminance: avgLuminance,
    blackPixelRatio: blackRatio,
  };
}

/**
 * PDR-4.3 §56: Canvas Optimization
 * Creates a canvas context optimized for repeated readbacks.
 */
export function createOptimizedCanvas(
  width: number,
  height: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", {
    willReadFrequently: true,
    alpha: false,
    desynchronized: true,
  });

  if (!ctx) {
    throw new Error("Failed to create optimized canvas context");
  }

  return { canvas, ctx };
}

/**
 * Capture a frame from a video element to an optimized canvas.
 */
export function captureFrame(
  video: HTMLVideoElement,
  targetCanvas?: HTMLCanvasElement
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const width = video.videoWidth;
  const height = video.videoHeight;

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  if (targetCanvas) {
    targetCanvas.width = width;
    targetCanvas.height = height;
    canvas = targetCanvas;
    const context = canvas.getContext("2d", {
      willReadFrequently: true,
      alpha: false,
      desynchronized: true,
    });
    if (!context) throw new Error("Failed to get canvas context");
    ctx = context;
  } else {
    const result = createOptimizedCanvas(width, height);
    canvas = result.canvas;
    ctx = result.ctx;
  }

  ctx.drawImage(video, 0, 0, width, height);
  return { canvas, ctx };
}

/**
 * Get image data from a canvas with optimized readback.
 */
export function getImageData(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): ImageData {
  return ctx.getImageData(0, 0, width, height);
}
