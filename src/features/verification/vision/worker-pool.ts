/**
 * PDR-4 §77: Vision Worker Architecture
 * Offloads heavy vision inference to a Web Worker (client-side)
 * to prevent UI freezing during model processing.
 *
 * This module defines the worker contract and provides the
 * main-thread interface for communicating with vision workers.
 */

/**
 * §77: Worker message types for vision processing.
 */
export type WorkerMessage =
  | { type: "initialize"; config: WorkerConfig }
  | { type: "process_frame"; frame: ImageBitmap; timestamp: number; sequence: number }
  | { type: "process_photo"; photo: ImageBitmap; missionId: string }
  | { type: "set_model"; modelUrl: string; modelType: string }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "stop" }
  | { type: "get_health" };

export type WorkerResponse =
  | { type: "initialized"; capabilities: WorkerCapabilities }
  | { type: "observation"; observation: WorkerObservation; timestamp: number; sequence: number }
  | { type: "photo_result"; result: WorkerPhotoResult; missionId: string }
  | { type: "health"; status: WorkerHealthStatus }
  | { type: "error"; error: string; code?: string }
  | { type: "model_loaded"; modelType: string }
  | { type: "performance"; metrics: PerformanceMetrics };

export type WorkerConfig = {
  /** Maximum frames per second to process */
  maxFPS: number;
  /** Input resolution for model */
  inputWidth: number;
  inputHeight: number;
  /** Model to load */
  modelUrl?: string;
  modelType: "pose" | "object" | "scene" | "quality";
  /** Enable performance monitoring */
  enableMetrics: boolean;
};

export type WorkerCapabilities = {
  supportsWebGL: boolean;
  supportsWebNN: boolean;
  maxTextureSize: number;
  estimatedMemoryMB: number;
  preferredFPS: number;
};

export type WorkerObservation = {
  type: string;
  confidence: number;
  metrics: Record<string, number>;
  message?: string;
  landmarks?: Array<{ x: number; y: number; z: number; visibility?: number }>;
};

export type WorkerPhotoResult = {
  quality: "clear" | "partial" | "unreadable";
  issues: string[];
  objects?: Array<{ className: string; confidence: number; boundingBox: { x: number; y: number; w: number; h: number } }>;
  text?: string;
};

export type WorkerHealthStatus = {
  state: "idle" | "processing" | "error";
  framesProcessed: number;
  averageLatencyMs: number;
  memoryUsageMB: number;
  lastError?: string;
};

export type PerformanceMetrics = {
  inferenceTimeMs: number;
  preprocessTimeMs: number;
  postprocessTimeMs: number;
  fps: number;
  frameDrop: boolean;
};

/**
 * §77: Main-thread interface for managing vision workers.
 * Handles worker lifecycle, message passing, and fallback.
 */
export class VisionWorkerPool {
  private workers: Map<string, Worker> = new Map();
  private pendingCallbacks: Map<string, {
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
    timeout: ReturnType<typeof setTimeout>;
  }> = new Map();
  private healthStatus: Map<string, WorkerHealthStatus> = new Map();
  private performanceHistory: PerformanceMetrics[] = [];
  private maxWorkers: number;

  constructor(maxWorkers = 2) {
    this.maxWorkers = maxWorkers;
  }

  /**
   * §77: Initialize a vision worker for a specific provider.
   */
  async initializeWorker(
    workerId: string,
    config: WorkerConfig
  ): Promise<WorkerCapabilities> {
    if (this.workers.size >= this.maxWorkers) {
      throw new Error("Maximum worker pool size reached");
    }

    // In browser environment, create actual Web Worker
    if (typeof Worker !== "undefined") {
      const worker = new Worker(
        new URL("./vision-worker.worker.ts", import.meta.url),
        { type: "module" }
      );

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Worker initialization timed out"));
        }, 10000);

        this.pendingCallbacks.set(workerId, {
          resolve: resolve as (v: unknown) => void,
          reject,
          timeout,
        });

        worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
          this.handleWorkerMessage(workerId, event.data);
        };

        worker.onerror = (error) => {
          this.handleWorkerError(workerId, error.message);
        };

        worker.postMessage({ type: "initialize", config } satisfies WorkerMessage);
        this.workers.set(workerId, worker);
      });
    }

    // Server/non-browser fallback: return simulated capabilities
    return {
      supportsWebGL: false,
      supportsWebNN: false,
      maxTextureSize: 4096,
      estimatedMemoryMB: 256,
      preferredFPS: 15,
    };
  }

  /**
   * §77: Send a frame to a worker for processing.
   */
  async processFrame(
    workerId: string,
    frame: ImageBitmap,
    timestamp: number,
    sequence: number
  ): Promise<WorkerObservation> {
    const worker = this.workers.get(workerId);
    if (!worker) throw new Error(`Worker ${workerId} not found`);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Frame processing timed out"));
      }, 5000);

      this.pendingCallbacks.set(`${workerId}:frame:${sequence}`, {
        resolve: resolve as (v: unknown) => void,
        reject,
        timeout,
      });

      worker.postMessage({
        type: "process_frame",
        frame,
        timestamp,
        sequence,
      } satisfies WorkerMessage);
    });
  }

  /**
   * §77: Process a photo (snapshot mode).
   */
  async processPhoto(
    workerId: string,
    photo: ImageBitmap,
    missionId: string
  ): Promise<WorkerPhotoResult> {
    const worker = this.workers.get(workerId);
    if (!worker) throw new Error(`Worker ${workerId} not found`);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Photo processing timed out"));
      }, 10000);

      this.pendingCallbacks.set(`${workerId}:photo:${missionId}`, {
        resolve: resolve as (v: unknown) => void,
        reject,
        timeout,
      });

      worker.postMessage({
        type: "process_photo",
        photo,
        missionId,
      } satisfies WorkerMessage);
    });
  }

  /**
   * §77: Get health status for a worker.
   */
  getHealth(workerId: string): WorkerHealthStatus | null {
    return this.healthStatus.get(workerId) ?? null;
  }

  /**
   * §77: Get average performance across all workers.
   */
  getAveragePerformance(): PerformanceMetrics | null {
    if (this.performanceHistory.length === 0) return null;
    const last10 = this.performanceHistory.slice(-10);
    return {
      inferenceTimeMs: last10.reduce((s, m) => s + m.inferenceTimeMs, 0) / last10.length,
      preprocessTimeMs: last10.reduce((s, m) => s + m.preprocessTimeMs, 0) / last10.length,
      postprocessTimeMs: last10.reduce((s, m) => s + m.postprocessTimeMs, 0) / last10.length,
      fps: last10.reduce((s, m) => s + m.fps, 0) / last10.length,
      frameDrop: last10.some((m) => m.frameDrop),
    };
  }

  /**
   * §77: Stop and dispose of a worker.
   */
  async disposeWorker(workerId: string): Promise<void> {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    worker.postMessage({ type: "stop" } satisfies WorkerMessage);
    worker.terminate();
    this.workers.delete(workerId);
    this.healthStatus.delete(workerId);

    // Clear pending callbacks
    for (const [key, cb] of this.pendingCallbacks.entries()) {
      if (key.startsWith(workerId)) {
        clearTimeout(cb.timeout);
        cb.reject(new Error("Worker disposed"));
        this.pendingCallbacks.delete(key);
      }
    }
  }

  /**
   * §77: Dispose all workers.
   */
  async disposeAll(): Promise<void> {
    const workerIds = Array.from(this.workers.keys());
    for (const id of workerIds) {
      await this.disposeWorker(id);
    }
  }

  private handleWorkerMessage(workerId: string, message: WorkerResponse): void {
    switch (message.type) {
      case "initialized": {
        const cb = this.pendingCallbacks.get(workerId);
        if (cb) {
          clearTimeout(cb.timeout);
          cb.resolve(message.capabilities);
          this.pendingCallbacks.delete(workerId);
        }
        break;
      }
      case "observation": {
        const key = `${workerId}:frame:${message.sequence}`;
        const cb = this.pendingCallbacks.get(key);
        if (cb) {
          clearTimeout(cb.timeout);
          cb.resolve(message.observation);
          this.pendingCallbacks.delete(key);
        }
        break;
      }
      case "photo_result": {
        const key = `${workerId}:photo:${message.missionId}`;
        const cb = this.pendingCallbacks.get(key);
        if (cb) {
          clearTimeout(cb.timeout);
          cb.resolve(message.result);
          this.pendingCallbacks.delete(key);
        }
        break;
      }
      case "health": {
        this.healthStatus.set(workerId, message.status);
        break;
      }
      case "performance": {
        this.performanceHistory.push(message.metrics);
        if (this.performanceHistory.length > 100) {
          this.performanceHistory = this.performanceHistory.slice(-50);
        }
        break;
      }
      case "error": {
        this.handleWorkerError(workerId, message.error);
        break;
      }
    }
  }

  private handleWorkerError(workerId: string, error: string): void {
    // Reject all pending callbacks for this worker
    for (const [key, cb] of this.pendingCallbacks.entries()) {
      if (key.startsWith(workerId)) {
        clearTimeout(cb.timeout);
        cb.reject(new Error(error));
        this.pendingCallbacks.delete(key);
      }
    }

    this.healthStatus.set(workerId, {
      state: "error",
      framesProcessed: 0,
      averageLatencyMs: 0,
      memoryUsageMB: 0,
      lastError: error,
    });
  }
}

/**
 * §76-77: Device capability detection for vision processing.
 */
export function detectDeviceCapabilities(): {
  canRunPose: boolean;
  canRunObjectDetection: boolean;
  canRunOCR: boolean;
  recommendedFPS: number;
  recommendedResolution: { width: number; height: number };
  fallbackMode: "full" | "reduced" | "server_only";
} {
  if (typeof navigator === "undefined") {
    // Server environment
    return {
      canRunPose: false,
      canRunObjectDetection: false,
      canRunOCR: false,
      recommendedFPS: 10,
      recommendedResolution: { width: 320, height: 240 },
      fallbackMode: "server_only",
    };
  }

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    hardwareConcurrency?: number;
    gpu?: { requestAdapter: () => Promise<unknown> };
  };

  const memory = nav.deviceMemory ?? 4;
  const cores = nav.hardwareConcurrency ?? 4;

  // Low-end device detection
  const isLowEnd = memory <= 2 || cores <= 2;
  const isMidRange = memory <= 4 || cores <= 4;

  return {
    canRunPose: !isLowEnd,
    canRunObjectDetection: !isLowEnd,
    canRunOCR: true, // Tesseract.js works on most devices
    recommendedFPS: isLowEnd ? 6 : isMidRange ? 12 : 24,
    recommendedResolution: isLowEnd
      ? { width: 320, height: 240 }
      : isMidRange
        ? { width: 640, height: 480 }
        : { width: 1280, height: 720 },
    fallbackMode: isLowEnd ? "reduced" : "full",
  };
}
