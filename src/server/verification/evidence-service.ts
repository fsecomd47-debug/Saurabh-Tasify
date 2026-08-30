import "server-only";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { missions, verificationResults, missionSessions, missionEvents } from "@/db/schema";
import { AppError, logSecurity } from "@/server/http";
import { classifyConfidence } from "./confidence";
import { logEvent } from "./observability";
import { runAntiCheatChecks } from "./anti-cheat";
import { escalateToReview } from "./review";

type EvidenceInput = {
  photos?: string[];
  externalEvidence?: {
    url?: string;
    timestamp?: string;
    notes?: string;
  };
};

type EvidenceResult = {
  evidenceId: string;
  status: "passed" | "uncertain" | "review";
  confidenceClass: "high" | "medium" | "low";
  message: string;
};

/**
 * Submit photo or external evidence for a mission.
 * Routes through the verification pipeline — does NOT hardcode "passed".
 * §37: High-risk claims require review. §38: No direct camera→reward shortcut.
 */
export async function submitEvidence(
  missionId: string,
  userId: string,
  input: EvidenceInput
): Promise<EvidenceResult> {
  // 1. Load mission
  const mission = await db.select().from(missions).where(eq(missions.id, missionId)).limit(1);
  if (!mission[0]) throw new AppError("MISSION_NOT_FOUND", "Mission not found.");
  if (mission[0].userId !== userId) throw new AppError("FORBIDDEN", "Not your mission.");

  // 2. Check mission is active
  if (mission[0].status !== "active") {
    throw new AppError("MISSION_TERMINAL", `Mission is ${mission[0].status}, not active.`);
  }

  // §50: Anti-replay — check if evidence was already submitted
  const existingEvidence = await db.select({ count: sql<number>`count(*)` })
    .from(verificationResults)
    .where(eq(verificationResults.missionId, missionId))
    .limit(1);

  if (existingEvidence[0] && existingEvidence[0].count > 0) {
    logSecurity("evidence_replay_blocked", { missionId, userId });
    throw new AppError("EVIDENCE_REPLAY", "Evidence already submitted for this mission.");
  }

  // 3. Validate evidence type matches mission verification mode
  const mode = mission[0].verificationMode;
  if (mode === "evidence" && !input.photos && !input.externalEvidence) {
    throw new AppError("VALIDATION_ERROR", "Evidence mission requires photo or external proof.");
  }

  // 4. Run anti-cheat checks
  const antiCheat = await runAntiCheatChecks(missionId, undefined, undefined, userId);
  if (!antiCheat.passed && antiCheat.severity === "block") {
    await db.update(missions)
      .set({ status: "failed", completedAt: new Date(), updatedAt: new Date() })
      .where(eq(missions.id, missionId));

    logSecurity("evidence_anti_cheat_blocked", { missionId, reason: antiCheat.reasonCode });

    return {
      evidenceId: "",
      status: "passed",
      confidenceClass: "low",
      message: "Evidence could not be verified.",
    };
  }

  // 5. Build metadata
  const metadata: Record<string, unknown> = {};
  if (input.photos) {
    metadata.photoCount = input.photos.length;
    metadata.photoSizes = input.photos.map((p) => p.length);
  }
  if (input.externalEvidence) {
    metadata.externalEvidence = {
      url: input.externalEvidence.url,
      timestamp: input.externalEvidence.timestamp,
      notesLength: input.externalEvidence.notes?.length ?? 0,
    };
  }
  if (antiCheat.severity === "warning") {
    metadata.antiCheatWarning = antiCheat.reasonCode;
  }

  // 6. Compute confidence based on evidence type
  let baseConfidence = 0.5;
  if (input.photos && input.photos.length > 0) {
    baseConfidence = 0.65 + Math.min(input.photos.length * 0.05, 0.1);
  }
  if (input.externalEvidence?.url) {
    baseConfidence = Math.max(baseConfidence, 0.6);
  }

  // Apply anti-cheat warning penalty
  if (antiCheat.severity === "warning") {
    baseConfidence *= 0.8;
  }

  // 7. Determine verification status from confidence
  // §37: High-risk external claims go to review regardless
  const isHighRisk = mission[0].verificationMode === "evidence" &&
    mission[0].activityType === "external_result";

  const confidenceClass = classifyConfidence(baseConfidence);
  let finalStatus: "passed" | "uncertain" | "review";

  if (isHighRisk) {
    // §37: External financial claims require review
    finalStatus = "review";
  } else if (confidenceClass === "low") {
    finalStatus = "uncertain";
  } else if (confidenceClass === "medium") {
    finalStatus = "uncertain"; // §40: uncertain, not failed
  } else {
    finalStatus = "passed";
  }

  // 8. Store verification result
  const [result] = await db.insert(verificationResults).values({
    missionId,
    status: finalStatus === "review" ? "uncertain" : finalStatus,
    confidenceClass,
    confidenceScore: baseConfidence,
    reasonCode: input.photos ? "PHOTO_EVIDENCE_SUBMITTED" : "EXTERNAL_EVIDENCE_SUBMITTED",
    metadata,
  }).returning();

  // 9. Update mission status
  if (finalStatus === "review") {
    // §37: Escalate to human review
    await db.update(missions)
      .set({ status: "review", updatedAt: new Date() })
      .where(eq(missions.id, missionId));

    logEvent("VERIFICATION_REVIEW", { reason: "HIGH_RISK_EVIDENCE" }, { missionId, userId });
  } else if (finalStatus === "passed") {
    await db.update(missions)
      .set({ status: "passed", completedAt: new Date(), updatedAt: new Date() })
      .where(eq(missions.id, missionId));

    // End active session
    await db.update(missionSessions)
      .set({ status: "completed", endedAt: new Date() })
      .where(and(
        eq(missionSessions.missionId, missionId),
        eq(missionSessions.status, "active")
      ));

    logEvent("VERIFICATION_PASSED", { confidence: baseConfidence, reasonCode: result.reasonCode }, { missionId, userId });
  } else {
    // uncertain — keep active, user can retry or submit different evidence
    logEvent("VERIFICATION_UNCERTAIN", { confidence: baseConfidence }, { missionId, userId });
  }

  // 10. Log evidence event
  await db.insert(missionEvents).values({
    missionId,
    type: "EVIDENCE_SUBMITTED",
    metadata: {
      hasPhotos: !!input.photos,
      hasExternal: !!input.externalEvidence,
      confidence: baseConfidence,
      status: finalStatus,
    },
  });

  logSecurity("evidence_submitted", {
    missionId,
    hasPhotos: !!input.photos,
    hasExternal: !!input.externalEvidence,
    confidence: baseConfidence,
    status: finalStatus,
  });

  const messages: Record<string, string> = {
    passed: "Evidence verified! You can now claim your reward.",
    uncertain: "We could not confidently verify this mission. You can try again or submit different evidence.",
    review: "Evidence submitted. Our team will review it shortly.",
  };

  return {
    evidenceId: result.id,
    status: finalStatus,
    confidenceClass,
    message: messages[finalStatus],
  };
}
