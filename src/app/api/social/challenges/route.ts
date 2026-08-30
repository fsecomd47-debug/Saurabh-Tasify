import { NextRequest } from "next/server";
import { ok, route, fail, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { createChallenge, listChallenges } from "@/server/services/challenge-service";
import { notifyChallengeInvitation } from "@/server/services/social-notification-service";
import { z } from "zod";

const createSchema = z.object({
  inviteeId: z.string().uuid(),
  metric: z.enum(["verified_st", "missions", "focus_minutes", "fitness_missions"]).optional(),
  title: z.string().max(60).optional(),
});

export const GET = route(async (req: NextRequest) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const challenges = await listChallenges(user.id, status ?? undefined);
  return ok({ challenges });
});

export const POST = route(async (req: NextRequest) => {
  enforceRateLimit(req, "challenge-create", 10, 60 * 60 * 1000);
  const user = await requireUser();
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0].message);

  const challenge = await createChallenge(
    user.id,
    parsed.data.inviteeId,
    parsed.data.metric ?? "verified_st",
    parsed.data.title
  );

  // Notify invitee
  const { profiles } = await import("@/db/schema");
  const { db } = await import("@/db");
  const { eq } = await import("drizzle-orm");
  const profile = await db
    .select({ displayName: profiles.displayName })
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);

  if (profile[0]) {
    await notifyChallengeInvitation(
      parsed.data.inviteeId,
      profile[0].displayName,
      challenge.title,
      challenge.id
    );
  }

  return ok({ challenge });
});
