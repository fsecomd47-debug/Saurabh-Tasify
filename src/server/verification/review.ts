import "server-only";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { missions, verificationResults, missionSessions } from "@/db/schema";
import { AppError, logSecurity } from "@/server/http";

type ReviewDecision = {
  approved: boolean;
  reason?: string;
};

type ReviewResult = {
  missionId: string;
  newStatus: "passed" | "failed";
  reasonCode: string;
};

/**
 * Escalate a mission to human review (when confidence is uncertain).
 */
export async function escalateToReview(missionId: string): Promise<void> {
  const mission = await db.select().from(missions).where(eq(missions.id, missionId)).limit(1);
  if (!mission[0]) throw new AppError("MISSION_NOT_FOUND", "Mission not found.");

  if (mission[0].status !== "verifying") {
    throw new AppError("MISSION_TERMINAL", `Mission is ${mission[0].status}, not verifying.`);
  }

  await db.update(missions)
    .set({ status: "review", updatedAt: new Date() })
    .where(eq(missions.id, missionId));

  logSecurity("mission_escalated_to_review", { missionId });
}

/**
 * Process a human review decision.
 * §121: The reviewer identity is asserted upstream; decisions land back
 * into the same mission state machine.
 */
export async function processReviewDecision(
  missionId: string,
  decision: ReviewDecision,
  reviewerId: string
): Promise<ReviewResult> {
  const mission = await db.select().from(missions).where(eq(missions.id, missionId)).limit(1);
  if (!mission[0]) throw new AppError("MISSION_NOT_FOUND", "Mission not found.");

  if (mission[0].status !== "review") {
    throw new AppError("MISSION_TERMINAL", `Mission is ${mission[0].status}, not in review.`);
  }

  const newStatus = decision.approved ? "passed" : "failed";
  const reasonCode = decision.approved
    ? `HUMAN_APPROVED${decision.reason ? `: ${decision.reason}` : ""}`
    : `HUMAN_REJECTED${decision.reason ? `: ${decision.reason}` : ""}`;

  // Update mission status
  await db.update(missions)
    .set({
      status: newStatus,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(missions.id, missionId));

  // Update verification result
  const verification = await db.select().from(verificationResults)
    .where(eq(verificationResults.missionId, missionId))
    .orderBy(sql`${verificationResults.createdAt} desc`)
    .limit(1);

  if (verification[0]) {
    await db.update(verificationResults)
      .set({
        status: newStatus,
        confidenceClass: decision.approved ? "medium" : "low",
        reasonCode,
      })
      .where(eq(verificationResults.id, verification[0].id));
  }

  // End active session if exists
  await db.update(missionSessions)
    .set({ status: newStatus === "passed" ? "completed" : "failed", endedAt: new Date() })
    .where(and(
      eq(missionSessions.missionId, missionId),
      eq(missionSessions.status, "active")
    ));

  logSecurity("mission_review_decided", {
    missionId,
    reviewerId,
    decision: newStatus,
    reason: decision.reason,
  });

  return { missionId, newStatus, reasonCode };
}
