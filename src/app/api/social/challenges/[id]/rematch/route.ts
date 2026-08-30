import { NextRequest } from "next/server";
import { ok, route } from "@/server/http";
import { requireUser } from "@/server/session";
import { rematchChallenge } from "@/server/services/challenge-service";
import { processGameEvent } from "@/server/services/social-event-bus";

export const POST = route(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;

  const challenge = await rematchChallenge(id, user.id);

  try {
    await processGameEvent({
      userId: user.id,
      type: "CHALLENGE_ACCEPTED",
      metadata: { challengeId: challenge.id },
    });
  } catch {
    // fire-and-forget
  }

  return ok({ challenge });
});
