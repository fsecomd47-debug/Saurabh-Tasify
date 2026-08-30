/**
 * PDR-4.4: Compound Mission Chain API Route
 * Create and manage multi-step mission chains.
 */

import { NextRequest } from "next/server";
import { ok, route, enforceRateLimit } from "@/server/http";
import { requireUser } from "@/server/session";
import { createMissionChain, getChainProgress, advanceChain } from "@/server/verification/mission-chain";
import { AppError } from "@/server/http";

export const POST = route(async (req: NextRequest) => {
  const user = await requireUser();
  enforceRateLimit(req, "chain-create", 5, 60_000);

  const body = await req.json();
  const { taskIds, allStepsRequired } = body as {
    taskIds?: string[];
    allStepsRequired?: boolean;
  };

  if (!taskIds || !Array.isArray(taskIds) || taskIds.length < 2) {
    throw new AppError("VALIDATION_ERROR", "Chain requires at least 2 task IDs.");
  }

  const chain = await createMissionChain({
    userId: user.id,
    taskIds,
    allStepsRequired: allStepsRequired ?? true,
  });

  return ok(chain);
});

export const GET = route(async (req: NextRequest) => {
  const user = await requireUser();

  const url = new URL(req.url);
  const missionId = url.searchParams.get("missionId");

  if (missionId) {
    const progress = await getChainProgress(missionId, user.id);
    return ok(progress);
  }

  // Return all chains for user
  const { getUserChains } = await import("@/server/verification/mission-chain");
  const chains = await getUserChains(user.id);
  return ok(chains);
});
