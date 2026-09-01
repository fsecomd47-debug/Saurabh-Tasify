"use client";

/**
 * PDR-4 §32-§38 + §75-§81: Pose verification runtime.
 *
 * - Loads MediaPipe PoseLandmarker with pinned model/WASM versions (§116).
 * - Runs detectForVideo directly on the production <video> element
 *   (no per-frame canvas copies).
 * - Feeds landmarks into the RepetitionEngine state machine.
 * - Adapts inference rate to device budget (§93): if processing time
 *   exceeds the frame budget, the target fps drops before the UI does.
 * - Model loads lazily, is cached across missions and disposed on
 *   memory pressure / page hide (§78/§79).
 */

import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import {
  RepetitionEngine,
  type RepEvent,
} from "./enhanced-rep-counter";

/* WASM + model URLs — CDN with retry to local fallback */
const WASM_URLS = [
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm",
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.0/wasm",
  "https://unpkg.com/@mediapipe/tasks-vision@1.0.1/wasm",
];
const MODEL_URLS = [
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/pose_landmarker_lite.task",
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float32/pose_landmarker_lite.task",
];

const MAX_RETRIES = 4;
const RETRY_DELAY_MS = 1000;
const LOAD_TIMEOUT_MS = 25000;

export type PoseRuntimeStatus =
  | "unloaded"
  | "loading"
  | "ready"
  | "active"
  | "error";

export type PoseFrameOutcome = {
  repEvent: RepEvent | null;
  personVisible: boolean;
  trackingConfidence: number;
  inferenceMs: number;
  currentFps: number;
};

export type PoseRuntimeCallbacks = {
  onRep?: (event: RepEvent) => void;
  onFeedback?: (message: string) => void;
  onVisibility?: (visible: boolean) => void;
};

/* Model cache — reuse across missions (§79). */
let cachedLandmarker: PoseLandmarker | null = null;
let loadPromise: Promise<PoseLandmarker> | null = null;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function loadPoseModel(): Promise<PoseLandmarker> {
  if (cachedLandmarker) return cachedLandmarker;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    let lastErr: unknown;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const wasmIdx = Math.min(attempt - 1, WASM_URLS.length - 1);
      const modelIdx = Math.min(Math.floor((attempt - 1) / 2), MODEL_URLS.length - 1);
      const wasmUrl = WASM_URLS[wasmIdx];
      const modelUrl = MODEL_URLS[modelIdx];

      for (const delegate of ["GPU", "CPU"] as const) {
        try {
          console.log(`[pose-runtime] Attempt ${attempt}/${MAX_RETRIES}: loading WASM from ${wasmUrl} (${delegate})`);

          const fileset = await withTimeout(
            FilesetResolver.forVisionTasks(wasmUrl),
            LOAD_TIMEOUT_MS,
            "WASM load"
          );

          console.log(`[pose-runtime] WASM loaded, loading model from ${modelUrl}`);

          const landmarker = await withTimeout(
            PoseLandmarker.createFromOptions(fileset, {
              baseOptions: { modelAssetPath: modelUrl, delegate },
              runningMode: "VIDEO",
              numPoses: 1,
              minPoseDetectionConfidence: 0.5,
              minPosePresenceConfidence: 0.5,
              minTrackingConfidence: 0.5,
            }),
            LOAD_TIMEOUT_MS,
            "Model init"
          );

          cachedLandmarker = landmarker;
          console.log(`[pose-runtime] Model loaded successfully with ${delegate} delegate`);
          return landmarker;
        } catch (err) {
          lastErr = err;
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[pose-runtime] Attempt ${attempt}/${MAX_RETRIES} (${delegate}) failed: ${msg}`);
        }
      }

      if (attempt < MAX_RETRIES) {
        const backoff = RETRY_DELAY_MS * attempt;
        console.log(`[pose-runtime] Retrying in ${backoff}ms...`);
        await delay(backoff);
      }
    }

    const finalMsg = lastErr instanceof Error ? lastErr.message : String(lastErr);
    throw new Error(`Pose model failed to load after ${MAX_RETRIES} attempts: ${finalMsg}`);
  })();

  try {
    return await loadPromise;
  } catch (err) {
    loadPromise = null;
    throw err;
  }
}

export async function disposePoseModel(): Promise<void> {
  if (cachedLandmarker) {
    try {
      cachedLandmarker.close();
    } catch {
      // double-dispose is harmless
    }
    cachedLandmarker = null;
    loadPromise = null;
  }
}

export class PoseRuntime {
  private engine: RepetitionEngine;
  private landmarker: PoseLandmarker | null = null;
  private status: PoseRuntimeStatus = "unloaded";
  private callbacks: PoseRuntimeCallbacks;

  /* Adaptive rate control */
  private targetIntervalMs = 1000 / 15; // start conservative
  private lastInferenceAt = 0;
  private emaInferenceMs = 0;
  private readonly maxFps = 24;
  private readonly minFps = 6;

  /* Visibility stability for calibration */
  private visibleFrames = 0;
  private wasVisible = false;

  /* Video timestamp bookkeeping — MediaPipe requires monotonic ts */
  private lastVideoTimestamp = -1;

  constructor(
    activityType: string,
    targetReps: number,
    callbacks: PoseRuntimeCallbacks = {}
  ) {
    this.engine = new RepetitionEngine({
      activityType,
      targetReps,
      enableJitterFilter: true,
      enableCooldown: true,
    });
    this.callbacks = callbacks;
  }

  getStatus(): PoseRuntimeStatus {
    return this.status;
  }

  getRepCount(): number {
    return this.engine.getRepCount();
  }

  isComplete(): boolean {
    return this.engine.isComplete();
  }

  /** §78: load only when required; cached after first mission. */
  async ensureModel(): Promise<void> {
    if (this.landmarker || this.status === "loading") return;
    this.status = "loading";
    try {
      this.landmarker = await loadPoseModel();
      this.status = "ready";
    } catch (err) {
      this.status = "error";
      throw err;
    }
  }

  /**
   * Process one video frame. Returns null when the frame should be
   * skipped (rate budget) or no result is available. When `counting`
   * is false the state machine is held still — calibration frames
   * never produce reps.
   */
  processVideoFrame(video: HTMLVideoElement, nowMs: number, counting = true): PoseFrameOutcome | null {
    if (!this.landmarker || this.status !== "ready") return null;

    const sinceLast = nowMs - this.lastInferenceAt;
    if (sinceLast < this.targetIntervalMs) return null;
    this.lastInferenceAt = nowMs;

    let timestampMs = Math.round(video.currentTime * 1000);
    if (timestampMs <= this.lastVideoTimestamp) {
      timestampMs = this.lastVideoTimestamp + 1;
    }
    this.lastVideoTimestamp = timestampMs;

    const t0 = performance.now();
    let result;
    try {
      result = this.landmarker.detectForVideo(video, timestampMs);
    } catch {
      return {
        repEvent: null,
        personVisible: false,
        trackingConfidence: 0,
        inferenceMs: this.emaInferenceMs,
        currentFps: Math.round(1000 / this.targetIntervalMs),
      };
    }
    const inferenceMs = performance.now() - t0;

    /* §93: adapt inference frequency to measured budget. */
    this.emaInferenceMs = this.emaInferenceMs === 0 ? inferenceMs : this.emaInferenceMs * 0.8 + inferenceMs * 0.2;
    if (this.emaInferenceMs > this.targetIntervalMs * 0.6) {
      const nextFps = Math.max(this.minFps, Math.floor(1000 / this.targetIntervalMs) - 3);
      this.targetIntervalMs = 1000 / nextFps;
    } else if (this.emaInferenceMs < this.targetIntervalMs * 0.25) {
      const nextFps = Math.min(this.maxFps, Math.floor(1000 / this.targetIntervalMs) + 2);
      this.targetIntervalMs = 1000 / nextFps;
    }

    const landmarks = result.landmarks?.[0];
    if (!landmarks || landmarks.length < 33) {
      if (this.wasVisible) {
        this.wasVisible = false;
        this.callbacks.onVisibility?.(false);
      }
      return {
        repEvent: null,
        personVisible: false,
        trackingConfidence: 0,
        inferenceMs,
        currentFps: Math.round(1000 / this.targetIntervalMs),
      };
    }

    const lm = toEngineLandmarks(landmarks);
    const observation = buildObservation(lm, timestampMs);

    const before = this.engine.getRepCount();

    if (!counting) {
      return {
        repEvent: null,
        personVisible: averageKeyVisibility(lm) > 0.55,
        trackingConfidence: averageKeyVisibility(lm),
        inferenceMs,
        currentFps: Math.round(1000 / this.targetIntervalMs),
      };
    }

    const repEvent = this.engine.processObservation(observation);

    const visibility = averageKeyVisibility(lm);
    const personVisible = visibility > 0.55;
    if (personVisible !== this.wasVisible) {
      this.wasVisible = personVisible;
      this.callbacks.onVisibility?.(personVisible);
    }

    if (repEvent.repCount > before) {
      this.callbacks.onRep?.(repEvent);
    }
    if (repEvent.feedback) {
      this.callbacks.onFeedback?.(repEvent.feedback);
    } else if (repEvent.state === "bottom_confirmed") {
      this.callbacks.onFeedback?.("Now push back up");
    } else if (repEvent.state === "top_confirmed" && repEvent.quality !== "good") {
      this.callbacks.onFeedback?.("Go a little deeper next time");
    }

    return {
      repEvent,
      personVisible,
      trackingConfidence: visibility,
      inferenceMs,
      currentFps: Math.round(1000 / this.targetIntervalMs),
    };
  }

  dispose(): void {
    this.engine.reset();
    this.landmarker = null;
    this.status = "unloaded";
    this.visibleFrames = 0;
  }
}

/* ─────────────────── Landmark plumbing ─────────────────── */

type MediaPipeLandmark = { x: number; y: number; z: number; visibility?: number };

function toEngineLandmarks(mp: MediaPipeLandmark[]) {
  const names = [
    "nose", "left_eye_inner", "left_eye", "left_eye_outer", "right_eye_inner",
    "right_eye", "right_eye_outer", "left_ear", "right_ear", "mouth_left",
    "mouth_right", "left_shoulder", "right_shoulder", "left_elbow",
    "right_elbow", "left_wrist", "right_wrist", "left_pinky", "right_pinky",
    "left_index", "right_index", "left_thumb", "right_thumb", "left_hip",
    "right_hip", "left_knee", "right_knee", "left_ankle", "right_ankle",
    "left_heel", "right_heel", "left_foot_index", "right_foot_index",
  ];
  return mp.map((p, i) => ({
    id: String(i),
    name: names[i] ?? `lm_${i}`,
    x: p.x,
    y: p.y,
    z: p.z,
    visibility: p.visibility ?? 1,
  }));
}

type EngineLandmark = ReturnType<typeof toEngineLandmarks>[number];

function buildObservation(landmarks: EngineLandmark[], timestampMs: number) {
  return {
    frameIndex: timestampMs,
    timestamp: timestampMs,
    source: "camera_front" as const,
    confidence: averageKeyVisibility(landmarks),
    landmarks,
    formSignals: [],
    metadata: {},
  };
}

const KEY_LANDMARK_INDICES = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26];

function averageKeyVisibility(landmarks: EngineLandmark[]): number {
  let sum = 0;
  let n = 0;
  for (const i of KEY_LANDMARK_INDICES) {
    const lm = landmarks[i];
    if (lm) {
      sum += lm.visibility;
      n++;
    }
  }
  return n > 0 ? sum / n : 0;
}
