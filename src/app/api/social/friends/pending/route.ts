import { NextRequest } from "next/server";
import { ok, route } from "@/server/http";
import { requireUser } from "@/server/session";
import { getPendingRequests } from "@/server/services/friendship-service";

export const GET = route(async () => {
  const user = await requireUser();
  const requests = await getPendingRequests(user.id);
  return ok({ requests });
});
