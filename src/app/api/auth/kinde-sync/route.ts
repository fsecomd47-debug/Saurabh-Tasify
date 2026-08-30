import { NextRequest } from "next/server";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { users, profiles } from "@/db/schema";
import { ok, fail, route, enforceRateLimit } from "@/server/http";
import { completeOnboarding } from "@/server/services/onboarding-service";
import { checkDisplayNameAvailable } from "@/server/services/username-service";
import { auth } from "@/lib/auth/server";

const ALLOWED_AVATARS = [
  "avatar-wolf", "avatar-fox", "avatar-lion", "avatar-bear",
  "avatar-eagle", "avatar-snake", "avatar-shark", "avatar-owl",
];

const kindeSyncSchema = z.object({
  displayName: z.string().min(1).max(24).optional(),
  avatarId: z.string().max(40).optional(),
});

export const POST = route(async (req: NextRequest) => {
  // Rate limit: 10 requests per 5 minutes per IP
  enforceRateLimit(req, "kinde-sync", 10, 5 * 60 * 1000);

  // Get Neon Auth session
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return ok({ userId: null, error: "not_authenticated" });
  }

  const body = await req.json();
  const input = kindeSyncSchema.parse(body);

  const neonUserId = session.user.id;
  const email = session.user.email ?? "";

  const normalizedEmail = email.trim().toLowerCase();
  const name = (input.displayName || session.user.name || "Player").trim().slice(0, 24);
  const avatar = (input.avatarId && ALLOWED_AVATARS.includes(input.avatarId))
    ? input.avatarId
    : "avatar-wolf";

  // Check if user exists by email
  const existing = await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${normalizedEmail}`).limit(1);

  let userId: string;

  if (existing[0]) {
    // User exists — update profile
    userId = existing[0].id;

    // Check display name uniqueness (exclude self)
    const nameCheck = await checkDisplayNameAvailable(name, userId);
    if (!nameCheck.available) {
      return fail("DISPLAY_NAME_TAKEN", `The name "${name}" is already taken. Try a different one.`);
    }

    await db.update(profiles).set({ displayName: name, avatarId: avatar, updatedAt: new Date() }).where(sql`${profiles.userId} = ${userId}`);
  } else {
    // Check display name uniqueness for new account
    const nameCheck = await checkDisplayNameAvailable(name);
    if (!nameCheck.available) {
      return fail("DISPLAY_NAME_TAKEN", `The name "${name}" is already taken. Try a different one.`);
    }

    // New user — create with Neon Auth ID as password hash placeholder
    // Use transaction to prevent race condition on concurrent OAuth callbacks
    userId = await db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({
        email: normalizedEmail,
        passwordHash: `neon-auth:${neonUserId}`,
      }).returning({ id: users.id });

      await tx.insert(profiles).values({ userId: user.id, displayName: name, avatarId: avatar });
      return user.id;
    });
  }

  // Idempotent onboarding completion — safe to call even if user already initialized
  try {
    await completeOnboarding(userId, normalizedEmail, {
      displayName: name,
      avatarId: avatar,
      preferredCategories: ["personal"],
      dailyCommitmentMinutes: 20,
      primaryGoal: "Build a productive habit",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      playstyle: "balanced",
    });
  } catch {
    // Onboarding may already be complete — this is fine
  }

  return ok({ userId });
});
