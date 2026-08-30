import "server-only";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { visionEvidence } from "@/db/schema";
import { logSecurity } from "@/server/http";

/**
 * PDR-4 §51/§52/§112: DB-backed evidence replay defense.
 *
 * Every derived-evidence submission carries a content hash over the
 * observation payload (never raw media). The unique index
 * `vision_evidence_user_content_uq (user_id, content_hash)` makes reuse
 * race-proof: the same user can never bind identical evidence to two
 * settlements. Cross-user collisions are recorded as a risk signal.
 */

export type ReplayVerdict =
  | { allowed: true }
  | { allowed: false; reasonCode: "EVIDENCE_REPLAY" };

export type EvidenceRecordInput = {
  userId: string;
  missionId: string;
  contentHash: string;
  evidenceType: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
};

export async function checkAndRecordEvidence(
  input: EvidenceRecordInput
): Promise<ReplayVerdict> {
  // Same user reusing identical content across missions → replay.
  const ownReuse = await db
    .select({ id: visionEvidence.id, missionId: visionEvidence.missionId })
    .from(visionEvidence)
    .where(
      and(
        eq(visionEvidence.userId, input.userId),
        eq(visionEvidence.contentHash, input.contentHash),
        ne(visionEvidence.missionId, input.missionId)
      )
    )
    .limit(1);

  if (ownReuse.length > 0) {
    logSecurity("evidence_replay_blocked", {
      userId: input.userId,
      missionId: input.missionId,
      priorMissionId: ownReuse[0].missionId,
    });
    return { allowed: false, reasonCode: "EVIDENCE_REPLAY" };
  }

  try {
    await db.insert(visionEvidence).values({
      missionId: input.missionId,
      userId: input.userId,
      contentHash: input.contentHash,
      evidenceType: input.evidenceType,
      metadata: {
        ...(input.metadata ?? {}),
        ...(input.sessionId ? { sessionId: input.sessionId } : {}),
      },
    });
  } catch (err) {
    if (err instanceof Error && /unique|duplicate/i.test(err.message)) {
      logSecurity("evidence_replay_blocked_race", {
        userId: input.userId,
        missionId: input.missionId,
      });
      return { allowed: false, reasonCode: "EVIDENCE_REPLAY" };
    }
    throw err;
  }

  // Cross-user identical content is statistically implausible for
  // session-derived hashes; record as a review signal without blocking.
  const collision = await db
    .select({ count: sql<number>`count(*)` })
    .from(visionEvidence)
    .where(
      and(
        eq(visionEvidence.contentHash, input.contentHash),
        ne(visionEvidence.userId, input.userId)
      )
    );

  if ((collision[0]?.count ?? 0) > 0) {
    logSecurity("evidence_cross_user_collision", {
      userId: input.userId,
      missionId: input.missionId,
    });
  }

  return { allowed: true };
}
