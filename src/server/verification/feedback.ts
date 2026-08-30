/**
 * PDR-4 §83: Evidence Feedback System
 * Collects user feedback after verification to improve quality.
 * Does not automatically treat user disagreement as ground truth.
 */

import "server-only";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { missions, verificationResults, activityEvents } from "@/db/schema";
import { logEvent } from "./observability";

export type FeedbackType = "correct" | "incorrect" | "camera_issue" | "task_completed" | "other";

export type FeedbackResult = {
  recorded: boolean;
  feedbackId: string;
};

/**
 * §83: Record user feedback on verification result.
 * Used as quality signal — does not override verification.
 */
export async function recordVerificationFeedback(
  missionId: string,
  userId: string,
  feedbackType: FeedbackType,
  comment?: string
): Promise<FeedbackResult> {
  // Verify mission belongs to user
  const mission = await db.select().from(missions).where(eq(missions.id, missionId)).limit(1);
  if (!mission[0] || mission[0].userId !== userId) {
    return { recorded: false, feedbackId: "" };
  }

  // Get verification result
  const verification = await db.select().from(verificationResults)
    .where(eq(verificationResults.missionId, missionId))
    .orderBy(sql`${verificationResults.createdAt} desc`)
    .limit(1);

  // Record feedback as activity event
  const [event] = await db.insert(activityEvents).values({
    userId,
    type: "VERIFICATION_FEEDBACK",
    entityId: missionId,
    metadata: {
      feedbackType,
      verificationStatus: verification[0]?.status,
      confidenceScore: verification[0]?.confidenceScore,
      reasonCode: verification[0]?.reasonCode,
      comment: comment?.substring(0, 500), // Limit comment length
      verificationMode: mission[0].verificationMode,
      activityType: mission[0].activityType,
    },
  }).returning();

  logEvent("VERIFICATION_FEEDBACK_RECORDED", {
    feedbackType,
    verificationStatus: verification[0]?.status,
    confidenceScore: verification[0]?.confidenceScore,
  }, { missionId, userId });

  return { recorded: true, feedbackId: event.id };
}

/**
 * §83: Get aggregate feedback stats for a verification mode.
 * Used for provider quality monitoring.
 */
export async function getFeedbackStats(
  verificationMode: string
): Promise<{
  totalFeedback: number;
  correctRate: number;
  incorrectRate: number;
  cameraIssueRate: number;
}> {
  const stats = await db.select({
    feedbackType: activityEvents.metadata,
    count: sql<number>`count(*)::int`,
  })
    .from(activityEvents)
    .where(eq(activityEvents.type, "VERIFICATION_FEEDBACK"))
    .groupBy(activityEvents.metadata);

  let total = 0;
  let correct = 0;
  let incorrect = 0;
  let cameraIssues = 0;

  for (const row of stats) {
    const meta = row.feedbackType as Record<string, unknown>;
    if (meta.verificationMode !== verificationMode) continue;
    total += row.count;
    if (meta.feedbackType === "correct") correct += row.count;
    if (meta.feedbackType === "incorrect") incorrect += row.count;
    if (meta.feedbackType === "camera_issue") cameraIssues += row.count;
  }

  return {
    totalFeedback: total,
    correctRate: total > 0 ? correct / total : 0,
    incorrectRate: total > 0 ? incorrect / total : 0,
    cameraIssueRate: total > 0 ? cameraIssues / total : 0,
  };
}
