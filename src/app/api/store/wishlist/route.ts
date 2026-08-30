import { NextRequest } from "next/server";
import { enforceRateLimit, ok, route } from "@/server/http";
import { wishlistSchema } from "@/server/validation";
import { requireUser } from "@/server/session";
import { toggleWishlist } from "@/server/services/store-service";

export const POST = route(async (req: NextRequest) => {
  enforceRateLimit(req, "wishlist", 60, 60 * 1000);
  const user = await requireUser();
  const body = wishlistSchema.parse(await req.json());
  await toggleWishlist(user.id, body.itemId, body.add);
  return ok({ inWishlist: body.add });
});
