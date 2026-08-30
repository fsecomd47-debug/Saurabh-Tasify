import { NextRequest } from "next/server";
import { ok, route } from "@/server/http";
import { requireUser } from "@/server/session";
import { acceptChallenge } from "@/server/services/challenge-service";

export const POST = route(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await acceptChallenge(user.id, id);
  return ok({ accepted: true });
});
