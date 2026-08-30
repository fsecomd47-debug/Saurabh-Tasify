/**
 * PDR-4.2: Vision Provider Registry Types
 * Core types for the advanced computer vision verification system.
 */

// ============================================================================
// Core Vision Types
// ============================================================================

/** Processing mode determines how frames are analyzed */
export type ProcessingMode = "realtime" | "interactive" | "snapshot" | "low_frequency";

/** Vision provider capability flags */
export type VisionCapability =
  | "pose_detection"
  | "pose_tracking"
  | "object_detection"
  | "scene_analysis"
  | "document_ocr"
  | "quality_assessment"
  | "face_detection"
  | "gesture_recognition";

/** Frame source identifier */
export type FrameSource = "camera_front" | "camera_rear" | "upload" | "screenshot";

/** Confidence classification */
export type VisionConfidence = "high" | "medium" | "low" | "none";

// ============================================================================
// Vision Context
// ============================================================================

/** Context for a vision processing session */
export type VisionContext = {
  missionId: string;
  userId: string;
  sessionId: string;
  activityType: string;
  verificationMode: string;
  processingMode: ProcessingMode;
  frameSource: FrameSource;
  timestamp: number;
  metadata?: Record<string, unknown>;
};

/** Requirements for vision processing */
export type VisionRequirements = {
  capabilities: VisionCapability[];
  minConfidence: VisionConfidence;
  maxLatencyMs: number;
  requireQualityCheck: boolean;
  requireAntiCheat: boolean;
  privacyMode: "derived_only" | "raw_allowed";
};

// ============================================================================
// Frame & Observation Types
// ============================================================================

/** Raw frame data (never persisted in derived_only mode) */
export type FrameData = {
  width: number;
  height: number;
  format: "rgb" | "rgba" | "jpeg" | "webp";
  data: ArrayBuffer | Uint8ClampedArray;
  timestamp: number;
  frameIndex: number;
};

/** Derived observation from frame analysis (persisted) */
export type VisionObservation = {
  frameIndex: number;
  timestamp: number;
  source: FrameSource;
  confidence: number;
  landmarks?: Landmark[];
  boundingBoxes?: BoundingBox[];
  qualityMetrics?: QualityMetrics;
  formSignals?: FormSignal[];
  metadata?: Record<string, unknown>;
};

/** 3D landmark point */
export type Landmark = {
  id: string;
  name: string;
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  z: number; // depth, -1 to 1
  visibility: number; // 0-1
};

/** Bounding box for detected objects */
export type BoundingBox = {
  id: string;
  label: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  class?: string;
};

/** Quality metrics for a frame */
export type QualityMetrics = {
  blurScore: number; // 0-1, higher = sharper
  brightnessScore: number; // 0-1, optimal around 0.5
  contrastScore: number; // 0-1
  resolutionScore: number; // 0-1 based on minimum requirements
  orientationScore: number; // 0-1, 1 = correct orientation
  subjectVisibility: number; // 0-1, how visible is the subject
  overallQuality: number; // weighted average
};

/** Form signal for exercise verification */
export type FormSignal = {
  joint: string;
  angle: number; // degrees
  targetAngle: number;
  deviation: number; // degrees from target
  quality: "good" | "acceptable" | "poor";
  feedback?: string;
};

// ============================================================================
// Vision Provider Interface
// ============================================================================

/** Result from a vision provider */
export type VisionResult = {
  providerId: string;
  providerType: VisionCapability;
  success: boolean;
  confidence: number;
  observations: VisionObservation[];
  summary: VisionSummary;
  processingTimeMs: number;
  error?: string;
  metadata?: Record<string, unknown>;
};

/** Summary of vision analysis */
export type VisionSummary = {
  totalFrames: number;
  processedFrames: number;
  averageConfidence: number;
  qualityScore: number;
  formScore?: number;
  repCount?: number;
  detectedObjects?: string[];
  sceneDescription?: string;
};

/** Vision provider interface */
export interface VisionProvider {
  readonly id: string;
  readonly type: VisionCapability;
  readonly processingMode: ProcessingMode;

  /** Initialize the provider with model loading */
  initialize(context: VisionContext, requirements: VisionRequirements): Promise<void>;

  /** Process a single frame */
  processFrame(frame: FrameData, context: VisionContext): Promise<VisionResult>;

  /** Process a batch of frames (for snapshot mode) */
  processBatch(frames: FrameData[], context: VisionContext): Promise<VisionResult>;

  /** Get current state for debugging */
  getState(): ProviderState;

  /** Clean up resources */
  cleanup(): Promise<void>;
}

/** Provider state for debugging */
export type ProviderState = {
  initialized: boolean;
  modelLoaded: boolean;
  processing: boolean;
  framesProcessed: number;
  averageLatencyMs: number;
  lastError?: string;
};

// ============================================================================
// Vision Provider Registry
// ============================================================================

/** Registry entry for a vision provider */
export type ProviderRegistryEntry = {
  provider: VisionProvider;
  capabilities: VisionCapability[];
  processingModes: ProcessingMode[];
  priority: number; // lower = higher priority
  enabled: boolean;
  lastUsed?: number;
  failureCount: number;
  averageLatencyMs: number;
};

/** Vision Provider Registry interface */
export interface VisionProviderRegistry {
  /** Register a new provider */
  register(provider: VisionProvider, capabilities: VisionCapability[], processingModes: ProcessingMode[], priority?: number): void;

  /** Unregister a provider */
  unregister(providerId: string): void;

  /** Get the best provider for given requirements */
  getProvider(requirements: VisionRequirements, processingMode: ProcessingMode): VisionProvider | null;

  /** Get all providers for a capability */
  getProvidersByCapability(capability: VisionCapability): ProviderRegistryEntry[];

  /** Update provider metrics after use */
  updateMetrics(providerId: string, latencyMs: number, success: boolean): void;

  /** Enable/disable a provider */
  setEnabled(providerId: string, enabled: boolean): void;

  /** Get registry state */
  getState(): ProviderRegistryEntry[];
}

// ============================================================================
// Vision Verification Orchestrator Types
// ============================================================================

/** Orchestrator configuration */
export type OrchestratorConfig = {
  maxConcurrentProviders: number;
  frameIntervalMs: number;
  qualityThreshold: number;
  confidenceThreshold: number;
  enableAntiCheat: boolean;
  enablePrivacyMode: boolean;
  maxSessionDurationMs: number;
};

/** Orchestrator state */
export type OrchestratorState = {
  phase: "idle" | "initializing" | "processing" | "finalizing" | "completed" | "error";
  activeProviders: string[];
  currentFrameIndex: number;
  totalFramesProcessed: number;
  averageConfidence: number;
  qualityScore: number;
  error?: string;
  startTime?: number;
  endTime?: number;
};

/** Orchestrator result */
export type OrchestratorResult = {
  status: "passed" | "failed" | "uncertain";
  confidence: number;
  confidenceClass: VisionConfidence;
  observations: VisionObservation[];
  summary: VisionSummary;
  evidenceHash: string; // content hash for audit
  processingTimeMs: number;
  providerResults: VisionResult[];
  metadata?: Record<string, unknown>;
};

// ============================================================================
// Evidence Types
// ============================================================================

/** Evidence quality check result */
export type EvidenceQualityCheck = {
  checkId: string;
  checkType: "blur" | "brightness" | "resolution" | "orientation" | "subject_visibility" | "content_hash" | "timestamp_validity";
  passed: boolean;
  score: number;
  threshold: number;
  details?: string;
};

/** Evidence record for storage */
export type EvidenceRecord = {
  evidenceId: string;
  missionId: string;
  userId: string;
  sessionId: string;
  evidenceType: "pose" | "object" | "document" | "scene" | "quality";
  contentHash: string; // SHA-256 of derived data
  qualityChecks: EvidenceQualityCheck[];
  overallQuality: number;
  observations: VisionObservation[];
  summary: VisionSummary;
  metadata?: Record<string, unknown>;
  createdAt: number;
};

// ============================================================================
// Geometry & Activity-Specific Types
// ============================================================================

/** Joint angle definition */
export type JointAngle = {
  joint: string;
  angle: number;
  targetMin: number;
  targetMax: number;
  visibility: number;
};

/** Repetition phase */
export type RepetitionPhase = {
  phase: "up" | "down" | "transition";
  jointAngles: JointAngle[];
  timestamp: number;
  frameIndex: number;
};

/** Activity geometry policy */
export type ActivityGeometryPolicy = {
  activityType: string;
  primaryJoints: string[];
  angleThresholds: Record<string, { min: number; max: number }>;
  repPhases: RepetitionPhase[];
  formSignals: FormSignal[];
};

// ============================================================================
// Privacy Types
// ============================================================================

/** Privacy configuration */
export type PrivacyConfig = {
  mode: "derived_only" | "raw_allowed";
  retentionPolicy: "session_only" | "evidence_only" | "audit_trail";
  contentHashAlgorithm: "sha-256" | "sha-512";
  encryptAtRest: boolean;
  anonymizeMetadata: boolean;
};

/** Content hash for evidence */
export type ContentHash = {
  algorithm: string;
  hash: string;
  timestamp: number;
  size: number;
};

// ============================================================================
// Camera Lifecycle Types
// ============================================================================

/** Camera configuration */
export type CameraConfig = {
  facingMode: "user" | "environment";
  width: number;
  height: number;
  frameRate: number;
  facing?: "front" | "rear";
};

/** Camera state */
export type CameraState = {
  status: "idle" | "requesting" | "checking" | "active" | "error" | "permission_denied";
  stream?: MediaStream;
  error?: string;
  capabilities?: MediaTrackCapabilities;
  settings?: MediaTrackSettings;
};

/** Camera permission status */
export type CameraPermissionStatus = {
  state: "granted" | "denied" | "prompt" | "checking";
  error?: string;
  fallbackAvailable: boolean;
};