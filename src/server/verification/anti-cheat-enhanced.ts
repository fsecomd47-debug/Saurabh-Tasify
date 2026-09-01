import { createHash } from "crypto";
import type {
  EvidenceSession,
  EvidenceManifest,
  AntiCheatConfig,
} from "../../types/evidence";

export interface AntiCheatResult {
  passed: boolean;
  violations: Violation[];
  riskScore: number;
}

export interface Violation {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  details: Record<string, unknown>;
}

export class EnhancedAntiCheat {
  private fingerprintStore: Map<string, Set<string>> = new Map();
  private nonceStore: Map<string, { userId: string; createdAt: number }> =
    new Map();
  private submissionCounts: Map<string, number[]> = new Map();

  static generateEvidenceFingerprint(
    evidenceData: Record<string, unknown>
  ): string {
    const payload = JSON.stringify(evidenceData, Object.keys(evidenceData).sort());
    return createHash("sha256").update(payload).digest("hex");
  }

  static verifySessionBinding(
    session: EvidenceSession,
    manifest: EvidenceManifest
  ): { valid: boolean; violations: Violation[] } {
    const violations: Violation[] = [];

    if (session.sessionNonce !== manifest.nonce) {
      violations.push({
        type: "nonce_mismatch",
        severity: "critical",
        message: "Session nonce does not match",
        details: {
          expected: session.sessionNonce,
          received: manifest.nonce,
        },
      });
    }

    if (session.userId !== manifest.userId) {
      violations.push({
        type: "user_mismatch",
        severity: "critical",
        message: "User ID does not match session",
        details: {
          expected: session.userId,
          received: manifest.userId,
        },
      });
    }

    if (session.missionId !== manifest.missionId) {
      violations.push({
        type: "mission_mismatch",
        severity: "critical",
        message: "Mission ID does not match session",
        details: {
          expected: session.missionId,
          received: manifest.missionId,
        },
      });
    }

    return { valid: violations.length === 0, violations };
  }

  static verifyLiveness(
    session: EvidenceSession,
    manifest: EvidenceManifest
  ): { valid: boolean; violations: Violation[] } {
    const violations: Violation[] = [];

    if (session.proofOfLiveness !== manifest.livenessToken) {
      violations.push({
        type: "liveness_mismatch",
        severity: "high",
        message: "Liveness proof does not match",
        details: {},
      });
    }

    const submissionAge = Date.now() - manifest.submittedAt.getTime();
    if (submissionAge > 15 * 60 * 1000) {
      violations.push({
        type: "submission_too_old",
        severity: "medium",
        message: "Evidence submitted too long after capture",
        details: { ageMs: submissionAge },
      });
    }

    return { valid: violations.length === 0, violations };
  }

  checkFingerprint(
    fingerprint: string,
    missionId: string
  ): { isReplay: boolean; violations: Violation[] } {
    const violations: Violation[] = [];
    const missionFingerprints =
      this.fingerprintStore.get(missionId) || new Set();

    if (missionFingerprints.has(fingerprint)) {
      violations.push({
        type: "replay_detected",
        severity: "high",
        message: "Duplicate evidence fingerprint detected",
        details: { fingerprint: fingerprint.substring(0, 16) + "..." },
      });
      return { isReplay: true, violations };
    }

    missionFingerprints.add(fingerprint);
    this.fingerprintStore.set(missionId, missionFingerprints);
    return { isReplay: false, violations };
  }

  checkTemporalContinuity(
    events: Array<{ timestamp: number; type: string }>,
    config: AntiCheatConfig
  ): { valid: boolean; violations: Violation[] } {
    const violations: Violation[] = [];

    if (events.length < 2) return { valid: true, violations };

    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i].timestamp - sorted[i - 1].timestamp;

      if (gap < 100) {
        violations.push({
          type: "impossible_timing",
          severity: "high",
          message: `Events too close together: ${gap}ms gap`,
          details: { gap, index: i },
        });
      }
    }

    const totalDuration =
      sorted[sorted.length - 1].timestamp - sorted[0].timestamp;
    if (totalDuration > 24 * 60 * 60 * 1000) {
      violations.push({
        type: "session_too_long",
        severity: "medium",
        message: "Session duration exceeds 24 hours",
        details: { durationMs: totalDuration },
      });
    }

    return { valid: violations.length === 0, violations };
  }

  checkEventRate(
    userId: string,
    config: AntiCheatConfig
  ): { valid: boolean; violations: Violation[] } {
    const violations: Violation[] = [];
    const now = Date.now();
    const windowMs = 60 * 1000;

    const timestamps = this.submissionCounts.get(userId) || [];
    const recent = timestamps.filter((t) => now - t < windowMs);
    recent.push(now);
    this.submissionCounts.set(userId, recent);

    if (recent.length > config.maxEventsPerSession) {
      violations.push({
        type: "rate_limit_exceeded",
        severity: "medium",
        message: `Too many submissions: ${recent.length} in last minute`,
        details: { count: recent.length, limit: config.maxEventsPerSession },
      });
    }

    return { valid: violations.length === 0, violations };
  }

  async runFullCheck(
    session: EvidenceSession,
    manifest: EvidenceManifest,
    config: AntiCheatConfig
  ): Promise<AntiCheatResult> {
    const allViolations: Violation[] = [];

    if (config.requireSessionNonce || config.requireLivenessProof) {
      const binding = EnhancedAntiCheat.verifySessionBinding(session, manifest);
      allViolations.push(...binding.violations);
    }

    if (config.requireLivenessProof) {
      const liveness = EnhancedAntiCheat.verifyLiveness(session, manifest);
      allViolations.push(...liveness.violations);
    }

    if (config.requireFingerprint) {
      for (const item of manifest.evidenceItems) {
        const fingerprint = EnhancedAntiCheat.generateEvidenceFingerprint({
          kind: item.kind,
          providerId: item.providerId,
          signals: item.derivedSignals,
          captureMs: item.clientMetadata.captureMs,
        });

        const replayCheck = this.checkFingerprint(
          fingerprint,
          manifest.missionId
        );
        allViolations.push(...replayCheck.violations);
      }
    }

    if (config.temporalContinuity) {
      const events = manifest.evidenceItems.map((item, i) => ({
        timestamp: item.clientMetadata.captureMs + i,
        type: item.kind,
      }));
      const temporal = this.checkTemporalContinuity(events, config);
      allViolations.push(...temporal.violations);
    }

    const rateCheck = this.checkEventRate(manifest.userId, config);
    allViolations.push(...rateCheck.violations);

    const criticalCount = allViolations.filter(
      (v) => v.severity === "critical"
    ).length;
    const highCount = allViolations.filter((v) => v.severity === "high").length;
    const mediumCount = allViolations.filter(
      (v) => v.severity === "medium"
    ).length;

    const riskScore = Math.min(
      1,
      (criticalCount * 0.4 + highCount * 0.2 + mediumCount * 0.1)
    );

    return {
      passed: criticalCount === 0 && highCount === 0,
      violations: allViolations,
      riskScore,
    };
  }

  clearExpired(): void {
    const now = Date.now();
    for (const [userId, timestamps] of this.submissionCounts) {
      const recent = timestamps.filter((t) => now - t < 60 * 1000);
      if (recent.length === 0) {
        this.submissionCounts.delete(userId);
      } else {
        this.submissionCounts.set(userId, recent);
      }
    }
  }
}
