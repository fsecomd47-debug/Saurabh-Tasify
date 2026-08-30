import { NextRequest } from "next/server";
import { ok, route } from "@/server/http";
import { requireUser } from "@/server/session";
import { listFriends } from "@/server/services/friendship-service";

export const GET = route(async () => {
  const user = await requireUser();
  const friends = await listFriends(user.id);
  return ok({ friends });
});
