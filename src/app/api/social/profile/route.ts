import { NextRequest } from "next/server";
import { ok, fail, route } from "@/server/http";
import { requireUser } from "@/server/session";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

const VISIBILITY_OPTIONS = ["public", "friends", "private"] as const;
const MESSAGE_OPTIONS = ["everyone", "friends", "nobody"] as const;

export const PATCH = route(async (req: NextRequest) => {
  const user = await requireUser();
  const body = await req.json();
  const { profileVisibility, activityVisibility, allowFriendRequests, allowMessages, allowChallenges } = body as {
    profileVisibility?: string;
    activityVisibility?: string;
    allowFriendRequests?: boolean;
    allowMessages?: string;
    allowChallenges?: string;
  };

  const updates: Record<string, unknown> = {};

  if (profileVisibility !== undefined) {
    if (!VISIBILITY_OPTIONS.includes(profileVisibility as any)) {
      return fail("VALIDATION_ERROR", "Invalid profileVisibility");
    }
    updates.profileVisibility = profileVisibility;
  }

  if (activityVisibility !== undefined) {
    if (!VISIBILITY_OPTIONS.includes(activityVisibility as any)) {
      return fail("VALIDATION_ERROR", "Invalid activityVisibility");
    }
    updates.activityVisibility = activityVisibility;
  }

  if (allowFriendRequests !== undefined) {
    updates.allowFriendRequests = allowFriendRequests;
  }

  if (allowMessages !== undefined) {
    if (!MESSAGE_OPTIONS.includes(allowMessages as any)) {
      return fail("VALIDATION_ERROR", "Invalid allowMessages");
    }
    updates.allowMessages = allowMessages;
  }

  if (allowChallenges !== undefined) {
    if (!MESSAGE_OPTIONS.includes(allowChallenges as any)) {
      return fail("VALIDATION_ERROR", "Invalid allowChallenges");
    }
    updates.allowChallenges = allowChallenges;
  }

  if (Object.keys(updates).length === 0) {
    return fail("VALIDATION_ERROR", "No valid fields to update");
  }

  updates.updatedAt = new Date();

  await db.update(profiles).set(updates).where(eq(profiles.userId, user.id));

  return ok({ updated: true });
});
