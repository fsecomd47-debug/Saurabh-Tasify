import { NextRequest } from "next/server";
import { enforceRateLimit, fail, ok, route } from "@/server/http";
import { requireUser } from "@/server/session";
import { getPlayerDetail } from "@/server/services/leaderboard-service";

/**
 * GET /api/leaderboard/[userId]
 * Player detail view for leaderboard tap.
 */
export const GET = route(async (req: NextRequest, ctx: { params: Promise<{ userId: string }> }) => {
  enforceRateLimit(req, "leaderboard-player", 60, 60 * 1000);
  const user = await requireUser();
  const { userId } = await ctx.params;

  if (!userId) return fail("VALIDATION_ERROR", "userId is required.");

  const detail = await getPlayerDetail(userId, user.id);
  if (!detail) return fail("NOT_FOUND", "Player not found.");

  return ok(detail);
});
