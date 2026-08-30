import { ok, route } from "@/server/http";
import { requireUser } from "@/server/session";
import { getActivityFeed } from "@/server/services/leaderboard-service";

export const GET = route(async () => {
  const user = await requireUser();
  return ok(await getActivityFeed(25, user.id));
});
