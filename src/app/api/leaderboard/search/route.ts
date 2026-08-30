import { NextRequest } from "next/server";
import { enforceRateLimit, ok, route } from "@/server/http";
import { requireUser } from "@/server/session";
import { searchLeaderboard } from "@/server/services/leaderboard-service";

/**
 * GET /api/leaderboard/search?q=...
 * Search players by displayName (min 2 chars).
 */
export const GET = route(async (req: NextRequest) => {
  enforceRateLimit(req, "leaderboard-search", 30, 60 * 1000);
  const user = await requireUser();

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "20", 10) || 20, 1), 50);

  const rows = await searchLeaderboard(q, user.id, limit);
  return ok({ rows });
});
