import { NextRequest } from "next/server";
import { route, ok, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { getMiningStatus } from "@/server/services/pet-service";

export const GET = route(async (req: NextRequest) => {
  enforceRateLimit(req, "me-pets-mining", 60, 60_000);
  const user = await requireUser();
  const status = await getMiningStatus(user.id);
  return ok(status);
});
