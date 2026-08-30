import { NextRequest } from "next/server";
import { ok, route } from "@/server/http";
import { destroyCurrentSession, clearSessionCookie } from "@/server/session";

export const POST = route(async (_req: NextRequest) => {
  await destroyCurrentSession();
  const res = ok({ loggedOut: true });
  return clearSessionCookie(res);
});
