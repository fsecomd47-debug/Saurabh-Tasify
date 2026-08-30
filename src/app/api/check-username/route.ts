import { NextRequest } from "next/server";
import { enforceRateLimit, ok, route } from "@/server/http";
import { checkDisplayNameAvailable } from "@/server/services/username-service";

/**
 * GET /api/check-username?name=Saurabh
 * Returns { available: boolean, takenBy?: string }.
 * No auth required — used during onboarding before account exists.
 */
export const GET = route(async (req: NextRequest) => {
  enforceRateLimit(req, "check-username", 30, 60 * 1000);

  const name = (new URL(req.url).searchParams.get("name") ?? "").trim();

  if (name.length < 2) {
    return ok({ available: false, reason: "too_short" });
  }
  if (name.length > 24) {
    return ok({ available: false, reason: "too_long" });
  }
  if (!/^[\p{L}\p{N} _.-]+$/u.test(name)) {
    return ok({ available: false, reason: "invalid_chars" });
  }

  const result = await checkDisplayNameAvailable(name);
  return ok(result);
});
