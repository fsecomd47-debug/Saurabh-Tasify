import { NextRequest } from "next/server";
import { ok, route, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { getNotifications } from "@/server/services/social-notification-service";

export const GET = route(async (req: NextRequest) => {
  enforceRateLimit(req, "social-notifications", 30, 60 * 1000);
  const user = await requireUser();
  const notifications = await getNotifications(user.id);
  return ok({ notifications });
});
