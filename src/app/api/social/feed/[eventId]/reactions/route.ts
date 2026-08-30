import { NextRequest } from "next/server";
import { ok, route, fail } from "@/server/http";
import { requireUser } from "@/server/session";
import { addReaction, removeReaction } from "@/server/services/social-feed-service";
import { z } from "zod";

const schema = z.object({
  emoji: z.string().min(1).max(4),
});

export const POST = route(async (req: NextRequest, ctx: { params: Promise<{ eventId: string }> }) => {
  const user = await requireUser();
  const { eventId } = await ctx.params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0].message);

  await addReaction(user.id, eventId, parsed.data.emoji);
  return ok({ added: true });
});

export const DELETE = route(async (req: NextRequest, ctx: { params: Promise<{ eventId: string }> }) => {
  const user = await requireUser();
  const { eventId } = await ctx.params;
  await removeReaction(user.id, eventId);
  return ok({ removed: true });
});
