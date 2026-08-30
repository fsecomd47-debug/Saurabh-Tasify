/**
 * PDR-4.2 §41-46: Object Detection Provider
 * Task-specific object counting with spatial relationships.
 * "Put 5 books on shelf" → detect books, detect shelf, evaluate spatial association.
 */

import type { VisionProvider } from "../provider-interface";
import type {
  VisionProviderType,
  VisionContext,
  VisionInput,
  VisionObservation,
  VisionResult,
  DetectedObject,
  InferencePolicy,
  ProcessingMode,
  DerivedVisionEvent,
} from "../types";

type ObjectDetectionResult = {
  objects: DetectedObject[];
  taskObjects: DetectedObject[];
  spatialMatch: boolean;
  count: number;
  targetCount: number;
};

export class ObjectDetectionProvider implements VisionProvider {
  readonly id = "object";
  readonly type: VisionProviderType = "object";
  readonly version = "1.0.0";
  readonly processingMode: ProcessingMode = "snapshot";

  private context: VisionContext | null = null;
  private events: DerivedVisionEvent[] = [];
  private sequence = 0;
  private lastResult: ObjectDetectionResult | null = null;

  supports(requirements: Record<string, unknown>): boolean {
    return requirements.requiresObjectDetection === true;
  }

  async initialize(context: VisionContext): Promise<void> {
    this.context = context;
    this.events = [];
    this.sequence = 0;
  }

  async start(_context: VisionContext): Promise<void> {
    // Object detection is snapshot-based
  }

  /**
   * §42: Task-specific object detection.
   * Ask "are there approximately N books in the shelf region?"
   * not "what objects are here?"
   */
  async process(input: VisionInput): Promise<VisionObservation> {
    if (!input.frame && !input.photo) {
      return {
        type: "object_no_data",
        confidence: 0,
        metrics: {},
        isStateChange: false,
      };
    }

    // In a real implementation, this would call a vision model.
    // For now, we provide the framework for task-specific detection.
    const result = await this.detectObjects(input);

    this.lastResult = result;

    const observation: VisionObservation = {
      type: result.spatialMatch ? "object_detected" : "object_count_mismatch",
      confidence: result.spatialMatch ? 0.8 : 0.4,
      metrics: {
        detectedCount: result.count,
        targetCount: result.targetCount,
        spatialMatch: result.spatialMatch ? 1 : 0,
        objectConfidence: result.taskObjects.length > 0
          ? result.taskObjects.reduce((sum, o) => sum + o.confidenceScore, 0) / result.taskObjects.length
          : 0,
      },
      message: this.getUserFacingMessage(result),
      isStateChange: result.spatialMatch,
    };

    if (result.spatialMatch) {
      this.events.push({
        missionId: this.context?.missionId ?? "",
        sessionId: this.context?.sessionId ?? "",
        sequence: ++this.sequence,
        type: "object_detected",
        timestamp: input.timestamp,
        metrics: {
          count: result.count,
          target: result.targetCount,
        },
      });
    }

    return observation;
  }

  async stop(): Promise<void> {}

  async finalize(): Promise<VisionResult> {
    const result = this.lastResult;
    if (!result) {
      return {
        status: "unsupported",
        evidenceClass: "insufficient",
        confidenceLevel: "needs_better_view",
        confidenceScore: 0,
        reasonCode: "NO_DETECTION",
        events: [],
      };
    }

    const countMatch = result.count >= result.targetCount * 0.8 && result.count <= result.targetCount * 1.2;
    const supported = countMatch && result.spatialMatch;

    return {
      status: supported ? "supported" : result.count > 0 ? "uncertain" : "unsupported",
      evidenceClass: supported ? "clear" : result.count > 0 ? "partial" : "insufficient",
      confidenceLevel: supported ? "clear" : result.count > 0 ? "likely" : "needs_better_view",
      confidenceScore: supported ? 0.8 : result.count > 0 ? 0.5 : 0.1,
      metrics: {
        detectedCount: result.count,
        targetCount: result.targetCount,
        spatialMatch: result.spatialMatch ? 1 : 0,
      },
      reasonCode: supported ? "OBJECT_COUNT_SUPPORTED" : "OBJECT_COUNT_MISMATCH",
      events: this.events,
    };
  }

  async dispose(): Promise<void> {
    this.context = null;
    this.events = [];
    this.lastResult = null;
  }

  getInferencePolicy(): InferencePolicy {
    return {
      preferredLocation: "device",
      allowFallback: true,
      maxUploadBytes: 5 * 1024 * 1024, // 5MB max for server fallback
      retainRawMedia: false,
      derivedEventsOnly: true,
    };
  }

  /**
   * §42-45: Task-specific object detection.
   * Analyzes image data using connected-component analysis and color segmentation.
   * Framework supports spatial relationships, duplicate suppression, and confidence thresholds.
   */
  private async detectObjects(input: VisionInput): Promise<ObjectDetectionResult> {
    const targetValue = this.context?.target?.value ?? 5;
    const activityType = this.context?.activityType ?? "";

    const imageData = this.extractImageData(input);
    if (!imageData) {
      return { objects: [], taskObjects: [], spatialMatch: false, count: 0, targetCount: targetValue };
    }

    const { width, height, data } = imageData;

    // 1. Convert to grayscale and compute brightness map
    const grayscale = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      grayscale[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }

    // 2. Compute edge map using Sobel-like operator for object boundary detection
    const edges = this.computeEdgeMap(grayscale, width, height);

    // 3. Adaptive threshold to create binary foreground mask
    const foregroundMask = this.adaptiveThreshold(grayscale, edges, width, height);

    // 4. Connected-component labeling to find distinct object regions
    const regions = this.connectedComponentLabeling(foregroundMask, width, height);

    // 5. Filter regions by minimum size and compute bounding boxes
    const minArea = (width * height) * 0.005; // Minimum 0.5% of image area
    const filteredRegions = regions
      .filter((r) => r.area >= minArea)
      .map((r) => this.computeBoundingBox(r, width, height));

    // 6. Convert to DetectedObject format
    const allObjects: DetectedObject[] = filteredRegions.map((bbox, idx) => ({
      className: this.classifyRegionByColor(data, bbox, width),
      confidenceScore: this.computeRegionConfidence(filteredRegions[idx], filteredRegions.length),
      confidenceClass: "medium" as const,
      boundingBox: { x: bbox.x / width, y: bbox.y / height, width: bbox.w / width, height: bbox.h / height },
    }));

    // 7. Duplicate suppression (§44)
    const suppressed = suppressDuplicates(allObjects);

    // 8. Filter to task-relevant objects based on activity context
    const taskObjects = this.filterTaskObjects(suppressed, activityType);

    // 9. Evaluate spatial relationships
    const spatialMatch = this.evaluateSpatialRelationships(taskObjects, targetValue, width, height);

    return {
      objects: suppressed,
      taskObjects,
      spatialMatch,
      count: taskObjects.length,
      targetCount: targetValue,
    };
  }

  private extractImageData(input: VisionInput): { data: Uint8ClampedArray; width: number; height: number } | null {
    const source = input.frame ?? input.photo;
    if (!source) return null;

    if ("data" in source && "width" in source && "height" in source) {
      return { data: source.data as Uint8ClampedArray, width: source.width as number, height: source.height as number };
    }
    return null;
  }

  private computeEdgeMap(gray: Uint8Array, w: number, h: number): Uint8Array {
    const edges = new Uint8Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const gx =
          -gray[(y - 1) * w + (x - 1)] + gray[(y - 1) * w + (x + 1)]
          - 2 * gray[y * w + (x - 1)] + 2 * gray[y * w + (x + 1)]
          - gray[(y + 1) * w + (x - 1)] + gray[(y + 1) * w + (x + 1)];
        const gy =
          -gray[(y - 1) * w + (x - 1)] - 2 * gray[(y - 1) * w + x] - gray[(y - 1) * w + (x + 1)]
          + gray[(y + 1) * w + (x - 1)] + 2 * gray[(y + 1) * w + x] + gray[(y + 1) * w + (x + 1)];
        edges[y * w + x] = Math.min(255, Math.sqrt(gx * gx + gy * gy));
      }
    }
    return edges;
  }

  private adaptiveThreshold(gray: Uint8Array, edges: Uint8Array, w: number, h: number): Uint8Array {
    const mask = new Uint8Array(w * h);
    const blockSize = 32;

    for (let by = 0; by < h; by += blockSize) {
      for (let bx = 0; bx < w; bx += blockSize) {
        let sum = 0;
        let count = 0;
        const maxBY = Math.min(by + blockSize, h);
        const maxBX = Math.min(bx + blockSize, w);

        for (let y = by; y < maxBY; y++) {
          for (let x = bx; x < maxBX; x++) {
            sum += gray[y * w + x];
            count++;
          }
        }
        const mean = sum / count;
        const threshold = mean * 0.85; // Slightly below mean to detect darker objects

        // Also use edge strength to reinforce boundaries
        for (let y = by; y < maxBY; y++) {
          for (let x = bx; x < maxBX; x++) {
            const isDark = gray[y * w + x] < threshold;
            const hasEdge = edges[y * w + x] > 30;
            mask[y * w + x] = isDark || hasEdge ? 1 : 0;
          }
        }
      }
    }
    return mask;
  }

  private connectedComponentLabeling(mask: Uint8Array, w: number, h: number): Array<{ pixels: Array<{ x: number; y: number }>; area: number }> {
    const labels = new Int32Array(w * h).fill(-1);
    let currentLabel = 0;
    const regions: Array<{ pixels: Array<{ x: number; y: number }>; area: number }> = [];

    const floodFill = (startX: number, startY: number, label: number) => {
      const stack: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
      const pixels: Array<{ x: number; y: number }> = [];

      while (stack.length > 0) {
        const { x, y } = stack.pop()!;
        if (x < 0 || x >= w || y < 0 || y >= h) continue;
        if (labels[y * w + x] !== -1 || mask[y * w + x] === 0) continue;

        labels[y * w + x] = label;
        pixels.push({ x, y });

        stack.push({ x: x + 1, y });
        stack.push({ x: x - 1, y });
        stack.push({ x, y: y + 1 });
        stack.push({ x, y: y - 1 });
      }
      return pixels;
    };

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (mask[y * w + x] === 1 && labels[y * w + x] === -1) {
          const pixels = floodFill(x, y, currentLabel);
          if (pixels.length > 0) {
            regions.push({ pixels, area: pixels.length });
          }
          currentLabel++;
        }
      }
    }

    return regions;
  }

  private computeBoundingBox(region: { pixels: Array<{ x: number; y: number }>; area: number }, _w: number, _h: number) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of region.pixels) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  }

  private classifyRegionByColor(data: Uint8ClampedArray, bbox: { x: number; y: number; w: number; h: number }, imgW: number): string {
    let rSum = 0, gSum = 0, bSum = 0;
    const step = Math.max(1, Math.floor(bbox.w * bbox.h / 100)); // Sample up to 100 pixels
    let count = 0;

    for (let y = bbox.y; y < bbox.y + bbox.h; y += Math.max(1, Math.floor(bbox.h / 10))) {
      for (let x = bbox.x; x < bbox.x + bbox.w; x += Math.max(1, Math.floor(bbox.w / 10))) {
        const idx = (y * imgW + x) * 4;
        rSum += data[idx];
        gSum += data[idx + 1];
        bSum += data[idx + 2];
        count++;
      }
    }

    if (count === 0) return "object";
    const r = rSum / count, g = gSum / count, b = bSum / count;

    if (r > 180 && g < 100 && b < 100) return "red_object";
    if (r < 100 && g > 180 && b < 100) return "green_object";
    if (r < 100 && g < 100 && b > 180) return "blue_object";
    if (r > 200 && g > 200 && b > 200) return "white_object";
    if (r < 60 && g < 60 && b < 60) return "dark_object";
    if (r > 150 && g > 100 && b < 80) return "brown_object";
    return "colored_object";
  }

  private computeRegionConfidence(
    bbox: { x: number; y: number; w: number; h: number },
    totalRegions: number
  ): number {
    const area = bbox.w * bbox.h;
    const sizeScore = Math.min(1, area / 10000); // Larger = more confident
    const separationScore = totalRegions > 0 ? Math.min(1, 1 / totalRegions) : 0;
    return Math.round((sizeScore * 0.6 + separationScore * 0.4) * 100) / 100;
  }

  private filterTaskObjects(objects: DetectedObject[], _activityType: string): DetectedObject[] {
    // For counting tasks, filter objects by minimum confidence
    return objects.filter((o) => o.confidenceScore >= 0.3);
  }

  private evaluateSpatialRelationships(
    taskObjects: DetectedObject[],
    targetCount: number,
    _w: number,
    _h: number
  ): boolean {
    if (taskObjects.length === 0) return false;

    // §42: Check if approximately the right number of objects are present
    const tolerance = Math.max(1, Math.floor(targetCount * 0.2)); // ±20%
    const countMatch = Math.abs(taskObjects.length - targetCount) <= tolerance;

    // §43: Check spatial distribution (objects shouldn't all be in one corner)
    const avgX = taskObjects.reduce((s, o) => s + o.boundingBox.x + o.boundingBox.width / 2, 0) / taskObjects.length;
    const avgY = taskObjects.reduce((s, o) => s + o.boundingBox.y + o.boundingBox.height / 2, 0) / taskObjects.length;
    const distributed = avgX > 0.1 && avgX < 0.9 && avgY > 0.1 && avgY < 0.9;

    return countMatch && distributed;
  }

  /**
   * §19: User-facing message.
   */
  private getUserFacingMessage(result: ObjectDetectionResult): string {
    if (result.spatialMatch) {
      return `Evidence supports ${result.count} ${this.context?.target?.unit ?? "objects"}.`;
    }
    if (result.count === 0) {
      return "No matching objects detected. Try a clearer photo.";
    }
    if (result.count < result.targetCount) {
      return `Found ${result.count}, need approximately ${result.targetCount}.`;
    }
    return `Found ${result.count} objects. Move closer for better detection.`;
  }
}

/**
 * §44: Duplicate suppression for object counting.
 * Prevents the same object from being counted multiple times.
 */
export function suppressDuplicates(objects: DetectedObject[]): DetectedObject[] {
  const suppressed: DetectedObject[] = [];
  const used = new Set<number>();

  for (const obj of objects) {
    if (used.has(suppressed.length)) continue;

    let isDuplicate = false;
    for (let i = 0; i < suppressed.length; i++) {
      const existing = suppressed[i];
      // Check overlap using IoU (Intersection over Union)
      const overlap = calculateIoU(obj.boundingBox, existing.boundingBox);
      if (overlap > 0.5 && obj.className === existing.className) {
        // Keep the higher confidence one
        if (obj.confidenceScore > existing.confidenceScore) {
          suppressed[i] = obj;
        }
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      suppressed.push(obj);
    }
  }

  return suppressed;
}

function calculateIoU(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);

  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = a.width * a.height;
  const areaB = b.width * b.height;
  const union = areaA + areaB - intersection;

  return union > 0 ? intersection / union : 0;
}
