import { createHash } from "crypto";
import type {
  EvidenceSession,
  ProviderResult,
  EvidenceManifest,
} from "../../types/evidence";

export interface StoredEvidence {
  id: string;
  missionId: string;
  userId: string;
  sessionId: string;
  fingerprint: string;
  kind: string;
  providerId: string;
  decision: string;
  confidence: number;
  derivedSignals: Record<string, unknown>;
  observations: Record<string, unknown>;
  clientMetadata: Record<string, unknown>;
  createdAt: Date;
}

export interface EvidenceSummary {
  missionId: string;
  totalSessions: number;
  totalEvidence: number;
  averageConfidence: number;
  providerBreakdown: Record<string, { count: number; avgConfidence: number }>;
  lastEvidenceAt: Date | null;
}

export class EvidencePersistence {
  private evidenceStore: Map<string, StoredEvidence[]> = new Map();
  private fingerprintStore: Set<string> = new Set();

  static generateFingerprint(
    manifest: EvidenceManifest,
    itemIndex: number
  ): string {
    const item = manifest.evidenceItems[itemIndex];
    const payload = JSON.stringify({
      sessionId: manifest.sessionId,
      missionId: manifest.missionId,
      userId: manifest.userId,
      nonce: manifest.nonce,
      kind: item.kind,
      providerId: item.providerId,
      signals: item.derivedSignals,
      captureMs: item.clientMetadata.captureMs,
    });
    return createHash("sha256").update(payload).digest("hex");
  }

  async storeEvidence(
    manifest: EvidenceManifest,
    providerResults: ProviderResult[]
  ): Promise<StoredEvidence[]> {
    const stored: StoredEvidence[] = [];

    for (let i = 0; i < manifest.evidenceItems.length; i++) {
      const item = manifest.evidenceItems[i];
      const result = providerResults.find((r) => r.kind === item.kind);
      const fingerprint = EvidencePersistence.generateFingerprint(manifest, i);

      if (this.fingerprintStore.has(fingerprint)) {
        continue;
      }

      this.fingerprintStore.add(fingerprint);

      const evidence: StoredEvidence = {
        id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        missionId: manifest.missionId,
        userId: manifest.userId,
        sessionId: manifest.sessionId,
        fingerprint,
        kind: item.kind,
        providerId: item.providerId,
        decision: result?.decision || "unknown",
        confidence: result?.confidence || 0,
        derivedSignals: item.derivedSignals,
        observations: result?.observations || {},
        clientMetadata: item.clientMetadata as unknown as Record<string, unknown>,
        createdAt: new Date(),
      };

      stored.push(evidence);
    }

    const missionEvidence = this.evidenceStore.get(manifest.missionId) || [];
    missionEvidence.push(...stored);
    this.evidenceStore.set(manifest.missionId, missionEvidence);

    return stored;
  }

  async getEvidenceForMission(
    missionId: string
  ): Promise<StoredEvidence[]> {
    return this.evidenceStore.get(missionId) || [];
  }

  async getEvidenceForSession(
    sessionId: string
  ): Promise<StoredEvidence[]> {
    const allEvidence: StoredEvidence[] = [];
    for (const evidence of this.evidenceStore.values()) {
      allEvidence.push(
        ...evidence.filter((e) => e.sessionId === sessionId)
      );
    }
    return allEvidence;
  }

  async getSummary(missionId: string): Promise<EvidenceSummary> {
    const evidence = await this.getEvidenceForMission(missionId);

    const providerBreakdown: Record<
      string,
      { count: number; avgConfidence: number; totalConfidence: number }
    > = {};

    for (const ev of evidence) {
      if (!providerBreakdown[ev.providerId]) {
        providerBreakdown[ev.providerId] = {
          count: 0,
          avgConfidence: 0,
          totalConfidence: 0,
        };
      }
      providerBreakdown[ev.providerId].count++;
      providerBreakdown[ev.providerId].totalConfidence += ev.confidence;
    }

    for (const key of Object.keys(providerBreakdown)) {
      const entry = providerBreakdown[key];
      entry.avgConfidence = entry.totalConfidence / entry.count;
      delete (entry as Record<string, unknown>).totalConfidence;
    }

    const totalConfidence = evidence.reduce(
      (sum, e) => sum + e.confidence,
      0
    );

    return {
      missionId,
      totalSessions: new Set(evidence.map((e) => e.sessionId)).size,
      totalEvidence: evidence.length,
      averageConfidence:
        evidence.length > 0 ? totalConfidence / evidence.length : 0,
      providerBreakdown,
      lastEvidenceAt:
        evidence.length > 0
          ? new Date(Math.max(...evidence.map((e) => e.createdAt.getTime())))
          : null,
    };
  }

  async isDuplicate(fingerprint: string): Promise<boolean> {
    return this.fingerprintStore.has(fingerprint);
  }

  async cleanup(olderThanMs: number): Promise<number> {
    const cutoff = Date.now() - olderThanMs;
    let removed = 0;

    for (const [missionId, evidence] of this.evidenceStore) {
      const filtered = evidence.filter(
        (e) => e.createdAt.getTime() > cutoff
      );
      removed += evidence.length - filtered.length;

      if (filtered.length === 0) {
        this.evidenceStore.delete(missionId);
      } else {
        this.evidenceStore.set(missionId, filtered);
      }
    }

    return removed;
  }
}

let globalEvidencePersistence: EvidencePersistence | null = null;

export function getEvidencePersistence(): EvidencePersistence {
  if (!globalEvidencePersistence) {
    globalEvidencePersistence = new EvidencePersistence();
  }
  return globalEvidencePersistence;
}
