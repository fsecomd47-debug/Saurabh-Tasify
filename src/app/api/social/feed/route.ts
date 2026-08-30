import { NextRequest } from "next/server";
import { enforceRateLimit, ok, route } from "@/server/http";
import { requireUser } from "@/server/session";
import { getSocialFeed } from "@/server/services/social-feed-service";

export const GET = route(async (req: NextRequest) => {
  enforceRateLimit(req, "social-feed", 60, 60 * 1000);
  const user = await requireUser();

  const url = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "20", 10) || 20, 1), 50);
  const cursor = url.searchParams.get("cursor") || undefined;

  const result = await getSocialFeed(user.id, limit, cursor);
  return ok(result);
});
