"use client";

/**
 * PDR-4.2: Object Detection Foundation
 * Basic object detection using MediaPipe Object Detector.
 * Supports scene analysis and before/after comparison.
 */

import { ObjectDetector, FilesetResolver } from "@mediapipe/tasks-vision";
import type {
  VisionProvider,
  VisionCapability,
  ProcessingMode,
  FrameData,
  VisionContext,
  VisionResult,
  VisionObservation,
  BoundingBox,
  ProviderState,
} from "./types";

// ============================================================================
// Object Detection Provider
// ============================================================================

export type ObjectDetectionConfig = {
  modelComplexity: "lite" | "full";
  maxResults: number;
  minDetectionConfidence: number;
  enableTracking: boolean;
};

export class ObjectDetectionProvider implements VisionProvider {
  readonly id = "object-detection-provider";
  readonly type: VisionCapability = "object_detection";
  readonly processingMode: ProcessingMode = "snapshot";

  private objectDetector: ObjectDetector | null = null;
  private config: ObjectDetectionConfig;
  private state: ProviderState = {
    initialized: false,
    modelLoaded: false,
    processing: false,
    framesProcessed: 0,
    averageLatencyMs: 0,
  };

  // Tracking state
  private trackedObjects: Map<string, BoundingBox> = new Map();
  private objectIdCounter = 0;

  constructor(config?: Partial<ObjectDetectionConfig>) {
    this.config = {
      modelComplexity: config?.modelComplexity ?? "lite",
      maxResults: config?.maxResults ?? 10,
      minDetectionConfidence: config?.minDetectionConfidence ?? 0.5,
      enableTracking: config?.enableTracking ?? true,
    };
  }

  async initialize(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    this.objectDetector = await ObjectDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/object_detector/object_detector_${this.config.modelComplexity}/float16/object_detector_${this.config.modelComplexity}.task`,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      maxResults: this.config.maxResults,
    });

    this.state.initialized = true;
    this.state.modelLoaded = true;
  }

  async processFrame(frame: FrameData, _context: VisionContext): Promise<VisionResult> {
    if (!this.objectDetector) {
      return this.createErrorResult("Object detector not initialized");
    }

    const startTime = performance.now();
    this.state.processing = true;

    try {
      // Create ImageData from frame
      const imageData = new ImageData(
        new Uint8ClampedArray(frame.data),
        frame.width,
        frame.height
      );

      // Detect objects
      const results = this.objectDetector.detectForVideo(imageData, frame.timestamp);

      // Convert to our format
      const boundingBoxes = this.convertDetections(results.detections);

      // Update tracking if enabled
      if (this.config.enableTracking) {
        this.updateTracking(boundingBoxes);
      }

      // Create observation
      const observation: VisionObservation = {
        frameIndex: frame.frameIndex,
        timestamp: frame.timestamp,
        source: "camera_front",
        confidence: this.calculateOverallConfidence(boundingBoxes),
        boundingBoxes,
        metadata: {
          objectCount: boundingBoxes.length,
          labels: [...new Set(boundingBoxes.map((bb) => bb.label))],
        },
      };

      const processingTimeMs = performance.now() - startTime;
      this.updateMetrics(processingTimeMs, true);

      return {
        providerId: this.id,
        providerType: this.type,
        success: true,
        confidence: observation.confidence,
        observations: [observation],
        summary: {
          totalFrames: 1,
          processedFrames: 1,
          averageConfidence: observation.confidence,
          qualityScore: observation.confidence,
          detectedObjects: [...new Set(boundingBoxes.map((bb) => bb.label))],
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
    const allObservations: VisionObservation[] = [];
    const startTime = performance.now();

    for (const frame of frames) {
      const result = await this.processFrame(frame, context);
      allObservations.push(...result.observations);
    }

    const avgConfidence =
      allObservations.length > 0
        ? allObservations.reduce((sum, obs) => sum + obs.confidence, 0) /
          allObservations.length
        : 0;

    // Collect all unique labels
    const allLabels = new Set<string>();
    allObservations.forEach((obs) => {
      if (obs.boundingBoxes) {
        obs.boundingBoxes.forEach((bb) => allLabels.add(bb.label));
      }
    });

    return {
      providerId: this.id,
      providerType: this.type,
      success: allObservations.length > 0,
      confidence: avgConfidence,
      observations: allObservations,
      summary: {
        totalFrames: frames.length,
        processedFrames: allObservations.length,
        averageConfidence: avgConfidence,
        qualityScore: avgConfidence,
        detectedObjects: [...allLabels],
      },
      processingTimeMs: performance.now() - startTime,
    };
  }

  getState(): ProviderState {
    return { ...this.state };
  }

  async cleanup(): Promise<void> {
    if (this.objectDetector) {
      this.objectDetector.close();
      this.objectDetector = null;
    }
    this.state.initialized = false;
    this.trackedObjects.clear();
  }

  /**
   * Get tracked objects (for scene comparison)
   */
  getTrackedObjects(): Map<string, BoundingBox> {
    return new Map(this.trackedObjects);
  }

  /**
   * Compare two sets of bounding boxes for scene changes
   */
  static compareScenes(
    before: BoundingBox[],
    after: BoundingBox[],
    iouThreshold: number = 0.5
  ): {
    added: BoundingBox[];
    removed: BoundingBox[];
    moved: Array<{ before: BoundingBox; after: BoundingBox; iou: number }>;
    unchanged: BoundingBox[];
  } {
    const added: BoundingBox[] = [];
    const removed: BoundingBox[] = [];
    const moved: Array<{ before: BoundingBox; after: BoundingBox; iou: number }> = [];
    const unchanged: BoundingBox[] = [];

    // Match bounding boxes by label and IoU
    const matchedAfter = new Set<number>();

    for (const bBox of before) {
      let bestMatch: BoundingBox | null = null;
      let bestIoU = 0;
      let bestIndex = -1;

      for (let i = 0; i < after.length; i++) {
        if (matchedAfter.has(i)) continue;
        if (after[i].label !== bBox.label) continue;

        const iou = ObjectDetectionProvider.calculateIoU(bBox, after[i]);
        if (iou > bestIoU) {
          bestIoU = iou;
          bestMatch = after[i];
          bestIndex = i;
        }
      }

      if (bestMatch && bestIoU >= iouThreshold) {
        matchedAfter.add(bestIndex);
        if (bestIoU > 0.9) {
          unchanged.push(bBox);
        } else {
          moved.push({ before: bBox, after: bestMatch, iou: bestIoU });
        }
      } else {
        removed.push(bBox);
      }
    }

    // Remaining after boxes are added
    for (let i = 0; i < after.length; i++) {
      if (!matchedAfter.has(i)) {
        added.push(after[i]);
      }
    }

    return { added, removed, moved, unchanged };
  }

  /**
   * Calculate Intersection over Union (IoU)
   */
  static calculateIoU(a: BoundingBox, b: BoundingBox): number {
    const x1 = Math.max(a.x, b.x);
    const y1 = Math.max(a.y, b.y);
    const x2 = Math.min(a.x + a.width, b.x + b.width);
    const y2 = Math.min(a.y + a.height, b.y + b.height);

    const intersectionArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const aArea = a.width * a.height;
    const bArea = b.width * b.height;
    const unionArea = aArea + bArea - intersectionArea;

    return unionArea > 0 ? intersectionArea / unionArea : 0;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private convertDetections(
    detections: Array<{
      categories: Array<{
        categoryName: string;
        score: number;
        index: number;
      }>;
      boundingBox?: {
        originX: number;
        originY: number;
        width: number;
        height: number;
      };
    }>
  ): BoundingBox[] {
    const boxes: BoundingBox[] = [];

    for (const detection of detections) {
      if (detection.categories.length === 0) continue;
      if (!detection.boundingBox) continue;

      const category = detection.categories[0];
      const box: BoundingBox = {
        id: `obj_${this.objectIdCounter++}`,
        label: category.categoryName,
        confidence: category.score,
        x: detection.boundingBox.originX,
        y: detection.boundingBox.originY,
        width: detection.boundingBox.width,
        height: detection.boundingBox.height,
        class: category.categoryName,
      };

      boxes.push(box);
    }

    return boxes;
  }

  private updateTracking(boundingBoxes: BoundingBox[]): void {
    // Simple tracking based on label and position
    const newTracked = new Map<string, BoundingBox>();

    for (const box of boundingBoxes) {
      // Try to match with existing tracked objects
      let matched = false;
      for (const [id, tracked] of this.trackedObjects) {
        if (tracked.label === box.label) {
          const distance = Math.sqrt(
            Math.pow(box.x - tracked.x, 2) + Math.pow(box.y - tracked.y, 2)
          );
          if (distance < 100) {
            // Update existing track
            newTracked.set(id, { ...box, id });
            matched = true;
            break;
          }
        }
      }

      if (!matched) {
        // New object
        newTracked.set(box.id, box);
      }
    }

    this.trackedObjects = newTracked;
  }

  private calculateOverallConfidence(boundingBoxes: BoundingBox[]): number {
    if (boundingBoxes.length === 0) return 0;

    const avgConfidence =
      boundingBoxes.reduce((sum, bb) => sum + bb.confidence, 0) /
      boundingBoxes.length;

    // Bonus for multiple detections
    const countBonus = Math.min(0.2, boundingBoxes.length * 0.05);

    return Math.min(1, avgConfidence + countBonus);
  }

  private updateMetrics(latencyMs: number, success: boolean): void {
    this.state.framesProcessed++;
    this.state.averageLatencyMs =
      this.state.averageLatencyMs * 0.8 + latencyMs * 0.2;

    if (!success) {
      this.state.lastError = "Frame processing failed";
    }
  }

  private createErrorResult(error: string): VisionResult {
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
      processingTimeMs: 0,
      error,
    };
  }
}

// ============================================================================
// Scene Comparison Analyzer
// ============================================================================

export type SceneComparisonResult = {
  hasChanges: boolean;
  changeScore: number; // 0-1, higher = more changes
  addedObjects: string[];
  removedObjects: string[];
  movedObjects: string[];
  stabilityScore: number; // 0-1, higher = more stable
  recommendation: "pass" | "fail" | "review";
};

export class SceneComparisonAnalyzer {
  private referenceScene: BoundingBox[] | null = null;
  private comparisonHistory: SceneComparisonResult[] = [];

  /**
   * Set reference scene (before state)
   */
  setReferenceScene(boundingBoxes: BoundingBox[]): void {
    this.referenceScene = boundingBoxes;
  }

  /**
   * Compare current scene with reference
   */
  compareWithReference(currentScene: BoundingBox[]): SceneComparisonResult {
    if (!this.referenceScene) {
      return {
        hasChanges: true,
        changeScore: 1,
        addedObjects: currentScene.map((bb) => bb.label),
        removedObjects: [],
        movedObjects: [],
        stabilityScore: 0,
        recommendation: "review",
      };
    }

    const comparison = ObjectDetectionProvider.compareScenes(
      this.referenceScene,
      currentScene
    );

    // Calculate change score
    const totalObjects = Math.max(
      this.referenceScene.length,
      currentScene.length
    );
    const changedObjects =
      comparison.added.length + comparison.removed.length + comparison.moved.length;
    const changeScore = totalObjects > 0 ? changedObjects / totalObjects : 0;

    // Calculate stability score (inverse of change score, smoothed)
    const stabilityScore = 1 - changeScore;

    // Store in history
    this.comparisonHistory.push({
      hasChanges: changedObjects > 0,
      changeScore,
      addedObjects: [...new Set(comparison.added.map((bb) => bb.label))],
      removedObjects: [...new Set(comparison.removed.map((bb) => bb.label))],
      movedObjects: [
        ...new Set(comparison.moved.map((m) => m.after.label)),
      ],
      stabilityScore,
      recommendation: this.determineRecommendation(changeScore, comparison),
    });

    // Keep history manageable
    if (this.comparisonHistory.length > 10) {
      this.comparisonHistory.shift();
    }

    return this.comparisonHistory[this.comparisonHistory.length - 1];
  }

  /**
   * Get stability trend
   */
  getStabilityTrend(): "improving" | "stable" | "degrading" {
    if (this.comparisonHistory.length < 2) {
      return "stable";
    }

    const recent = this.comparisonHistory.slice(-3);
    const avgRecent =
      recent.reduce((sum, r) => sum + r.stabilityScore, 0) / recent.length;

    const older = this.comparisonHistory.slice(0, -3);
    if (older.length === 0) {
      return "stable";
    }

    const avgOlder =
      older.reduce((sum, r) => sum + r.stabilityScore, 0) / older.length;

    if (avgRecent > avgOlder + 0.1) {
      return "improving";
    } else if (avgRecent < avgOlder - 0.1) {
      return "degrading";
    }

    return "stable";
  }

  /**
   * Reset reference scene
   */
  reset(): void {
    this.referenceScene = null;
    this.comparisonHistory = [];
  }

  private determineRecommendation(
    changeScore: number,
    comparison: {
      added: BoundingBox[];
      removed: BoundingBox[];
      moved: Array<{ before: BoundingBox; after: BoundingBox; iou: number }>;
    }
  ): "pass" | "fail" | "review" {
    // No changes = pass
    if (changeScore === 0) {
      return "pass";
    }

    // Major changes (new objects added) = review
    if (comparison.added.length > 0) {
      return "review";
    }

    // Objects removed = might be suspicious
    if (comparison.removed.length > 2) {
      return "fail";
    }

    // Minor movements = pass
    if (changeScore < 0.3) {
      return "pass";
    }

    return "review";
  }
}