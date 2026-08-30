import { NextRequest } from "next/server";
import { route, ok, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { settleMissionReward } from "@/server/economy/settlement";
import { enforceMissionExpiry } from "@/server/services/mission-expiration";
import { getSuggestedNextMission } from "@/server/verification/adaptive-difficulty";
import { processQuestEvent } from "@/server/services/quest-service";

export const POST = route(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  enforceRateLimit(req, "mission-claim", 10, 60_000);
  const { id } = await ctx.params;

  // §63: An expired mission can never settle. Sweep first so the
  // settlement status gate sees authoritative state.
  await enforceMissionExpiry();

  // §62: Settlement is idempotent — repeat claims return zeros with
  // alreadySettled=true instead of a second payout.
  const result = await settleMissionReward(id, user.id);

  // §57-58: After successful settlement, provide adaptive difficulty suggestion.
  let suggestedNext = null;
  if (!result.alreadySettled && (result.stGained > 0 || result.xpGained > 0)) {
    try {
      suggestedNext = await getSuggestedNextMission(user.id, id);
    } catch {
      // Non-critical — don't fail the claim if adaptive suggestion fails
    }
  }

  // §PDR-5 Feature-5: Process quest events after settlement
  let questUpdates: { questId: string; progressPct: number; justCompleted: boolean }[] = [];
  if (!result.alreadySettled && (result.stGained > 0 || result.xpGained > 0)) {
    try {
      questUpdates = await processQuestEvent(user.id, "MISSION_COMPLETED", 1, {
        source: "mission",
        stEarned: result.stGained,
        xpEarned: result.xpGained,
      });
      // Also process ST earned event for wealth-based quests
      if (result.stGained > 0) {
        await processQuestEvent(user.id, "ST_EARNED", result.stGained, { source: "mission" });
      }
    } catch {
      // Non-critical — quest processing failure should not block mission reward
    }
  }

  return ok({
    ...result,
    suggestedNext,
    questUpdates,
  });
});
