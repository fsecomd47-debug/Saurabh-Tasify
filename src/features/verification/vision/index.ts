/**
 * PDR-4.2: Vision Verification System
 * Advanced computer vision for mission verification.
 */

// Core types
export type {
  ProcessingMode,
  VisionCapability,
  FrameSource,
  VisionConfidence,
  VisionContext,
  VisionRequirements,
  FrameData,
  VisionObservation,
  Landmark,
  BoundingBox,
  QualityMetrics,
  FormSignal,
  VisionProvider,
  VisionResult,
  VisionSummary,
  ProviderRegistryEntry,
  OrchestratorConfig,
  OrchestratorState,
  OrchestratorResult,
  EvidenceQualityCheck,
  EvidenceRecord,
  JointAngle,
  RepetitionPhase,
  ActivityGeometryPolicy,
  PrivacyConfig,
  ContentHash,
  CameraConfig,
  CameraState,
  CameraPermissionStatus,
} from "./types";

// Re-export VisionProviderRegistry type from types
export type { VisionProviderRegistry } from "./types";

// Vision Provider Registry
export { VisionProviderRegistry as VisionProviderRegistryImpl } from "./registry";

// Quality Provider
export { QualityProvider } from "./quality-provider";

// Object Detection
export { ObjectDetectionProvider, SceneComparisonAnalyzer } from "./object-detection";

// Orchestrator
export { VisionVerificationOrchestrator } from "./orchestrator";

// Privacy Pipeline
export { PrivacyPipeline, ContentHasher } from "./privacy-pipeline";

// UX Components
export {
  QualityIndicator,
  FormFeedbackBanner,
  ConfidenceBadge,
  VisionStatusIndicator,
  RepProgressDisplay,
  VisionLoadingState,
  VisionErrorState,
} from "./vision-ux";

// Vision Verification Flow
export { VisionVerificationFlow } from "./VisionVerificationFlow";
export type { VisionVerificationFlowProps, FlowPhase } from "./VisionVerificationFlow";

// Enhanced Pose Engine (re-exports)
export {
  EnhancedPoseEngine,
  JointGeometryCalculator,
  FormSignalGenerator,
  POSE_LANDMARKS,
} from "../pose/enhanced-pose-engine";

// Enhanced Repetition Engine (re-exports)
export {
  RepetitionEngine,
  JitterFilter,
  ACTIVITY_POLICIES,
} from "../pose/enhanced-rep-counter";

// Types from sub-modules
export type {
  PoseEngineConfig,
  PoseEngineState,
} from "../pose/enhanced-pose-engine";

export type {
  RepState,
  RepEvent,
  RepetitionEngineConfig,
} from "../pose/enhanced-rep-counter";

export type {
  ObjectDetectionConfig,
  SceneComparisonResult,
} from "./object-detection";

// Vision Worker Pool (PDR-4 §77)
export {
  VisionWorkerPool,
  detectDeviceCapabilities,
} from "./worker-pool";
export type {
  WorkerMessage,
  WorkerResponse,
  WorkerConfig,
  WorkerCapabilities,
  WorkerObservation,
  WorkerPhotoResult,
  WorkerHealthStatus,
  PerformanceMetrics,
} from "./worker-pool";