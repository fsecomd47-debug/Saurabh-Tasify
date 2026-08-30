import { NextRequest } from "next/server";
import { ok, route } from "@/server/http";
import { requireUser } from "@/server/session";
import { getChallenge } from "@/server/services/challenge-service";

export const GET = route(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const challenge = await getChallenge(user.id, id);
  if (!challenge) return ok(null);
  return ok({ challenge });
});
