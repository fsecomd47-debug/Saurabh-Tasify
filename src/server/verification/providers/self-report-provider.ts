/**
 * PDR-4.1 §57: SelfReportProvider
 * Simplest verification: user confirms completion.
 * Fixed confidence cap at 0.6.
 */

import type {
  VerificationProvider,
  VerificationState,
  VerificationResult,
} from "@/server/verification/provider-interface";
import type { MissionContract } from "@/server/ai/provider";
import type { VerificationMode } from "@/types";

export class SelfReportProvider implements VerificationProvider {
  readonly name = "self-report";
  readonly supportedModes: VerificationMode[] = ["self_reported"];

  private state: VerificationState = {
    status: "initializing",
    progress: 0,
    confidence: 0,
    metrics: {},
  };

  supports(mission: { verificationMode: VerificationMode }): boolean {
    return mission.verificationMode === "self_reported";
  }

  async initialize(_mission: MissionContract): Promise<void> {
    this.state = {
      status: "initializing",
      progress: 0,
      confidence: 0,
      metrics: {},
    };
  }

  async start(): Promise<void> {
    this.state.status = "active";
    this.state.progress = 0;
  }

  async stop(): Promise<void> {
    this.state.status = "stopped";
  }

  getCurrentState(): VerificationState {
    return { ...this.state };
  }

  async finalize(): Promise<VerificationResult> {
    this.state.status = "finalizing";

    // Self-report: fixed confidence at 0.6
    const confidenceScore = 0.6;
    const confidenceClass = "medium" as const;

    this.state.status = "stopped";

    return {
      status: "passed",
      evidenceType: "self_report",
      confidenceClass,
      confidenceScore,
      reasonCode: "SELF_REPORTED",
      metrics: {
        confidence: confidenceScore,
      },
    };
  }
}
