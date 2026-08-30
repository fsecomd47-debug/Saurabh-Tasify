import type { VerificationState, VerificationResult, VerificationEvent } from "./types";

export interface MissionVerifier {
  getState(): VerificationState;
  start(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  finalize(): Promise<VerificationResult>;
  subscribe(listener: (state: VerificationState) => void): () => void;
}
