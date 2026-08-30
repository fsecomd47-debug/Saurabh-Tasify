import { NextRequest } from "next/server";
import { ok, route } from "@/server/http";
import { getSession } from "@/server/session";

export const GET = route(async (_req: NextRequest) => {
  const user = await getSession();
  if (!user) return ok(null);
  return ok({ user });
});
