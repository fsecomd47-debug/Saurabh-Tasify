/**
 * PDR-6 Feature-1: THE VAULT — Showcase API
 * GET    /api/vault/showcase - Get showcase items
 * POST   /api/vault/showcase - Set showcase items (max 3)
 */

import { NextRequest } from "next/server";
import { requireUser } from "@/server/session";
import { route, fail, ok } from "@/server/http";
import { getVaultEquipService } from "@/server/services/vault-equip";
import { getVaultCatalog } from "@/server/services/vault-catalog";

export const GET = route(async (request: NextRequest) => {
  const user = await requireUser();
  const userId = user.id;

  const equipService = getVaultEquipService();
  const equipment = await equipService.getEquipment(userId);

  const catalog = getVaultCatalog();
  const showcaseItems = equipment.showcaseItems
    .map((id) => catalog.getItem(id))
    .filter(Boolean);

  return ok({ showcaseItems, showcaseIds: equipment.showcaseItems });
});

export const POST = route(async (request: NextRequest) => {
  const user = await requireUser();
  const userId = user.id;

  const body = await request.json();
  const { itemIds } = body;

  if (!Array.isArray(itemIds)) {
    return fail("VALIDATION_ERROR", "itemIds must be an array");
  }

  if (itemIds.length > 3) {
    return fail("VALIDATION_ERROR", "Maximum 3 showcase items allowed");
  }

  const equipService = getVaultEquipService();

  try {
    const equipment = await equipService.setShowcase(userId, itemIds);
    return ok({ equipment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to set showcase";
    return fail("VALIDATION_ERROR", message);
  }
});
