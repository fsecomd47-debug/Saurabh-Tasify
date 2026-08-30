import { NextRequest } from "next/server";
import { ok, fail, route, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { db } from "@/db";
import { visionSessions, missions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

// ============================================================================
// Vision Session Init Request Schema
// ============================================================================

const visionSessionInitSchema = z.object({
  providerTypes: z.array(z.string()).default(["pose", "quality"]),
  processingMode: z.enum(["realtime", "interactive", "snapshot", "low_frequency"]).default("realtime"),
});

// ============================================================================
// POST: Initialize Vision Session
// ============================================================================

export const POST = route(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    enforceRateLimit(req, "vision-session-init", 30, 60_000);
    const user = await requireUser();
    const { id: missionId } = await ctx.params;
    const body = await req.json();
    const input = visionSessionInitSchema.parse(body);

    // 1. Validate mission exists and belongs to user
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

    // 2. Check mission is in a valid state for vision verification
    const validStatuses = ["active", "starting"];
    if (!validStatuses.includes(mission[0].status)) {
      return fail(
        "MISSION_NOT_READY",
        `Mission is ${mission[0].status}, not ready for vision verification.`
      );
    }

    // 3. Check for existing active session
    const existingSession = await db
      .select()
      .from(visionSessions)
      .where(
        and(
          eq(visionSessions.missionId, missionId),
          eq(visionSessions.userId, user.id),
          eq(visionSessions.status, "active")
        )
      )
      .limit(1);

    if (existingSession[0]) {
      // Return existing session
      return ok({
        sessionId: existingSession[0].id,
        status: existingSession[0].status,
        providerTypes: existingSession[0].providerTypes,
        startedAt: existingSession[0].startedAt,
        existing: true,
      });
    }

    // 4. Create new vision session
    const [session] = await db
      .insert(visionSessions)
      .values({
        missionId,
        userId: user.id,
        providerTypes: input.providerTypes,
        status: "active",
      })
      .returning();

    return ok({
      sessionId: session.id,
      status: session.status,
      providerTypes: session.providerTypes,
      startedAt: session.startedAt,
      existing: false,
    });
  }
);

// ============================================================================
// GET: Get Vision Session Status
// ============================================================================

export const GET = route(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id: missionId } = await ctx.params;

    // Get active vision session for this mission
    const session = await db
      .select()
      .from(visionSessions)
      .where(
        and(
          eq(visionSessions.missionId, missionId),
          eq(visionSessions.userId, user.id)
        )
      )
      .orderBy(visionSessions.startedAt)
      .limit(1);

    if (!session[0]) {
      return ok({
        hasSession: false,
        sessionId: null,
        status: null,
      });
    }

    return ok({
      hasSession: true,
      sessionId: session[0].id,
      status: session[0].status,
      providerTypes: session[0].providerTypes,
      startedAt: session[0].startedAt,
      endedAt: session[0].endedAt,
    });
  }
);