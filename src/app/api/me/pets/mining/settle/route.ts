import { NextRequest } from "next/server";
import { route, ok, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { settleMining } from "@/server/services/pet-service";

export const POST = route(async (req: NextRequest) => {
  enforceRateLimit(req, "pet-mining-settle", 12, 60_000);
  const user = await requireUser();
  const result = await settleMining(user.id);
  return ok(result);
});
