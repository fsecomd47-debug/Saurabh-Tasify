import { NextRequest } from "next/server";
import { ok, route } from "@/server/http";
import { requireUser } from "@/server/session";
import { markAsRead } from "@/server/services/social-notification-service";

export const POST = route(async (req: NextRequest) => {
  const user = await requireUser();
  const body = await req.json().catch(() => ({}));
  const notificationId = body?.notificationId as string | undefined;
  await markAsRead(user.id, notificationId);
  return ok({ marked: true });
});
