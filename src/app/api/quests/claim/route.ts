import { NextRequest } from "next/server";
import { AppError, enforceRateLimit, ok, route } from "@/server/http";
import { questClaimSchema } from "@/server/validation";
import { requireUser } from "@/server/session";
import { claimQuestReward } from "@/server/services/quest-service";

export const POST = route(async (req: NextRequest) => {
  enforceRateLimit(req, "quest-claim", 20, 60 * 1000);
  const user = await requireUser();
  const { questId } = questClaimSchema.parse(await req.json());
  try {
    const reward = await claimQuestReward(user.id, questId);
    return ok(reward);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "ALREADY_CLAIMED") throw new AppError("QUEST_ALREADY_CLAIMED", "This quest reward is already in your vault.");
    if (msg === "NOT_COMPLETED") throw new AppError("QUEST_NOT_COMPLETED", "Finish every objective first.");
    if (msg === "Quest not found" || msg === "Unknown quest") throw new AppError("QUEST_NOT_FOUND", "Unknown quest.");
    throw err;
  }
});
