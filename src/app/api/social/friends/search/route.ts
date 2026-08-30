import { NextRequest } from "next/server";
import { ok, route, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { searchPlayers } from "@/server/services/friendship-service";

export const GET = route(async (req: NextRequest) => {
  enforceRateLimit(req, "social-search", 30, 60 * 1000);
  const user = await requireUser();

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const results = await searchPlayers(q, user.id);
  return ok({ results });
});
