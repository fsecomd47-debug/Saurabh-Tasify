/**
 * PDR-4.2 §4-7: Vision Provider Types & Interface
 * Central type definitions for the vision provider system.
 */

import type { VerificationMode } from "@/types";

/**
 * §4: Vision Provider Types
 */
export type VisionProviderType =
  | "pose"
  | "object"
  | "scene"
  | "document"
  | "quality"
  | "evidence";

/**
 * §7: Vision Requirements
 * What the mission needs from the vision system.
 */
export type VisionRequirements = {
  requiresPose?: boolean;
  requiresObjectDetection?: boolean;
  requiresSceneComparison?: boolean;
  requiresOCR?: boolean;
  minimumSubjectVisibility?: "low" | "medium" | "high";
  allowedProcessing: "local" | "server" | "hybrid";
};

/**
 * §6: Vision Context
 * Mission context passed to vision providers.
 * Do NOT include entire user profile.
 */
export type VisionContext = {
  missionId: string;
  userId: string;
  sessionId: string;
  activityType: string;
  verificationMode: VerificationMode;
  requirements: VisionRequirements;
  target?: {
    value?: number;
    unit?: string;
  };
  privacyMode: "local_first";
};

/**
 * §11: Inference Policy
 * Controls where vision processing happens.
 */
export type InferencePolicy = {
  preferredLocation: "device" | "server";
  allowFallback: boolean;
  maxUploadBytes?: number;
  retainRawMedia: false;
  derivedEventsOnly: boolean;
};

/**
 * §13: Derived Vision Event
 * Structured results stored instead of raw frames.
 */
export type DerivedVisionEvent = {
  missionId: string;
  sessionId: string;
  sequence: number;
  type:
    | "pose_observed"
    | "rep_completed"
    | "subject_present"
    | "object_detected"
    | "quality_passed"
    | "scene_change_detected"
    | "pose_top"
    | "pose_bottom"
    | "pose_descending"
    | "pose_ascending"
    | "depth_confirmed"
    | "subject_visible"
    | "subject_lost"
    | "form_feedback";
  timestamp: number;
  metrics?: Record<string, number>;
  metadata?: Record<string, unknown>;
};

/**
 * §55: Vision Confidence Abstraction
 * User-facing confidence levels.
 */
export type VisionConfidenceLevel = "clear" | "likely" | "uncertain" | "needs_better_view";

/**
 * §103: Vision Result
 * Final output from a vision provider.
 */
export type VisionResult = {
  status: "supported" | "unsupported" | "uncertain";
  evidenceClass: "clear" | "partial" | "insufficient";
  confidenceLevel: VisionConfidenceLevel;
  confidenceScore: number;
  metrics?: Record<string, number>;
  reasonCode: string;
  events: DerivedVisionEvent[];
};

/**
 * §64: Processing Mode
 * CPU budget hint for providers.
 */
export type ProcessingMode = "realtime" | "interactive" | "snapshot" | "batch";

/**
 * Vision Input
 * What the provider receives per frame/unit of work.
 */
export type VisionInput = {
  frame?: ImageData | HTMLCanvasElement;
  photo?: ImageData;
  landmarks?: PoseLandmarks;
  timestamp: number;
  sequence: number;
};

/**
 * Vision Observation
 * What the provider emits per frame/unit of work.
 */
export type VisionObservation = {
  type: string;
  confidence: number;
  metrics: Record<string, number>;
  message?: string;
  isStateChange: boolean;
};

/**
 * §25-26: Pose Landmarks
 * Body landmarks for pose detection.
 */
export type PoseLandmarks = {
  leftShoulder: Point3D;
  rightShoulder: Point3D;
  leftElbow: Point3D;
  rightElbow: Point3D;
  leftWrist: Point3D;
  rightWrist: Point3D;
  leftHip: Point3D;
  rightHip: Point3D;
  leftKnee: Point3D;
  rightKnee: Point3D;
  leftAnkle: Point3D;
  rightAnkle: Point3D;
  nose?: Point3D;
  leftEye?: Point3D;
  rightEye?: Point3D;
};

export type Point3D = {
  x: number;
  y: number;
  z: number;
  visibility?: number;
};

/**
 * §39: Form Signals
 * Internal quality signals for repetitions.
 */
export type FormSignals = {
  depth?: number;
  symmetry?: number;
  tempo?: number;
  alignment?: number;
  stability?: number;
};

/**
 * §38: Repetition Context
 */
export type RepetitionContext = {
  activityId: string;
  targetReps: number;
  cooldownMs?: number;
  minRepDurationMs?: number;
  maxRepDurationMs?: number;
  depthThreshold?: number;
  alignmentThreshold?: number;
};

/**
 * §38: Repetition Observation
 */
export type RepetitionObservation = {
  isValidRep: boolean;
  currentCount: number;
  targetCount: number;
  formSignals: FormSignals;
  state: string;
  message?: string;
};

/**
 * §38: Repetition Result
 */
export type RepetitionResult = {
  validReps: number;
  invalidReps: number;
  targetReps: number;
  formScore: number;
  formSignals: FormSignals;
  averageRepDuration: number;
  consistency: number;
};

/**
 * §43: Detected Object
 */
export type DetectedObject = {
  className: string;
  confidenceClass: "high" | "medium" | "low";
  confidenceScore: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

/**
 * §18: Evidence Quality
 */
export type EvidenceQuality = {
  status: "usable" | "retake" | "unsupported";
  issues: Array<
    | "too_dark"
    | "too_blurry"
    | "too_small"
    | "subject_missing"
    | "wrong_orientation"
    | "too_many_subjects"
    | "low_resolution"
    | "motion_blur"
  >;
  brightness: number;
  blurScore: number;
  resolution: { width: number; height: number };
};

/**
 * §97: Vision Event (for server validation)
 */
export type VisionEvent = {
  missionId: string;
  sessionId: string;
  userId: string;
  sequence: number;
  type: string;
  timestamp: number;
  payload: Record<string, number | string>;
};

/**
 * §101: Vision Session
 */
export type VisionSession = {
  id: string;
  missionId: string;
  userId: string;
  providerTypes: string[];
  startedAt: string;
  endedAt?: string;
  status: "active" | "completed" | "failed" | "cancelled";
};
