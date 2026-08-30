import { NextRequest } from "next/server";
import { enforceRateLimit, ok, route } from "@/server/http";
import { goalSchema } from "@/server/validation";
import { requireUser } from "@/server/session";
import { setPurchaseGoal } from "@/server/services/store-service";

export const POST = route(async (req: NextRequest) => {
  enforceRateLimit(req, "goal", 20, 60 * 1000);
  const user = await requireUser();
  const { itemId } = goalSchema.parse(await req.json());
  await setPurchaseGoal(user.id, itemId);
  return ok({ goalItemId: itemId });
});
