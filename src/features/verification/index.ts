/**
 * PDR-4 Verification Module Exports
 * Central export point for all verification components and logic.
 */

// Core orchestration
export { VerificationOrchestrator } from "./verification-orchestrator";
export type {
  OrchestratorPhase,
  OrchestratorSnapshot,
  OrchestratorCallbacks,
  OrchestratorResult,
} from "./verification-orchestrator";

// Master verification view
export { MissionVerificationView } from "./MissionVerificationView";

// Task intelligence
export { normalizeTask, detectAmbiguity } from "./task-intelligence";
export type { NormalizedTask, AmbiguityResult } from "./task-intelligence";

// Types
export type { VerificationState, VerificationEvent, VerificationResult } from "./types";
