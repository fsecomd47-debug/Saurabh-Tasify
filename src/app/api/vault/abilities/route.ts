/**
 * PDR-6 Feature-1: THE VAULT — Abilities API
 * GET /api/vault/abilities - Get user's active modifiers
 */

import { NextRequest } from "next/server";
import { requireUser } from "@/server/session";
import { route, ok } from "@/server/http";
import { getVaultAbilityService } from "@/server/services/vault-ability";

export const GET = route(async (request: NextRequest) => {
  const user = await requireUser();
  const userId = user.id;

  const { searchParams } = new URL(request.url);
  const missionType = searchParams.get("missionType") || "default";
  const difficulty = searchParams.get("difficulty") || "normal";

  const abilityService = getVaultAbilityService();
  const modifiers = await abilityService.calculateMissionModifier(userId, {
    missionType,
    difficulty,
  });

  const effects = await abilityService.getActiveEffects(userId);

  return ok({ modifiers, activeEffects: effects });
});
