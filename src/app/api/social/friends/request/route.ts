import { NextRequest } from "next/server";
import { ok, route, fail, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { sendFriendRequest } from "@/server/services/friendship-service";
import { notifyFriendRequest } from "@/server/services/social-notification-service";
import { z } from "zod";

const schema = z.object({
  targetId: z.string().uuid(),
});

export const POST = route(async (req: NextRequest) => {
  enforceRateLimit(req, "friend-request", 20, 60 * 60 * 1000);
  const user = await requireUser();
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0].message);

  await sendFriendRequest(user.id, parsed.data.targetId);

  // Notify the target user
  const { profiles } = await import("@/db/schema");
  const { db } = await import("@/db");
  const { eq } = await import("drizzle-orm");
  const profile = await db
    .select({ displayName: profiles.displayName })
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);

  if (profile[0]) {
    await notifyFriendRequest(parsed.data.targetId, profile[0].displayName);
  }

  return ok({ sent: true });
});
