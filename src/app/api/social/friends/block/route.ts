import { NextRequest } from "next/server";
import { ok, route, fail } from "@/server/http";
import { requireUser } from "@/server/session";
import { blockUser, unblockUser } from "@/server/services/friendship-service";
import { z } from "zod";

const schema = z.object({
  targetId: z.string().uuid(),
  action: z.enum(["block", "unblock"]),
});

export const POST = route(async (req: NextRequest) => {
  const user = await requireUser();
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0].message);

  if (parsed.data.action === "block") {
    await blockUser(user.id, parsed.data.targetId);
  } else {
    await unblockUser(user.id, parsed.data.targetId);
  }

  return ok({ updated: true });
});
