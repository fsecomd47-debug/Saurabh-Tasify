import { randomUUID, createHash } from "crypto";
import { db } from "../../db";
import { missions } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import type {
  EvidenceSession,
  EvidenceManifest,
  EvidenceItem,
  ProviderResult,
} from "../../types/evidence";

const SESSION_TTL_MS = 15 * 60 * 1000;
const MAX_ITEMS_PER_SESSION = 20;
const MAX_SESSIONS_PER_MISSION = 5;

export class EvidenceSessionManager {
  static generateSessionNonce(): string {
    return randomUUID();
  }

  static generateLivenessToken(sessionNonce: string, userId: string): string {
    const payload = `${sessionNonce}:${userId}:${Date.now()}`;
    return createHash("sha256").update(payload).digest("hex");
  }

  static async createSession(
    missionId: string,
    userId: string
  ): Promise<EvidenceSession> {
    const mission = await db
      .select({ id: missions.id })
      .from(missions)
      .where(
        and(
          eq(missions.id, missionId),
          eq(missions.userId, userId)
        )
      )
      .limit(1);

    if (mission.length === 0) {
      throw new Error("Mission not found or access denied");
    }

    const activeSessions = await this.getActiveSessionsForMission(missionId);
    if (activeSessions.length >= MAX_SESSIONS_PER_MISSION) {
      throw new Error("Maximum sessions reached for this mission");
    }

    const sessionNonce = this.generateSessionNonce();
    const proofOfLiveness = this.generateLivenessToken(sessionNonce, userId);
    const now = new Date();

    const session: EvidenceSession = {
      id: randomUUID(),
      missionId,
      userId,
      sessionNonce,
      startedAt: now,
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
      proofOfLiveness,
      status: "pending",
      providerResults: [],
      createdAt: now,
      updatedAt: now,
    };

    return session;
  }

  static async validateSession(
    session: EvidenceSession,
    manifest: EvidenceManifest
  ): Promise<{ valid: boolean; error?: string }> {
    if (session.status === "expired") {
      return { valid: false, error: "Session has expired" };
    }

    if (new Date() > session.expiresAt) {
      session.status = "expired";
      return { valid: false, error: "Session has expired" };
    }

    if (session.sessionNonce !== manifest.nonce) {
      return { valid: false, error: "Session nonce mismatch" };
    }

    if (session.proofOfLiveness !== manifest.livenessToken) {
      return { valid: false, error: "Liveness proof mismatch" };
    }

    if (session.userId !== manifest.userId) {
      return { valid: false, error: "User ID mismatch" };
    }

    if (session.missionId !== manifest.missionId) {
      return { valid: false, error: "Mission ID mismatch" };
    }

    if (manifest.evidenceItems.length > MAX_ITEMS_PER_SESSION) {
      return {
        valid: false,
        error: `Too many evidence items (max ${MAX_ITEMS_PER_SESSION})`,
      };
    }

    const submissionAge = Date.now() - manifest.submittedAt.getTime();
    if (submissionAge > SESSION_TTL_MS) {
      return { valid: false, error: "Submission too old" };
    }

    return { valid: true };
  }

  static async addProviderResult(
    session: EvidenceSession,
    providerResult: ProviderResult
  ): Promise<void> {
    session.providerResults.push(providerResult);
    session.updatedAt = new Date();
  }

  static async finalizeSession(
    session: EvidenceSession
  ): Promise<EvidenceSession> {
    session.status = "accepted";
    session.updatedAt = new Date();
    return session;
  }

  static async expireSession(
    session: EvidenceSession
  ): Promise<EvidenceSession> {
    session.status = "expired";
    session.updatedAt = new Date();
    return session;
  }

  static async getActiveSessionsForMission(
    missionId: string
  ): Promise<EvidenceSession[]> {
    return [];
  }

  static generateEvidenceFingerprint(item: EvidenceItem): string {
    const payload = JSON.stringify({
      kind: item.kind,
      providerId: item.providerId,
      derivedSignals: item.derivedSignals,
      captureMs: item.clientMetadata.captureMs,
      sessionId: item.id,
    });
    return createHash("sha256").update(payload).digest("hex");
  }

  static async checkReplay(
    fingerprint: string,
    existingFingerprints: Set<string>
  ): Promise<boolean> {
    return existingFingerprints.has(fingerprint);
  }

  static buildManifest(
    session: EvidenceSession,
    evidenceItems: EvidenceItem[]
  ): EvidenceManifest {
    return {
      sessionId: session.id,
      missionId: session.missionId,
      userId: session.userId,
      nonce: session.sessionNonce,
      livenessToken: session.proofOfLiveness,
      submittedAt: new Date(),
      evidenceItems,
    };
  }
}
