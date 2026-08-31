/**
 * PDR-6 Feature-1: THE VAULT — Equip API
 * POST /api/vault/equip - Equip an item
 * DELETE /api/vault/equip - Unequip an item
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/session";
import { route, fail, ok } from "@/server/http";
import { getVaultEquipService } from "@/server/services/vault-equip";
import { getVaultCatalog } from "@/server/services/vault-catalog";
import type { EquipSlot, VaultItemType } from "@/types/vault";

const SLOT_ITEM_TYPE_MAP: Record<EquipSlot, VaultItemType[]> = {
  activePet: ["pet"],
  activeVehicle: ["car", "superbike", "vehicle"],
  profileFrame: ["frame"],
  profileTitle: ["title"],
  profileBadge: ["badge"],
  theme: ["theme"],
};

export const POST = route(async (request: NextRequest) => {
  const user = await requireUser();
  const userId = user.id;

  const body = await request.json();
  const { itemId, slot } = body;

  if (!itemId || !slot) {
    return fail("VALIDATION_ERROR", "Missing itemId or slot");
  }

  const validSlots: EquipSlot[] = [
    "activePet",
    "activeVehicle",
    "profileFrame",
    "profileTitle",
    "profileBadge",
    "theme",
  ];

  if (!validSlots.includes(slot)) {
    return fail("VALIDATION_ERROR", "Invalid slot");
  }

  const validSlot = slot as EquipSlot;

  // Validate item type matches slot
  const catalog = getVaultCatalog();
  const item = catalog.getItem(itemId);
  if (!item) {
    return fail("NOT_FOUND", "Item not found");
  }

  const allowedTypes = SLOT_ITEM_TYPE_MAP[validSlot];
  if (!allowedTypes.includes(item.type)) {
    return fail(
      "VALIDATION_ERROR",
      `Cannot equip a ${item.type} item into the ${validSlot} slot`
    );
  }

  const equipService = getVaultEquipService();
  const equipment = await equipService.equip(userId, itemId, validSlot);

  return ok({ equipment });
});

export const DELETE = route(async (request: NextRequest) => {
  const user = await requireUser();
  const userId = user.id;

  const { searchParams } = new URL(request.url);
  const slot = searchParams.get("slot") as EquipSlot;

  if (!slot) {
    return fail("VALIDATION_ERROR", "Missing slot");
  }

  const validSlots: EquipSlot[] = [
    "activePet",
    "activeVehicle",
    "profileFrame",
    "profileTitle",
    "profileBadge",
    "theme",
  ];

  if (!validSlots.includes(slot)) {
    return fail("VALIDATION_ERROR", "Invalid slot");
  }

  const equipService = getVaultEquipService();
  const equipment = await equipService.unequip(userId, slot);

  return ok({ equipment });
});
