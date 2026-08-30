import { NextRequest } from "next/server";
import { route, ok, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { startMission } from "@/server/services/mission-service";

export const POST = route(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  enforceRateLimit(req, "mission-start", 30, 60_000);
  const user = await requireUser();
  const { id } = await ctx.params;
  const mission = await startMission(id, user.id);
  return ok(mission);
});
