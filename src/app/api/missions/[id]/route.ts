import { route, ok } from "@/server/http";
import { requireUser } from "@/server/session";
import { getMission } from "@/server/services/mission-service";
import { enforceMissionExpiry } from "@/server/services/mission-expiration";

export const GET = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await enforceMissionExpiry();
  const mission = await getMission(id, user.id);
  return ok(mission);
});
