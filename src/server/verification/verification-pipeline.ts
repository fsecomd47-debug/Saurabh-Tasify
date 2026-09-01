import { EvidenceSessionManager } from "./evidence-session";
import { VerificationRouter } from "./verification-router";
import { MissionPolicyEngine } from "./mission-policy";
import { QualityGate } from "./quality-gate";
import { EnhancedAntiCheat } from "./anti-cheat-enhanced";
import { getEvidencePersistence } from "./evidence-persistence";
import { initializeProviders } from "./providers";
import { normalizeOCRText, extractReceiptTotal, extractWordCount } from "./ocr-normalization";
import { getReasonCode, getUserMessage, isRetryable } from "./reason-codes";
import { getMissionGuidance, getCoachingMessage } from "./mission-guidance";
import type {
  EvidenceSession,
  EvidenceManifest,
  MissionVerificationRequest,
  MissionVerificationResponse,
  ProviderResult,
  VerificationFeedback,
} from "../../types/evidence";
import type { ReasonCode } from "./reason-codes";

let antiCheatInstance: EnhancedAntiCheat | null = null;

function getAntiCheat(): EnhancedAntiCheat {
  if (!antiCheatInstance) {
    antiCheatInstance = new EnhancedAntiCheat();
  }
  return antiCheatInstance;
}

export class VerificationPipeline {
  static async startSession(
    missionId: string,
    userId: string
  ): Promise<EvidenceSession> {
    initializeProviders();
    return EvidenceSessionManager.createSession(missionId, userId);
  }

  static async processVerification(
    request: MissionVerificationRequest
  ): Promise<MissionVerificationResponse> {
    const startTime = Date.now();

    try {
      const policy = MissionPolicyEngine.getPolicy(
        request.missionId.split("-")[0] || "default",
        "medium"
      );

      const session: EvidenceSession = {
        id: request.sessionId,
        missionId: request.missionId,
        userId: request.userId,
        sessionNonce: request.sessionNonce,
        startedAt: new Date(request.clientMetadata.startedAt),
        expiresAt: new Date(
          Date.now() + 15 * 60 * 1000
        ),
        proofOfLiveness: request.evidenceManifest.livenessToken,
        status: "pending",
        providerResults: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 1. Validate session binding (§101-§103: mission/user/session ownership)
      const sessionValidation = await EvidenceSessionManager.validateSession(
        session,
        request.evidenceManifest
      );

      if (!sessionValidation.valid) {
        const reasonCode: ReasonCode = "SESSION_NONCE_MISMATCH";
        return {
          success: false,
          verdict: "rejected",
          confidence: 0,
          evidenceSessionId: request.sessionId,
          providerResults: [],
          error: getUserMessage(reasonCode),
          feedback: {
            summary: "Session verification failed",
            providerFeedbacks: [],
            suggestions: [getUserMessage(reasonCode)],
            humanReadable: getUserMessage(reasonCode),
          },
        };
      }

      // 2. Anti-cheat checks (§44-§50, §104-§106)
      const antiCheat = getAntiCheat();
      const antiCheatResult = await antiCheat.runFullCheck(
        session,
        request.evidenceManifest,
        policy.antiCheat
      );

      if (!antiCheatResult.passed) {
        const criticalViolations = antiCheatResult.violations.filter(
          (v) => v.severity === "critical"
        );
        const reasonCode: ReasonCode = criticalViolations.length > 0
          ? (criticalViolations[0].type as ReasonCode) || "ANTI_CHEAT_FAILED"
          : "ANTI_CHEAT_FAILED";
        return {
          success: false,
          verdict: "rejected",
          confidence: 0,
          evidenceSessionId: request.sessionId,
          providerResults: [],
          error: getUserMessage(reasonCode),
          feedback: {
            summary: "Security check failed",
            providerFeedbacks: [],
            suggestions: [getUserMessage(reasonCode)],
            humanReadable: getUserMessage(reasonCode),
          },
        };
      }

      // 3. Quality gate (§10, §54)
      for (const item of request.evidenceManifest.evidenceItems) {
        const gate2Result = QualityGate.gate2Server(item, policy.qualityGate);
        if (!gate2Result.passed) {
          const reasonCode: ReasonCode = "LOW_QUALITY";
          return {
            success: false,
            verdict: "rejected",
            confidence: 0,
            evidenceSessionId: request.sessionId,
            providerResults: [],
            error: getUserMessage(reasonCode),
            feedback: {
              summary: "Quality gate failed",
              providerFeedbacks: [],
              suggestions: gate2Result.blockReasons.map((r) => r),
              humanReadable: gate2Result.blockReasons.join(". "),
            },
          };
        }
      }

      // 4. Provider processing (§77-§78: Observation vs Decision separation)
      const { providerResults, overallDecision, overallConfidence } =
        await VerificationRouter.processEvidenceManifest(
          request.evidenceManifest,
          session,
          policy
        );

      // 5. Mission policy validation (§79-§83)
      const policyEvaluation = MissionPolicyEngine.evaluatePolicy(
        policy,
        providerResults.map((r) => ({
          kind: r.kind,
          decision: r.decision,
          confidence: r.confidence,
        }))
      );

      if (!policyEvaluation.passed) {
        const firstFailedReason = policyEvaluation.reasons[0] || "";
        const reasonCode: ReasonCode = firstFailedReason.includes("required")
          ? "OBJECT_NOT_DETECTED"
          : "LOW_QUALITY";

        const coaching = getCoachingMessage(
          request.missionId.split("-")[0] || "default",
          reasonCode
        );

        return {
          success: false,
          verdict: overallDecision,
          confidence: overallConfidence,
          evidenceSessionId: request.sessionId,
          providerResults,
          error: getUserMessage(reasonCode),
          feedback: {
            summary: "Mission requirements not met",
            providerFeedbacks: providerResults.map((r) => ({
              providerId: r.providerId,
              kind: r.kind,
              decision: r.decision,
              confidence: r.confidence,
              message: getUserMessage(reasonCode),
              details: r.observations,
            })),
            suggestions: policyEvaluation.reasons.map((r) => r),
            humanReadable: coaching || getUserMessage(reasonCode),
          },
        };
      }

      // 6. OCR text normalization (§13-§22: structured observations, not raw text)
      for (const item of request.evidenceManifest.evidenceItems) {
        if (item.kind === "ocr" && item.derivedSignals.text) {
          const text = item.derivedSignals.text as string;
          const normalized = normalizeOCRText(text);

          // Store derived facts, not raw text (§107-§112: privacy)
          item.derivedSignals.normalizedFacts = {
            currencies: normalized.extractedFacts.currencies,
            numbers: normalized.extractedFacts.numbers,
            words: normalized.extractedFacts.words,
            hasTable: normalized.extractedFacts.hasTable,
          };
        }
      }

      // 7. Persist evidence (§106-§110: derived-only storage)
      const persistence = getEvidencePersistence();
      await persistence.storeEvidence(
        request.evidenceManifest,
        providerResults
      );

      // 8. Build feedback with coaching (§85-§98, §192-§196)
      const feedback = VerificationRouter.buildFeedback(
        providerResults,
        policy
      );

      // 9. Reward separation (§179-§180: CV never calls wallet directly)
      const stAmount = Math.round(overallConfidence * 10);
      const xpAmount = Math.round(overallConfidence * 20);

      // 10. Version tracking (§203-§206: reproducibility)
      const versionInfo = {
        policyVersion: policy.version,
        providerVersions: providerResults.map((r) => ({
          providerId: r.providerId,
          version: "1.0.0",
        })),
        pipelineVersion: "4.3.0",
        processingMs: Date.now() - startTime,
      };

      return {
        success: true,
        verdict: overallDecision,
        confidence: overallConfidence,
        evidenceSessionId: request.sessionId,
        providerResults,
        rewards: {
          stAmount,
          xpAmount,
        },
        feedback,
      };
    } catch (error) {
      return {
        success: false,
        verdict: "rejected",
        confidence: 0,
        evidenceSessionId: request.sessionId,
        providerResults: [],
        error: "Something went wrong. Please try again.",
      };
    }
  }

  static async getEvidenceSummary(missionId: string) {
    const persistence = getEvidencePersistence();
    return persistence.getSummary(missionId);
  }

  static async checkDuplicate(fingerprint: string): Promise<boolean> {
    const persistence = getEvidencePersistence();
    return persistence.isDuplicate(fingerprint);
  }

  static cleanup(): void {
    antiCheatInstance = null;
  }
}
