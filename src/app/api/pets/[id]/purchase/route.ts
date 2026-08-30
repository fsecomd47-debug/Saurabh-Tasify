import { NextRequest } from "next/server";
import { route, ok, fail, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { purchasePet } from "@/server/services/pet-service";
import { z } from "zod";

const purchaseSchema = z.object({ petId: z.string().min(1).max(60) });

export const POST = route(async (req: NextRequest) => {
  enforceRateLimit(req, "pet-purchase", 10, 60_000);
  const user = await requireUser();
  const { petId } = purchaseSchema.parse(await req.json());
  const result = await purchasePet(user.id, petId);
  return ok(result);
});
