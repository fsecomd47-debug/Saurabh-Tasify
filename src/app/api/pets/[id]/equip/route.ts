import { NextRequest } from "next/server";
import { route, ok, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { equipPet } from "@/server/services/pet-service";

export const POST = route(async (req: NextRequest, { params }: { params: { id: string } }) => {
  enforceRateLimit(req, "pet-equip", 20, 60_000);
  const user = await requireUser();
  const result = await equipPet(user.id, params.id);
  return ok(result);
});
