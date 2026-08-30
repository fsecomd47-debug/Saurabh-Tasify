import { NextRequest } from "next/server";
import { ok, fail, route, AppError, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { db } from "@/db";
import {
  visionSessions,
  visionEvents,
  visionResults,
  missions,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { deriveVisionVerdict, validateObservationSequence } from "@/server/verification/vision-validation";
import { checkAndRecordEvidence } from "@/server/verification/replay-defense";
import { verifyMission } from "@/server/verification/verifier";
import { resolveProviderVersions, currentPolicyVersion } from "@/server/verification/versioning";
import { logEvent } from "@/server/verification/observability";

/**
 * PDR-4 §53/§54: The client sends derived observations only. This route
 * validates session ownership, event sequencing and evidence replay,
 * then routes the final decision through the shared verifier pipeline —
 * it never mutates mission status directly (§141: no client-driven
 * reward path).
 */

const qualityMetricsSchema = z.object({
  blurScore: z.number(),
  brightnessScore: z.number(),
  contrastScore: z.number(),
  resolutionScore: z.number(),
  orientationScore: z.number(),
  subjectVisibility: z.number(),
  overallQuality: z.number(),
});

const observationSchema = z.object({
  frameIndex: z.number().int().min(0),
  timestamp: z.number(),
  confidence: z.number().min(0).max(1),
  qualityMetrics: qualityMetricsSchema.optional(),
});

const summarySchema = z.object({
  totalFrames: z.number().int().min(0).max(100_000),
  processedFrames: z.number().int().min(0).max(100_000),
  averageConfidence: z.number().min(0).max(1),
  qualityScore: z.number().min(0).max(1),
  formScore: z.number().min(0).max(1).optional(),
  repCount: z.number().int().min(0).max(2000).optional(),
  objectCount: z.number().int().min(0).max(200).optional(),
  changeScore: z.number().min(0).max(1).optional(),
  regionChangeScore: z.number().min(0).max(1).optional(),
  textLength: z.number().int().min(0).max(100_000).optional(),
  fieldCount: z.number().int().min(0).max(50).optional(),
});

const visionVerifySchema = z.object({
  sessionId: z.string().uuid(),
  providerIds: z.array(z.string().max(40)).max(8).default([]),
  observations: z.array(observationSchema).max(6000),
  summary: summarySchema,
  evidenceHash: z.string().regex(/^[a-f0-9]{16,128}$/i, "Invalid evidence hash"),
  processingTimeMs: z.number().min(0).max(3_600_000),
});

function expectedObjectCountFromRules(rules: Record<string, unknown>): number | undefined {
  const raw = rules?.expectedObjectCount;
  return typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? raw : undefined;
}

export const POST = route(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    enforceRateLimit(req, "vision-verify", 30, 60_000);
    const user = await requireUser();
    const { id: missionId } = await ctx.params;
    const body = await req.json();
    const input = visionVerifySchema.parse(body);

    // 1. Mission ownership
    const mission = await db
      .select()
      .from(missions)
      .where(eq(missions.id, missionId))
      .limit(1);

    if (!mission[0]) {
      return fail("MISSION_NOT_FOUND", "Mission not found.");
    }
    if (mission[0].userId !== user.id) {
      return fail("FORBIDDEN", "Not your mission.");
    }

    // 2. Session binding — session must belong to this user AND mission.
    const session = await db
      .select()
      .from(visionSessions)
      .where(
        and(
          eq(visionSessions.id, input.sessionId),
          eq(visionSessions.missionId, missionId),
          eq(visionSessions.userId, user.id),
          eq(visionSessions.status, "active")
        )
      )
      .limit(1);

    if (!session[0]) {
      return fail("VISION_SESSION_NOT_FOUND", "Vision session not found or not active.");
    }

    // 3. §54: Temporal coherence of derived events (server-validated).
    const sequenceCheck = validateObservationSequence(input.observations);
    if (!sequenceCheck.ok) {
      return fail("VALIDATION_ERROR", `Observations rejected: ${sequenceCheck.reasonCode}`);
    }

    // 4. §51: Replay defense — DB-backed, race-proof content-hash check.
    const verdict2 = await checkAndRecordEvidence({
      userId: user.id,
      missionId,
      contentHash: input.evidenceHash.toLowerCase(),
      evidenceType:
        input.summary.repCount != null
          ? "pose"
          : input.summary.objectCount != null
            ? "object_count"
            : input.summary.changeScore != null
              ? "scene_change"
              : input.summary.textLength != null
                ? "document"
                : "quality",
      sessionId: input.sessionId,
      metadata: {
        totalFrames: input.summary.totalFrames,
        averageConfidence: input.summary.averageConfidence,
        policyVersion: currentPolicyVersion(),
      },
    });

    if (!verdict2.allowed) {
      return fail(verdict2.reasonCode, "This evidence has already been used.");
    }

    // 5. Persist derived observations with server-assigned sequences.
    let nextSequenceRow = await db
      .select({ maxSeq: sql<number>`coalesce(max(${visionEvents.sequence}), 0)` })
      .from(visionEvents)
      .where(eq(visionEvents.sessionId, input.sessionId));

    let sequence = Number(nextSequenceRow[0]?.maxSeq ?? 0);

    for (const obs of input.observations.slice(-500)) {
      sequence += 1;
      await db.insert(visionEvents).values({
        missionId,
        sessionId: input.sessionId,
        userId: user.id,
        sequence,
        type: "FRAME_PROCESSED",
        timestamp: Math.round(obs.timestamp),
        payload: {
          confidence: obs.confidence,
          quality: obs.qualityMetrics?.overallQuality ?? 0,
        },
      });
    }

    // 6. Server-derived verdict — local-first signals, server decides.
    const expectedCount = expectedObjectCountFromRules(mission[0].verificationRules ?? {});
    const verdict = deriveVisionVerdict(mission[0].verificationMode, input.summary, expectedCount);

    const stackProviders = resolveProviderVersions(
      input.providerIds.length > 0 ? input.providerIds : ["quality_analyzer"]
    );

    const [result] = await db
      .insert(visionResults)
      .values({
        missionId,
        sessionId: input.sessionId,
        userId: user.id,
        status: verdict.supported ? "supported" : verdict.uncertain ? "uncertain" : "unsupported",
        evidenceClass: verdict.confidence >= 0.7 ? "clear" : verdict.confidence >= 0.42 ? "partial" : "insufficient",
        confidenceScore: verdict.confidence,
        metrics: {
          qualityScore: input.summary.qualityScore,
          formScore: input.summary.formScore ?? 0,
          repCount: input.summary.repCount ?? 0,
          objectCount: input.summary.objectCount ?? 0,
          changeScore: input.summary.changeScore ?? 0,
          processingTimeMs: input.processingTimeMs,
        },
        reasonCode: verdict.reasonCode,
      })
      .returning();

    logEvent("VERIFICATION_STARTED", { reasonCode: verdict.reasonCode }, { missionId, userId: user.id });

    // 7. Close the vision session.
    await db
      .update(visionSessions)
      .set({
        status: verdict.supported ? "completed" : "failed",
        endedAt: new Date(),
      })
      .where(eq(visionSessions.id, input.sessionId));

    if (verdict.uncertain || (!verdict.supported && verdict.confidence >= 0.42)) {
      // Honest uncertainty: leave the mission open for a better attempt.
      return ok({
        resultId: result.id,
        status: "uncertain",
        confidenceClass: result.evidenceClass,
        reasonCode: verdict.reasonCode,
        confidence: verdict.confidence,
        guidance: "We need a clearer view. Improve lighting or framing and try again.",
        versions: { policyVersion: currentPolicyVersion(), providers: stackProviders },
      });
    }

    if (!verdict.supported) {
      return ok({
        resultId: result.id,
        status: "unsupported",
        confidenceClass: result.evidenceClass,
        reasonCode: verdict.reasonCode,
        confidence: verdict.confidence,
        versions: { policyVersion: currentPolicyVersion(), providers: stackProviders },
      });
    }

    // 8. §22: Final settlement authority stays inside the verifier —
    // anti-cheat and server-side confidence recomputation always run.
    try {
      const verification = await verifyMission(missionId, user.id, {
        status: "passed",
        confidenceScore: verdict.confidence,
        durationSeconds: undefined,
        repetitionCount: input.summary.repCount,
        presenceSamples: undefined,
        reasonCode: verdict.reasonCode,
        metadata: {
          visionResultId: result.id,
          visionSessionId: input.sessionId,
          derivedSignals: {
            objectCount: input.summary.objectCount,
            changeScore: input.summary.changeScore,
            regionChangeScore: input.summary.regionChangeScore,
            textLength: input.summary.textLength,
            fieldCount: input.summary.fieldCount,
          },
          versions: {
            policyVersion: currentPolicyVersion(),
            providers: stackProviders,
          },
        },
      });

      return ok({
        resultId: result.id,
        status: verification.status === "passed" ? "supported" : verification.status,
        confidenceClass: verification.confidenceClass,
        reasonCode: verification.reasonCode,
        confidence: verdict.confidence,
        missionStatus: verification.status,
        versions: { policyVersion: currentPolicyVersion(), providers: stackProviders },
      });
    } catch (err) {
      if (err instanceof AppError && err.code === "MISSION_TERMINAL") {
        return fail("MISSION_TERMINAL", err.message);
      }
      throw err;
    }
  }
);

export const GET = route(
  async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id: missionId } = await ctx.params;

    const mission = await db
      .select({ userId: missions.userId })
      .from(missions)
      .where(eq(missions.id, missionId))
      .limit(1);

    if (!mission[0]) {
      return fail("MISSION_NOT_FOUND", "Mission not found.");
    }
    if (mission[0].userId !== user.id) {
      return fail("FORBIDDEN", "Not your mission.");
    }

    const results = await db
      .select()
      .from(visionResults)
      .where(eq(visionResults.missionId, missionId))
      .orderBy(visionResults.createdAt);

    return ok({ missionId, results });
  }
);
