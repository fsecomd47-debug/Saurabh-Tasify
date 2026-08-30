import { NextRequest } from "next/server";
import { ok, route, fail } from "@/server/http";
import { requireUser } from "@/server/session";
import { acceptFriendRequest } from "@/server/services/friendship-service";
import { notifyFriendAccepted } from "@/server/services/social-notification-service";
import { z } from "zod";

const schema = z.object({
  requestId: z.string().uuid(),
});

export const POST = route(async (req: NextRequest) => {
  const user = await requireUser();
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0].message);

  await acceptFriendRequest(user.id, parsed.data.requestId);

  // Notify the requester
  const { friendships, profiles } = await import("@/db/schema");
  const { db } = await import("@/db");
  const { eq } = await import("drizzle-orm");

  const friendship = await db
    .select({ requesterId: friendships.requesterId })
    .from(friendships)
    .where(eq(friendships.id, parsed.data.requestId))
    .limit(1);

  if (friendship[0]) {
    const profile = await db
      .select({ displayName: profiles.displayName })
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1);
    if (profile[0]) {
      await notifyFriendAccepted(friendship[0].requesterId, profile[0].displayName);
    }
  }

  return ok({ accepted: true });
});
