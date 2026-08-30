import { NextRequest } from "next/server";
import { enforceRateLimit, ok, route } from "@/server/http";
import { equipSchema } from "@/server/validation";
import { requireUser } from "@/server/session";
import { setEquipped } from "@/server/services/store-service";

export const POST = route(async (req: NextRequest) => {
  enforceRateLimit(req, "equip", 40, 60 * 1000);
  const user = await requireUser();
  const body = equipSchema.parse(await req.json());
  return ok(await setEquipped(user.id, body.itemId, body.equipped));
});
