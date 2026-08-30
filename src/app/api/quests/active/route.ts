import { NextRequest } from "next/server";
import { ok, route } from "@/server/http";
import { requireUser } from "@/server/session";
import { getActiveQuestForHome } from "@/server/services/quest-service";

export const GET = route(async (_req: NextRequest) => {
  const user = await requireUser();
  const quest = await getActiveQuestForHome(user.id);
  return ok(quest);
});
