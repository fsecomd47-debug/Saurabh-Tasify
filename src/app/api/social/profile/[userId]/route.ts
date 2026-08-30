import { NextRequest } from "next/server";
import { ok, route, fail } from "@/server/http";
import { requireUser } from "@/server/session";
import { buildPlayerCard } from "@/server/services/friendship-service";

export const GET = route(async (req: NextRequest, ctx: { params: Promise<{ userId: string }> }) => {
  const user = await requireUser();
  const { userId } = await ctx.params;
  const card = await buildPlayerCard(userId, user.id);
  if (!card) return fail("NOT_FOUND", "Player not found.");
  return ok({ card });
});
