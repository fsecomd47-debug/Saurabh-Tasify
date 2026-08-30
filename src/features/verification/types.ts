export type VerificationState = "idle" | "starting" | "active" | "paused" | "completing" | "completed" | "failed";

export type VerificationEvent = {
  type: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
};

export type VerificationResult = {
  status: "passed" | "failed" | "uncertain";
  confidence: number;
  evidence: {
    duration?: number;
    repetitions?: number;
    presenceSamples?: number;
  };
  reasonCode: string;
};

export type MissionVerifierConfig = {
  missionId: string;
  durationSeconds?: number;
  targetRepetitions?: number;
  onStateChange?: (state: VerificationState) => void;
  onEvent?: (event: VerificationEvent) => void;
};
