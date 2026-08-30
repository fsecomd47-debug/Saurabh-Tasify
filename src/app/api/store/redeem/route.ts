import { NextRequest } from "next/server";
import { enforceRateLimit, ok, route } from "@/server/http";
import { itemIdSchema } from "@/server/validation";
import { requireUser } from "@/server/session";
import { redeemConsumable } from "@/server/services/store-service";

export const POST = route(async (req: NextRequest) => {
  enforceRateLimit(req, "redeem", 20, 60 * 1000);
  const user = await requireUser();
  const { itemId } = itemIdSchema.parse(await req.json());
  await redeemConsumable(user.id, itemId);
  return ok({ redeemed: true });
});
