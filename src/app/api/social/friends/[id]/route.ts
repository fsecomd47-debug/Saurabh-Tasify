import { NextRequest } from "next/server";
import { ok, route } from "@/server/http";
import { requireUser } from "@/server/session";
import { removeFriend } from "@/server/services/friendship-service";

export const DELETE = route(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await removeFriend(user.id, id);
  return ok({ removed: true });
});
