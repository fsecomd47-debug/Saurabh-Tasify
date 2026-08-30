import { NextRequest } from "next/server";
import { ok, route, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { submitMissionEvent } from "@/server/verification/verifier";
import { submitEventSchema } from "@/server/validators/mission";

export const POST = route(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  enforceRateLimit(req, "mission-events", 60, 60_000);
  const user = await requireUser();
  const { id } = await ctx.params;
  const body = await req.json();
  const input = submitEventSchema.parse(body);

  const result = await submitMissionEvent(id, user.id, input.type, input.metadata);
  return ok(result);
});
