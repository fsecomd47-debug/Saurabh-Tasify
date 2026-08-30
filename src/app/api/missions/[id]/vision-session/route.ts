import { NextRequest } from "next/server";
import { ok, fail, route, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { db } from "@/db";
import { visionSessions, missions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * PDR-4.2 §52: Create a vision session bound to a specific user and mission.
 * §52/§112: Session must belong to authenticated user + specific mission.
 * Returns sessionId for use with /vision endpoint.
 */
export const POST = route(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    enforceRateLimit(req, "vision-session", 30, 60_000);
    const user = await requireUser();
    const { id: missionId } = await ctx.params;

    // 1. Mission ownership check
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

    // 2. Check for existing active session
    const existing = await db
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

    if (existing[0]) {
      return ok({ sessionId: existing[0].id, reused: true });
    }

    // 3. Create new vision session
    const [session] = await db
      .insert(visionSessions)
      .values({
        missionId,
        userId: user.id,
        providerTypes: ["quality_analyzer"],
        status: "active",
      })
      .returning();

    return ok({ sessionId: session.id, reused: false });
  }
);
