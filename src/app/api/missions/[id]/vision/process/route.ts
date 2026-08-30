/**
 * PDR-4.2: Server Vision Processing API Route
 * Handles server-side vision processing for evidence that requires
 * server inference (e.g., complex object detection, scene comparison).
 *
 * §30: Local-first vision preferred. This route is the fallback
 * when client-side processing is insufficient.
 */

import { NextRequest } from "next/server";
import { ok, route, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { db } from "@/db";
import { missions, visionSessions, visionEvents, visionResults } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { AppError, logSecurity } from "@/server/http";

type VisionProcessingRequest = {
  missionId: string;
  sessionId: string;
  providerType: "pose" | "object" | "scene" | "document" | "quality" | "evidence";
  inputType: "photo" | "frame";
  inputMetadata: {
    width?: number;
    height?: number;
    format?: string;
    sizeBytes?: number;
  };
  observations: Array<{
    type: string;
    confidence: number;
    metrics: Record<string, number>;
    message?: string;
  }>;
};

export const POST = route(async (req: NextRequest) => {
  const user = await requireUser();
  enforceRateLimit(req, "vision-process", 30, 60_000);

  const body = await req.json();
  const input = body as VisionProcessingRequest;

  if (!input.missionId || !input.providerType || !input.observations) {
    throw new AppError("VALIDATION_ERROR", "Missing required fields: missionId, providerType, observations");
  }

  // 1. Validate mission ownership
  const mission = await db.select().from(missions).where(eq(missions.id, input.missionId)).limit(1);
  if (!mission[0]) throw new AppError("MISSION_NOT_FOUND", "Mission not found.");
  if (mission[0].userId !== user.id) throw new AppError("FORBIDDEN", "Not your mission.");

  // 2. Validate session
  const session = await db.select().from(visionSessions)
    .where(and(
      eq(visionSessions.missionId, input.missionId),
      eq(visionSessions.userId, user.id),
      eq(visionSessions.status, "active")
    ))
    .limit(1);

  if (!session[0]) {
    // Create a new vision session if none exists
    const [newSession] = await db.insert(visionSessions).values({
      missionId: input.missionId,
      userId: user.id,
      providerTypes: [input.providerType],
      status: "active",
    }).returning();

    session[0] = newSession;
  }

  // 3. Get next sequence number
  const lastEvent = await db.select({ sequence: visionEvents.sequence })
    .from(visionEvents)
    .where(eq(visionEvents.sessionId, session[0].id))
    .orderBy(sql`${visionEvents.sequence} desc`)
    .limit(1);

  const nextSequence = (lastEvent[0]?.sequence ?? 0) + 1;

  // 4. Store derived observations (§29: no raw media storage)
  for (const obs of input.observations) {
    await db.insert(visionEvents).values({
      missionId: input.missionId,
      sessionId: session[0].id,
      userId: user.id,
      sequence: nextSequence,
      type: obs.type,
      timestamp: Date.now(),
      payload: {
        confidence: obs.confidence,
        ...obs.metrics,
      },
    });
  }

  // 5. Compute aggregate confidence from observations
  const totalConfidence = input.observations.reduce((sum, o) => sum + o.confidence, 0);
  const avgConfidence = input.observations.length > 0
    ? totalConfidence / input.observations.length
    : 0;

  // 6. Determine evidence class
  let evidenceClass: "clear" | "partial" | "insufficient" = "insufficient";
  if (avgConfidence >= 0.7) evidenceClass = "clear";
  else if (avgConfidence >= 0.4) evidenceClass = "partial";

  // 7. Store vision result
  const [visionResult] = await db.insert(visionResults).values({
    missionId: input.missionId,
    sessionId: session[0].id,
    userId: user.id,
    status: avgConfidence >= 0.5 ? "supported" : "uncertain",
    evidenceClass,
    confidenceScore: avgConfidence,
    metrics: {
      observationCount: input.observations.length,
      providerType: input.providerType === "pose" ? 1 : input.providerType === "object" ? 2 : 3,
    },
    reasonCode: `${input.providerType.toUpperCase()}_PROCESSED`,
  }).returning();

  logSecurity("vision_processed", {
    missionId: input.missionId,
    providerType: input.providerType,
    observationCount: input.observations.length,
    avgConfidence,
    evidenceClass,
  });

  return ok({
    resultId: visionResult.id,
    confidence: avgConfidence,
    evidenceClass,
    observationCount: input.observations.length,
  });
});
