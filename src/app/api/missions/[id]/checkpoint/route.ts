import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, route, AppError, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { db } from "@/db";
import { missions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { recordCheckpoint, getCheckpointSummary } from "@/server/verification/checkpoint";

/**
 * POST /api/missions/[id]/checkpoint — Record a checkpoint during active mission
 */
export const POST = route(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  enforceRateLimit(req, "checkpoint", 60, 60_000);
  const user = await requireUser();
  const { id } = await ctx.params;

  // Ownership check
  const mission = await db.select({ userId: missions.userId }).from(missions).where(eq(missions.id, id)).limit(1);
  if (!mission[0]) throw new AppError("MISSION_NOT_FOUND", "Mission not found.");
  if (mission[0].userId !== user.id) throw new AppError("FORBIDDEN", "Not your mission.");

  const result = await recordCheckpoint(id, user.id);
  return ok(result);
});

/**
 * GET /api/missions/[id]/checkpoint — Get checkpoint summary
 */
export const GET = route(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;

  // Ownership check
  const mission = await db.select({ userId: missions.userId }).from(missions).where(eq(missions.id, id)).limit(1);
  if (!mission[0]) throw new AppError("MISSION_NOT_FOUND", "Mission not found.");
  if (mission[0].userId !== user.id) throw new AppError("FORBIDDEN", "Not your mission.");

  const summary = await getCheckpointSummary(id);
  return ok(summary);
});
