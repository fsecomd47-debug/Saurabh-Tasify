import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, route, AppError, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { db } from "@/db";
import { missions, missionSessions, missionEvents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyMission } from "@/server/verification/verifier";

/**
 * PDR-4 §21/§53: Observation submission route.
 *
 * Allows the client-side VerificationOrchestrator to submit derived
 * observations (pose landmarks, focus presence, quality metrics, etc.)
 * without requiring a full vision session. The server stores observations
 * as mission events and routes through the verifier for final settlement.
 *
 * This is the lightweight alternative to /vision for non-camera
 * verification modes (focus, timer, self_reported, evidence).
 */

const observationSchema = z.object({
  type: z.string().max(40),
  confidence: z.number().min(0).max(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const observationsSchema = z.object({
  observations: z.array(observationSchema).max(100),
  summary: z.object({
    totalObservations: z.number().int().min(0).max(10_000),
    averageConfidence: z.number().min(0).max(1),
  }).optional(),
});

export const POST = route(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  enforceRateLimit(req, "observations", 60, 60_000);
  const user = await requireUser();
  const { id: missionId } = await ctx.params;
  const body = await req.json();
  const input = observationsSchema.parse(body);

  // 1. Mission ownership
  const mission = await db.select().from(missions).where(eq(missions.id, missionId)).limit(1);
  if (!mission[0]) throw new AppError("MISSION_NOT_FOUND", "Mission not found.");
  if (mission[0].userId !== user.id) throw new AppError("FORBIDDEN", "Not your mission.");

  // 2. Mission must be active
  if (mission[0].status !== "active") {
    throw new AppError("MISSION_NOT_ACTIVE", `Mission is ${mission[0].status}, not active.`);
  }

  // 3. Get active session
  const session = await db.select().from(missionSessions)
    .where(and(eq(missionSessions.missionId, missionId), eq(missionSessions.status, "active")))
    .limit(1);

  // 4. Store observations as mission events
  const storedEvents: string[] = [];
  for (const obs of input.observations) {
    const [event] = await db.insert(missionEvents).values({
      missionId,
      sessionId: session[0]?.id,
      type: obs.type,
      metadata: {
        ...obs.metadata,
        ...(obs.confidence != null ? { confidence: obs.confidence } : {}),
      },
    }).returning();
    storedEvents.push(event.id);
  }

  // 5. If summary provided, store as aggregated observation
  if (input.summary) {
    await db.insert(missionEvents).values({
      missionId,
      sessionId: session[0]?.id,
      type: "OBSERVATIONS_SUMMARY",
      metadata: {
        totalObservations: input.summary.totalObservations,
        averageConfidence: input.summary.averageConfidence,
        observationCount: input.observations.length,
      },
    });
  }

  return ok({
    stored: storedEvents.length,
    eventId: storedEvents[storedEvents.length - 1],
  });
});

export const GET = route(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id: missionId } = await ctx.params;

  // Mission ownership
  const mission = await db.select().from(missions).where(eq(missions.id, missionId)).limit(1);
  if (!mission[0]) throw new AppError("MISSION_NOT_FOUND", "Mission not found.");
  if (mission[0].userId !== user.id) throw new AppError("FORBIDDEN", "Not your mission.");

  // Get all observation events
  const events = await db.select().from(missionEvents)
    .where(and(
      eq(missionEvents.missionId, missionId),
      eq(missionEvents.type, "OBSERVATIONS_SUMMARY")
    ))
    .orderBy(missionEvents.createdAt);

  return ok({ observations: events });
});
