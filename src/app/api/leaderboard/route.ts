import { NextRequest } from "next/server";
import { enforceRateLimit, ok, route } from "@/server/http";
import { requireUser } from "@/server/session";
import { getLeaderboard } from "@/server/services/leaderboard-service";

/**
 * GET /api/leaderboard
 * Server-authoritative leaderboard (spec §96/§204–§206).
 * Query params:
 *   mode   = "global" | "weekly" (default "global")
 *   limit  = number (default 50, max 100)
 *   cursor = string (rank to paginate from)
 */
export const GET = route(async (req: NextRequest) => {
  enforceRateLimit(req, "leaderboard", 60, 60 * 1000);
  const user = await requireUser();

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") === "weekly" ? "weekly" : "global";
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 1), 100);
  const cursor = url.searchParams.get("cursor") || null;

  const result = await getLeaderboard(user.id, mode, limit, cursor);
  return ok(result);
});
