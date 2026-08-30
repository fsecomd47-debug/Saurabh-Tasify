import { NextRequest } from "next/server";
import { route, ok, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { getUserPets } from "@/server/services/pet-service";

export const GET = route(async (req: NextRequest) => {
  enforceRateLimit(req, "me-pets", 60, 60_000);
  const user = await requireUser();
  const pets = await getUserPets(user.id);
  return ok(pets);
});
