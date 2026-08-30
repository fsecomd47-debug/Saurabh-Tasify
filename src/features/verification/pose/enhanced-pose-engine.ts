"use client";

/**
 * PDR-4.2: Enhanced Pose Detection Engine
 * Real-time pose detection with joint geometry, form signals, and jitter filtering.
 * Uses MediaPipe Vision for on-device pose detection.
 */

import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import type {
  Landmark,
  JointAngle,
  FormSignal,
  VisionObservation,
  VisionProvider,
  VisionCapability,
  ProcessingMode,
  FrameData,
  VisionContext,
  VisionResult,
  ProviderState,
} from "../vision/types";

// ============================================================================
// MediaPipe Pose Landmark Indices
// ============================================================================

export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

// ============================================================================
// Joint Geometry Calculator
// ============================================================================

export class JointGeometryCalculator {
  /**
   * Calculate angle between three points (in degrees)
   */
  static calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
    const radians =
      Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180) / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
  }

  /**
   * Calculate elbow angle (shoulder-elbow-wrist)
   */
  static calculateElbowAngle(
    shoulder: Landmark,
    elbow: Landmark,
    wrist: Landmark
  ): JointAngle {
    const angle = this.calculateAngle(shoulder, elbow, wrist);
    const visibility =
      (shoulder.visibility + elbow.visibility + wrist.visibility) / 3;

    return {
      joint: "elbow",
      angle,
      targetMin: 60,
      targetMax: 120,
      visibility,
    };
  }

  /**
   * Calculate knee angle (hip-knee-ankle)
   */
  static calculateKneeAngle(
    hip: Landmark,
    knee: Landmark,
    ankle: Landmark
  ): JointAngle {
    const angle = this.calculateAngle(hip, knee, ankle);
    const visibility =
      (hip.visibility + knee.visibility + ankle.visibility) / 3;

    return {
      joint: "knee",
      angle,
      targetMin: 70,
      targetMax: 110,
      visibility,
    };
  }

  /**
   * Calculate shoulder angle (elbow-shoulder-hip)
   */
  static calculateShoulderAngle(
    elbow: Landmark,
    shoulder: Landmark,
    hip: Landmark
  ): JointAngle {
    const angle = this.calculateAngle(elbow, shoulder, hip);
    const visibility =
      (elbow.visibility + shoulder.visibility + hip.visibility) / 3;

    return {
      joint: "shoulder",
      angle,
      targetMin: 30,
      targetMax: 90,
      visibility,
    };
  }

  /**
   * Calculate hip angle (shoulder-hip-knee)
   */
  static calculateHipAngle(
    shoulder: Landmark,
    hip: Landmark,
    knee: Landmark
  ): JointAngle {
    const angle = this.calculateAngle(shoulder, hip, knee);
    const visibility =
      (shoulder.visibility + hip.visibility + knee.visibility) / 3;

    return {
      joint: "hip",
      angle,
      targetMin: 160,
      targetMax: 200,
      visibility,
    };
  }

  /**
   * Calculate body alignment (shoulder-hip midpoint to ankle)
   */
  static calculateBodyAlignment(
    leftShoulder: Landmark,
    rightShoulder: Landmark,
    leftHip: Landmark,
    rightHip: Landmark,
    leftAnkle: Landmark,
    rightAnkle: Landmark
  ): { angle: number; deviation: number } {
    // Midpoint of shoulders and hips
    const shoulderMidpoint = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
    };
    const hipMidpoint = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
    };
    const ankleMidpoint = {
      x: (leftAnkle.x + rightAnkle.x) / 2,
      y: (leftAnkle.y + rightAnkle.y) / 2,
    };

    // Calculate angle from vertical
    const torsoVector = {
      x: hipMidpoint.x - shoulderMidpoint.x,
      y: hipMidpoint.y - shoulderMidpoint.y,
    };
    const legVector = {
      x: ankleMidpoint.x - hipMidpoint.x,
      y: ankleMidpoint.y - hipMidpoint.y,
    };

    const torsoAngle = Math.atan2(torsoVector.x, torsoVector.y) * (180 / Math.PI);
    const legAngle = Math.atan2(legVector.x, legVector.y) * (180 / Math.PI);

    const alignmentAngle = Math.abs(torsoAngle - legAngle);
    const deviation = Math.abs(alignmentAngle - 180); // 180 = straight line

    return { angle: alignmentAngle, deviation };
  }
}

// ============================================================================
// Form Signal Generator
// ============================================================================

export class FormSignalGenerator {
  /**
   * Generate form signals for pushup exercise
   */
  static generatePushupFormSignals(landmarks: Landmark[]): FormSignal[] {
    const signals: FormSignal[] = [];

    if (landmarks.length < 33) return signals;

    // Elbow angles
    const leftElbow = JointGeometryCalculator.calculateElbowAngle(
      landmarks[POSE_LANDMARKS.LEFT_SHOULDER],
      landmarks[POSE_LANDMARKS.LEFT_ELBOW],
      landmarks[POSE_LANDMARKS.LEFT_WRIST]
    );
    const rightElbow = JointGeometryCalculator.calculateElbowAngle(
      landmarks[POSE_LANDMARKS.RIGHT_SHOULDER],
      landmarks[POSE_LANDMARKS.RIGHT_ELBOW],
      landmarks[POSE_LANDMARKS.RIGHT_WRIST]
    );

    signals.push({
      joint: "left_elbow",
      angle: leftElbow.angle,
      targetAngle: 90,
      deviation: Math.abs(leftElbow.angle - 90),
      quality: leftElbow.angle >= 60 && leftElbow.angle <= 120 ? "good" : "acceptable",
      feedback: leftElbow.angle < 60 ? "Elbow too bent" : leftElbow.angle > 120 ? "Elbow too straight" : undefined,
    });

    signals.push({
      joint: "right_elbow",
      angle: rightElbow.angle,
      targetAngle: 90,
      deviation: Math.abs(rightElbow.angle - 90),
      quality: rightElbow.angle >= 60 && rightElbow.angle <= 120 ? "good" : "acceptable",
      feedback: rightElbow.angle < 60 ? "Elbow too bent" : rightElbow.angle > 120 ? "Elbow too straight" : undefined,
    });

    // Body alignment
    const alignment = JointGeometryCalculator.calculateBodyAlignment(
      landmarks[POSE_LANDMARKS.LEFT_SHOULDER],
      landmarks[POSE_LANDMARKS.RIGHT_SHOULDER],
      landmarks[POSE_LANDMARKS.LEFT_HIP],
      landmarks[POSE_LANDMARKS.RIGHT_HIP],
      landmarks[POSE_LANDMARKS.LEFT_ANKLE],
      landmarks[POSE_LANDMARKS.RIGHT_ANKLE]
    );

    signals.push({
      joint: "body_alignment",
      angle: alignment.angle,
      targetAngle: 180,
      deviation: alignment.deviation,
      quality: alignment.deviation < 15 ? "good" : alignment.deviation < 30 ? "acceptable" : "poor",
      feedback: alignment.deviation >= 30 ? "Keep body straight" : undefined,
    });

    return signals;
  }

  /**
   * Generate form signals for squat exercise
   */
  static generateSquatFormSignals(landmarks: Landmark[]): FormSignal[] {
    const signals: FormSignal[] = [];

    if (landmarks.length < 33) return signals;

    // Knee angles
    const leftKnee = JointGeometryCalculator.calculateKneeAngle(
      landmarks[POSE_LANDMARKS.LEFT_HIP],
      landmarks[POSE_LANDMARKS.LEFT_KNEE],
      landmarks[POSE_LANDMARKS.LEFT_ANKLE]
    );
    const rightKnee = JointGeometryCalculator.calculateKneeAngle(
      landmarks[POSE_LANDMARKS.RIGHT_HIP],
      landmarks[POSE_LANDMARKS.RIGHT_KNEE],
      landmarks[POSE_LANDMARKS.RIGHT_ANKLE]
    );

    signals.push({
      joint: "left_knee",
      angle: leftKnee.angle,
      targetAngle: 90,
      deviation: Math.abs(leftKnee.angle - 90),
      quality: leftKnee.angle >= 70 && leftKnee.angle <= 110 ? "good" : "acceptable",
      feedback: leftKnee.angle < 70 ? "Knee too bent" : leftKnee.angle > 110 ? "Knee too straight" : undefined,
    });

    signals.push({
      joint: "right_knee",
      angle: rightKnee.angle,
      targetAngle: 90,
      deviation: Math.abs(rightKnee.angle - 90),
      quality: rightKnee.angle >= 70 && rightKnee.angle <= 110 ? "good" : "acceptable",
      feedback: rightKnee.angle < 70 ? "Knee too bent" : rightKnee.angle > 110 ? "Knee too straight" : undefined,
    });

    // Hip angle
    const leftHip = JointGeometryCalculator.calculateHipAngle(
      landmarks[POSE_LANDMARKS.LEFT_SHOULDER],
      landmarks[POSE_LANDMARKS.LEFT_HIP],
      landmarks[POSE_LANDMARKS.LEFT_KNEE]
    );

    signals.push({
      joint: "hip",
      angle: leftHip.angle,
      targetAngle: 90,
      deviation: Math.abs(leftHip.angle - 90),
      quality: leftHip.angle >= 60 && leftHip.angle <= 120 ? "good" : "acceptable",
      feedback: leftHip.angle < 60 ? "Bend more at hips" : leftHip.angle > 120 ? "Keep chest up" : undefined,
    });

    return signals;
  }

  /**
   * Generate form signals for lunge exercise
   */
  static generateLungeFormSignals(landmarks: Landmark[]): FormSignal[] {
    const signals: FormSignal[] = [];

    if (landmarks.length < 33) return signals;

    // Front knee angle (left knee in lunge)
    const leftKnee = JointGeometryCalculator.calculateKneeAngle(
      landmarks[POSE_LANDMARKS.LEFT_HIP],
      landmarks[POSE_LANDMARKS.LEFT_KNEE],
      landmarks[POSE_LANDMARKS.LEFT_ANKLE]
    );

    signals.push({
      joint: "front_knee",
      angle: leftKnee.angle,
      targetAngle: 90,
      deviation: Math.abs(leftKnee.angle - 90),
      quality: leftKnee.angle >= 70 && leftKnee.angle <= 110 ? "good" : "acceptable",
      feedback: leftKnee.angle < 70 ? "Front knee too bent" : leftKnee.angle > 110 ? "Bend front knee more" : undefined,
    });

    // Rear knee angle (right knee in lunge)
    const rightKnee = JointGeometryCalculator.calculateKneeAngle(
      landmarks[POSE_LANDMARKS.RIGHT_HIP],
      landmarks[POSE_LANDMARKS.RIGHT_KNEE],
      landmarks[POSE_LANDMARKS.RIGHT_ANKLE]
    );

    signals.push({
      joint: "rear_knee",
      angle: rightKnee.angle,
      targetAngle: 90,
      deviation: Math.abs(rightKnee.angle - 90),
      quality: rightKnee.angle >= 70 && rightKnee.angle <= 110 ? "good" : "acceptable",
      feedback: rightKnee.angle < 70 ? "Rear knee too bent" : rightKnee.angle > 110 ? "Lower rear knee" : undefined,
    });

    // Torso alignment
    const alignment = JointGeometryCalculator.calculateBodyAlignment(
      landmarks[POSE_LANDMARKS.LEFT_SHOULDER],
      landmarks[POSE_LANDMARKS.RIGHT_SHOULDER],
      landmarks[POSE_LANDMARKS.LEFT_HIP],
      landmarks[POSE_LANDMARKS.RIGHT_HIP],
      landmarks[POSE_LANDMARKS.LEFT_ANKLE],
      landmarks[POSE_LANDMARKS.RIGHT_ANKLE]
    );

    signals.push({
      joint: "torso_alignment",
      angle: alignment.angle,
      targetAngle: 180,
      deviation: alignment.deviation,
      quality: alignment.deviation < 15 ? "good" : alignment.deviation < 30 ? "acceptable" : "poor",
      feedback: alignment.deviation >= 30 ? "Keep torso upright" : undefined,
    });

    return signals;
  }
}

// ============================================================================
// Enhanced Pose Engine
// ============================================================================

export type PoseEngineConfig = {
  modelComplexity: "lite" | "full";
  minDetectionConfidence: number;
  minTrackingConfidence: number;
  enableSmoothing: boolean;
  smoothingWindow: number; // frames
};

export type PoseEngineState = {
  initialized: boolean;
  processing: boolean;
  landmarks: Landmark[];
  jointAngles: JointAngle[];
  formSignals: FormSignal[];
  frameCount: number;
  lastTimestamp: number;
};

export class EnhancedPoseEngine implements VisionProvider {
  readonly id = "pose-engine";
  readonly type: VisionCapability = "pose_detection";
  readonly processingMode: ProcessingMode = "realtime";

  private poseLandmarker: PoseLandmarker | null = null;
  private config: PoseEngineConfig;
  private state: PoseEngineState = {
    initialized: false,
    processing: false,
    landmarks: [],
    jointAngles: [],
    formSignals: [],
    frameCount: 0,
    lastTimestamp: 0,
  };

  // Jitter filtering
  private landmarkHistory: Landmark[][] = [];
  private readonly MAX_HISTORY = 10;

  // Activity-specific form generator
  private activityType: string = "pushup";

  constructor(config?: Partial<PoseEngineConfig>) {
    this.config = {
      modelComplexity: config?.modelComplexity ?? "lite",
      minDetectionConfidence: config?.minDetectionConfidence ?? 0.5,
      minTrackingConfidence: config?.minTrackingConfidence ?? 0.5,
      enableSmoothing: config?.enableSmoothing ?? true,
      smoothingWindow: config?.smoothingWindow ?? 5,
    };
  }

  async initialize(context: VisionContext): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_${this.config.modelComplexity}/float16/pose_landmarker_${this.config.modelComplexity}.task`,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: this.config.minDetectionConfidence,
      minPosePresenceConfidence: this.config.minTrackingConfidence,
      minTrackingConfidence: this.config.minTrackingConfidence,
    });

    this.activityType = context.activityType || "pushup";
    this.state.initialized = true;
  }

  async processFrame(frame: FrameData, context: VisionContext): Promise<VisionResult> {
    if (!this.poseLandmarker) {
      return this.createErrorResult("Pose landmarker not initialized");
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

      // Process frame with MediaPipe
      const results = this.poseLandmarker.detectForVideo(imageData, frame.timestamp);

      if (!results.landmarks || results.landmarks.length === 0) {
        return this.createErrorResult("No pose detected");
      }

      // Convert MediaPipe landmarks to our format
      const rawLandmarks = this.convertLandmarks(results.landmarks[0]);

      // Apply jitter filtering
      const smoothedLandmarks = this.config.enableSmoothing
        ? this.applySmoothing(rawLandmarks)
        : rawLandmarks;

      this.state.landmarks = smoothedLandmarks;

      // Calculate joint angles
      const jointAngles = this.calculateJointAngles(smoothedLandmarks);
      this.state.jointAngles = jointAngles;

      // Generate form signals based on activity type
      const formSignals = this.generateFormSignals(smoothedLandmarks);
      this.state.formSignals = formSignals;

      // Create observation
      const observation: VisionObservation = {
        frameIndex: frame.frameIndex,
        timestamp: frame.timestamp,
        source: "camera_front",
        confidence: this.calculateOverallConfidence(smoothedLandmarks),
        landmarks: smoothedLandmarks,
        formSignals,
        metadata: {
          jointAngles: jointAngles.map((ja) => ({
            joint: ja.joint,
            angle: ja.angle,
            visibility: ja.visibility,
          })),
        },
      };

      this.state.frameCount++;
      this.state.lastTimestamp = frame.timestamp;

      const processingTimeMs = performance.now() - startTime;

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
          formScore: this.calculateFormScore(formSignals),
        },
        processingTimeMs,
      };
    } catch (error) {
      const processingTimeMs = performance.now() - startTime;
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
      },
      processingTimeMs: performance.now() - startTime,
    };
  }

  getState(): ProviderState {
    return {
      initialized: this.state.initialized,
      modelLoaded: this.poseLandmarker !== null,
      processing: this.state.processing,
      framesProcessed: this.state.frameCount,
      averageLatencyMs: 0, // Would need to track this
    };
  }

  async cleanup(): Promise<void> {
    if (this.poseLandmarker) {
      this.poseLandmarker.close();
      this.poseLandmarker = null;
    }
    this.state.initialized = false;
    this.landmarkHistory = [];
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private convertLandmarks(mpLandmarks: Array<{ x: number; y: number; z: number; visibility?: number }>): Landmark[] {
    const landmarkNames = Object.keys(POSE_LANDMARKS);
    return mpLandmarks.map((mp, index) => ({
      id: String(index),
      name: landmarkNames[index] || `LANDMARK_${index}`,
      x: mp.x,
      y: mp.y,
      z: mp.z,
      visibility: mp.visibility ?? 0,
    }));
  }

  private applySmoothing(landmarks: Landmark[]): Landmark[] {
    this.landmarkHistory.push(landmarks);
    if (this.landmarkHistory.length > this.MAX_HISTORY) {
      this.landmarkHistory.shift();
    }

    if (this.landmarkHistory.length === 1) {
      return landmarks;
    }

    // Simple moving average smoothing
    return landmarks.map((landmark, index) => {
      let sumX = 0;
      let sumY = 0;
      let sumZ = 0;
      let count = 0;

      for (const history of this.landmarkHistory) {
        if (history[index]) {
          sumX += history[index].x;
          sumY += history[index].y;
          sumZ += history[index].z;
          count++;
        }
      }

      return {
        ...landmark,
        x: count > 0 ? sumX / count : landmark.x,
        y: count > 0 ? sumY / count : landmark.y,
        z: count > 0 ? sumZ / count : landmark.z,
      };
    });
  }

  private calculateJointAngles(landmarks: Landmark[]): JointAngle[] {
    if (landmarks.length < 33) return [];

    const angles: JointAngle[] = [];

    // Left arm
    angles.push(
      JointGeometryCalculator.calculateElbowAngle(
        landmarks[POSE_LANDMARKS.LEFT_SHOULDER],
        landmarks[POSE_LANDMARKS.LEFT_ELBOW],
        landmarks[POSE_LANDMARKS.LEFT_WRIST]
      )
    );

    // Right arm
    angles.push(
      JointGeometryCalculator.calculateElbowAngle(
        landmarks[POSE_LANDMARKS.RIGHT_SHOULDER],
        landmarks[POSE_LANDMARKS.RIGHT_ELBOW],
        landmarks[POSE_LANDMARKS.RIGHT_WRIST]
      )
    );

    // Left leg
    angles.push(
      JointGeometryCalculator.calculateKneeAngle(
        landmarks[POSE_LANDMARKS.LEFT_HIP],
        landmarks[POSE_LANDMARKS.LEFT_KNEE],
        landmarks[POSE_LANDMARKS.LEFT_ANKLE]
      )
    );

    // Right leg
    angles.push(
      JointGeometryCalculator.calculateKneeAngle(
        landmarks[POSE_LANDMARKS.RIGHT_HIP],
        landmarks[POSE_LANDMARKS.RIGHT_KNEE],
        landmarks[POSE_LANDMARKS.RIGHT_ANKLE]
      )
    );

    return angles;
  }

  private generateFormSignals(landmarks: Landmark[]): FormSignal[] {
    switch (this.activityType) {
      case "pushup":
        return FormSignalGenerator.generatePushupFormSignals(landmarks);
      case "squat":
        return FormSignalGenerator.generateSquatFormSignals(landmarks);
      case "lunge":
        return FormSignalGenerator.generateLungeFormSignals(landmarks);
      default:
        return FormSignalGenerator.generatePushupFormSignals(landmarks);
    }
  }

  private calculateOverallConfidence(landmarks: Landmark[]): number {
    if (landmarks.length === 0) return 0;

    const visibleLandmarks = landmarks.filter((l) => l.visibility > 0.5);
    const visibilityRatio = visibleLandmarks.length / landmarks.length;

    // Average visibility of visible landmarks
    const avgVisibility =
      visibleLandmarks.length > 0
        ? visibleLandmarks.reduce((sum, l) => sum + l.visibility, 0) /
          visibleLandmarks.length
        : 0;

    return visibilityRatio * 0.6 + avgVisibility * 0.4;
  }

  private calculateFormScore(formSignals: FormSignal[]): number {
    if (formSignals.length === 0) return 0.5;

    const goodCount = formSignals.filter((s) => s.quality === "good").length;
    const acceptableCount = formSignals.filter((s) => s.quality === "acceptable").length;

    return (goodCount * 1 + acceptableCount * 0.5) / formSignals.length;
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
// Export Legacy API for Backward Compatibility
// ============================================================================

export type PoseLandmarkLegacy = {
  x: number;
  y: number;
  z: number;
  visibility: number;
};

export type PoseFrameLegacy = {
  landmarks: PoseLandmarkLegacy[];
  timestamp: number;
};

export type ElbowAngleLegacy = {
  left: number;
  right: number;
  average: number;
};

export function calculateAngle(
  a: PoseLandmarkLegacy,
  b: PoseLandmarkLegacy,
  c: PoseLandmarkLegacy
): number {
  const landmarkA: Landmark = { id: "a", name: "a", x: a.x, y: a.y, z: a.z, visibility: a.visibility };
  const landmarkB: Landmark = { id: "b", name: "b", x: b.x, y: b.y, z: b.z, visibility: b.visibility };
  const landmarkC: Landmark = { id: "c", name: "c", x: c.x, y: c.y, z: c.z, visibility: c.visibility };
  return JointGeometryCalculator.calculateAngle(landmarkA, landmarkB, landmarkC);
}

export function extractElbowAngle(landmarks: PoseLandmarkLegacy[]): ElbowAngleLegacy | null {
  if (landmarks.length < 14) return null;

  const toLandmark = (l: PoseLandmarkLegacy, id: string): Landmark => ({
    id,
    name: id,
    x: l.x,
    y: l.y,
    z: l.z,
    visibility: l.visibility,
  });

  const rightAngle = JointGeometryCalculator.calculateElbowAngle(
    toLandmark(landmarks[11], "right_shoulder"),
    toLandmark(landmarks[12], "right_elbow"),
    toLandmark(landmarks[13], "right_wrist")
  );
  const leftAngle = JointGeometryCalculator.calculateElbowAngle(
    toLandmark(landmarks[1], "left_shoulder"),
    toLandmark(landmarks[2], "left_elbow"),
    toLandmark(landmarks[3], "left_wrist")
  );

  return {
    left: leftAngle.angle,
    right: rightAngle.angle,
    average: (leftAngle.angle + rightAngle.angle) / 2,
  };
}

export function isPersonVisible(landmarks: PoseLandmarkLegacy[], threshold = 0.5): boolean {
  if (landmarks.length === 0) return false;
  const visibleCount = landmarks.filter((l) => l.visibility > threshold).length;
  return visibleCount >= landmarks.length * 0.6;
}

export async function initializePoseDetection(): Promise<{
  processFrame: (video: HTMLVideoElement) => Promise<PoseFrameLegacy | null>;
  cleanup: () => void;
}> {
  const engine = new EnhancedPoseEngine();

  return {
    processFrame: async (video: HTMLVideoElement) => {
      // Create frame from video element
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const frame: FrameData = {
        width: canvas.width,
        height: canvas.height,
        format: "rgba",
        data: imageData.data.buffer,
        timestamp: video.currentTime * 1000,
        frameIndex: 0,
      };

      const context: VisionContext = {
        missionId: "",
        userId: "",
        sessionId: "",
        activityType: "pushup",
        verificationMode: "pose",
        processingMode: "realtime",
        frameSource: "camera_front",
        timestamp: Date.now(),
      };

      const result = await engine.processFrame(frame, context);
      if (result.success && result.observations.length > 0) {
        const obs = result.observations[0];
        return {
          landmarks: obs.landmarks?.map((l) => ({
            x: l.x,
            y: l.y,
            z: l.z,
            visibility: l.visibility,
          })) || [],
          timestamp: obs.timestamp,
        };
      }
      return null;
    },
    cleanup: () => {
      engine.cleanup();
    },
  };
}