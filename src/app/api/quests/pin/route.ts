import { NextRequest } from "next/server";
import { AppError, enforceRateLimit, ok, route } from "@/server/http";
import { requireUser } from "@/server/session";
import { z } from "zod";

const pinSchema = z.object({ questId: z.string().min(1).max(120) });

export const POST = route(async (req: NextRequest) => {
  enforceRateLimit(req, "quest-pin", 20, 60 * 1000);
  const user = await requireUser();
  const { questId } = pinSchema.parse(await req.json());

  // Pin state is stored client-side for now (localStorage).
  // Server validates the quest exists and belongs to the user.
  // Future: store in DB for cross-device sync.

  return ok({ questId, pinned: true });
});
