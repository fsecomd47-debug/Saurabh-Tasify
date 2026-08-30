import { NextRequest } from "next/server";
import { ok, route, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { getFriendLeaderboard } from "@/server/services/friend-leaderboard-service";

export const GET = route(async (req: NextRequest) => {
  enforceRateLimit(req, "friend-leaderboard", 30, 60 * 1000);
  const user = await requireUser();
  const leaderboard = await getFriendLeaderboard(user.id);
  return ok({ leaderboard });
});
