import { NextRequest } from "next/server";
import { route, ok, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { getProfileView } from "@/server/services/profile-service";

export const GET = route(async (req: NextRequest) => {
  enforceRateLimit(req, "profile-me", 30, 60_000);
  const user = await requireUser();
  const profile = await getProfileView(user.id);
  return ok(profile);
});
