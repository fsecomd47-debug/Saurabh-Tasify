import { NextRequest } from "next/server";
import { route, ok, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { getPetCatalog } from "@/server/services/pet-service";

export const GET = route(async (req: NextRequest) => {
  enforceRateLimit(req, "pets-catalog", 60, 60_000);
  const user = await requireUser();
  const catalog = await getPetCatalog(user.id);
  return ok(catalog);
});
