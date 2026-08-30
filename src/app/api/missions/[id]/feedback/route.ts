/**
 * PDR-4.3: Mission Feedback API Route
 * §83: After verification, collect user feedback on result accuracy.
 * Used as quality signal for model improvement.
 */

import { NextRequest } from "next/server";
import { ok, route, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { db } from "@/db";
import { missions, activityEvents, verificationResults } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { AppError, logSecurity } from "@/server/http";

type FeedbackInput = {
  rating: "correct" | "incorrect" | "camera_issue" | "task_completed";
  comment?: string;
};

export const POST = route(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  enforceRateLimit(req, "mission-feedback", 10, 60_000);
  const { id } = await ctx.params;
  const body = await req.json();
  const input = body as FeedbackInput;

  if (!input.rating) {
    throw new AppError("VALIDATION_ERROR", "Rating is required.");
  }

  // 1. Validate mission
  const mission = await db.select().from(missions).where(eq(missions.id, id)).limit(1);
  if (!mission[0]) throw new AppError("MISSION_NOT_FOUND", "Mission not found.");
  if (mission[0].userId !== user.id) throw new AppError("FORBIDDEN", "Not your mission.");

  // 2. Check mission is completed/settled
  const validStatuses = ["passed", "settled", "failed"];
  if (!validStatuses.includes(mission[0].status)) {
    throw new AppError("MISSION_NOT_ACTIVE", "Can only feedback on completed missions.");
  }

  // 3. Get latest verification result
  const verification = await db.select().from(verificationResults)
    .where(eq(verificationResults.missionId, id))
    .orderBy(sql`${verificationResults.createdAt} desc`)
    .limit(1);

  // 4. Store feedback as activity event
  await db.insert(activityEvents).values({
    userId: user.id,
    type: "MISSION_FEEDBACK",
    entityId: id,
    metadata: {
      rating: input.rating,
      comment: input.comment?.substring(0, 500),
      missionStatus: mission[0].status,
      verificationMode: mission[0].verificationMode,
      verificationConfidence: verification[0]?.confidenceScore,
      verificationStatus: verification[0]?.status,
    },
  });

  logSecurity("mission_feedback_received", {
    missionId: id,
    rating: input.rating,
    verificationMode: mission[0].verificationMode,
    verificationConfidence: verification[0]?.confidenceScore,
  });

  return ok({ received: true });
});
