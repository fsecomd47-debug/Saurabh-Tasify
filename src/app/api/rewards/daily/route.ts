import { NextRequest } from "next/server";
import { route, ok, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { getDailyRewardStatus } from "@/server/services/daily-reward-service";

export const GET = route(async (req: NextRequest) => {
  enforceRateLimit(req, "daily-reward", 30, 60_000);
  const user = await requireUser();
  const status = await getDailyRewardStatus(user.id);
  return ok(status);
});
