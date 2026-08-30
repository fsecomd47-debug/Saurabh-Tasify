import { NextRequest } from "next/server";
import { route, ok, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { claimDailyReward } from "@/server/services/daily-reward-service";

export const POST = route(async (req: NextRequest) => {
  enforceRateLimit(req, "daily-reward-claim", 10, 60_000);
  const user = await requireUser();
  const result = await claimDailyReward(user.id);
  return ok(result);
});
