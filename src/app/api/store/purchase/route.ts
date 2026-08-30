import { NextRequest } from "next/server";
import { enforceRateLimit, ok, route } from "@/server/http";
import { itemIdSchema } from "@/server/validation";
import { requireUser } from "@/server/session";
import { purchaseItem } from "@/server/services/store-service";

/**
 * POST /api/store/purchase
 *
 * Server-authoritative purchase pipeline (spec §53/§97).
 * The client sends only an itemId; the server looks up the price,
 * validates balance, and executes the purchase atomically.
 */
export const POST = route(async (req: NextRequest) => {
  enforceRateLimit(req, "purchase", 30, 60 * 1000);
  const user = await requireUser();
  const { itemId } = itemIdSchema.parse(await req.json());
  const result = await purchaseItem(user.id, itemId);
  return ok(result);
});
