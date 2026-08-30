import { NextRequest } from "next/server";
import { ok, route, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { getConversation } from "@/server/services/social-messaging-service";

export const GET = route(async (req: NextRequest, ctx: { params: Promise<{ partnerId: string }> }) => {
  enforceRateLimit(req, "message-read", 60, 60 * 1000);
  const user = await requireUser();
  const { partnerId } = await ctx.params;

  const url = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 1), 100);
  const cursor = url.searchParams.get("cursor") || undefined;

  const result = await getConversation(user.id, partnerId, limit, cursor);
  return ok(result);
});
