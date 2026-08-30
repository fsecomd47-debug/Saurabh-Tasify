import { NextRequest } from "next/server";
import { ok, route, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { verifyMission } from "@/server/verification/verifier";
import { enforceMissionExpiry } from "@/server/services/mission-expiration";
import { verifyMissionSchema } from "@/server/validators/mission";

export const POST = route(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  enforceRateLimit(req, "mission-verify", 10, 60_000); // 10 per minute
  await enforceMissionExpiry();
  const { id } = await ctx.params;
  const body = await req.json();
  const input = verifyMissionSchema.parse(body);

  // Client-supplied status/confidence are advisory; the verifier derives
  // the authoritative result from server-side events (§53).
  const result = await verifyMission(id, user.id, input);
  return ok(result);
});
