import { NextRequest } from "next/server";
import { route, ok, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { getActivePet } from "@/server/services/pet-service";

export const GET = route(async (req: NextRequest) => {
  enforceRateLimit(req, "me-pets-active", 60, 60_000);
  const user = await requireUser();
  const pet = await getActivePet(user.id);
  return ok(pet);
});
