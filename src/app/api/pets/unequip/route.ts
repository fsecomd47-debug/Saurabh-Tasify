import { NextRequest } from "next/server";
import { route, ok, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { unequipPet } from "@/server/services/pet-service";

export const POST = route(async (req: NextRequest) => {
  enforceRateLimit(req, "pet-unequip", 20, 60_000);
  const user = await requireUser();
  const result = await unequipPet(user.id);
  return ok(result);
});
