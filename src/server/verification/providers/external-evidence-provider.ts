/**
 * PDR-4.1 §36-37: ExternalEvidenceProvider
 * External evidence verification for financial/external claims.
 * Supports status tracking: submitted/supported/verified/review_required/rejected.
 */

import type {
  VerificationProvider,
  VerificationState,
  VerificationResult,
} from "@/server/verification/provider-interface";
import type { MissionContract } from "@/server/ai/provider";
import type { VerificationMode } from "@/types";

export type ExternalEvidenceStatus =
  | "submitted"
  | "supported"
  | "verified"
  | "review_required"
  | "rejected";

export type ExternalEvidence = {
  id: string;
  type: "photo" | "screenshot" | "document" | "url";
  url?: string;
  notes?: string;
  timestamp?: string;
  status: ExternalEvidenceStatus;
  submittedAt: number;
};

export class ExternalEvidenceProvider implements VerificationProvider {
  readonly name = "external-evidence";
  readonly supportedModes: VerificationMode[] = ["activity_signal"];

  private state: VerificationState = {
    status: "initializing",
    progress: 0,
    confidence: 0,
    metrics: {},
  };

  private mission: MissionContract | null = null;
  private evidence: ExternalEvidence[] = [];

  supports(mission: { verificationMode: VerificationMode }): boolean {
    return mission.verificationMode === "activity_signal";
  }

  async initialize(mission: MissionContract): Promise<void> {
    this.mission = mission;
    this.evidence = [];
    this.state = {
      status: "initializing",
      progress: 0,
      confidence: 0,
      metrics: {},
    };
  }

  async start(): Promise<void> {
    this.state.status = "active";
  }

  async stop(): Promise<void> {
    this.state.status = "stopped";
  }

  getCurrentState(): VerificationState {
    return { ...this.state };
  }

  /**
   * Submit external evidence.
   * Returns the evidence with its initial status.
   */
  submitEvidence(evidence: Omit<ExternalEvidence, "id" | "status" | "submittedAt">): ExternalEvidence {
    const newEvidence: ExternalEvidence = {
      ...evidence,
      id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: "submitted",
      submittedAt: Date.now(),
    };

    this.evidence.push(newEvidence);

    this.state = {
      ...this.state,
      progress: 1,
      confidence: 0.5,
      metrics: {
        evidenceCount: this.evidence.length,
      },
      message: "Evidence submitted — under review",
    };

    return newEvidence;
  }

  /**
   * Update evidence status (called by review system).
   */
  updateEvidenceStatus(evidenceId: string, status: ExternalEvidenceStatus): void {
    const evidence = this.evidence.find((e) => e.id === evidenceId);
    if (evidence) {
      evidence.status = status;
    }
  }

  async finalize(): Promise<VerificationResult> {
    this.state.status = "finalizing";

    const hasEvidence = this.evidence.length > 0;
    const hasVerified = this.evidence.some((e) => e.status === "verified");
    const hasReviewRequired = this.evidence.some((e) => e.status === "review_required");

    let status: "passed" | "failed" | "uncertain" | "review";
    let reasonCode: string;
    let confidence: number;

    if (hasVerified) {
      status = "passed";
      reasonCode = "EXTERNAL_EVIDENCE_VERIFIED";
      confidence = 0.85;
    } else if (hasReviewRequired) {
      status = "review";
      reasonCode = "EXTERNAL_EVIDENCE_REVIEW_REQUIRED";
      confidence = 0.5;
    } else if (hasEvidence) {
      status = "review";
      reasonCode = "EXTERNAL_EVIDENCE_SUBMITTED";
      confidence = 0.5;
    } else {
      status = "failed";
      reasonCode = "NO_EVIDENCE_SUBMITTED";
      confidence = 0;
    }

    const confidenceClass = confidence >= 0.7 ? "high" : confidence >= 0.4 ? "medium" : "low";

    this.state.status = "stopped";

    return {
      status,
      evidenceType: "external",
      confidenceClass,
      confidenceScore: confidence,
      metrics: {
        totalEvidence: this.evidence.length,
        verified: this.evidence.filter((e) => e.status === "verified").length,
        reviewRequired: this.evidence.filter((e) => e.status === "review_required").length,
        rejected: this.evidence.filter((e) => e.status === "rejected").length,
      },
      reasonCode,
    };
  }
}
