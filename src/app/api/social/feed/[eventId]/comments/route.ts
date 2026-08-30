import { NextRequest } from "next/server";
import { ok, route, fail } from "@/server/http";
import { requireUser } from "@/server/session";
import { addComment, getComments } from "@/server/services/social-feed-service";
import { z } from "zod";

const postSchema = z.object({
  body: z.string().min(1).max(280),
});

export const GET = route(async (req: NextRequest, ctx: { params: Promise<{ eventId: string }> }) => {
  const user = await requireUser();
  const { eventId } = await ctx.params;
  const comments = await getComments(eventId);
  return ok({ comments });
});

export const POST = route(async (req: NextRequest, ctx: { params: Promise<{ eventId: string }> }) => {
  const user = await requireUser();
  const { eventId } = await ctx.params;
  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0].message);

  await addComment(user.id, eventId, parsed.data.body);
  return ok({ added: true });
});
