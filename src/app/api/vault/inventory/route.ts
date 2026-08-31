/**
 * PDR-6 Feature-1: THE VAULT — Inventory API
 * GET /api/vault/inventory - Get user's inventory
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/session";
import { route, ok } from "@/server/http";
import { getVaultPurchaseService } from "@/server/services/vault-purchase";
import { getVaultEquipService } from "@/server/services/vault-equip";
import { getVaultCollectionsService } from "@/server/services/vault-collections";
import { db } from "@/db";
import { vaultWishlist, vaultOwnership, vaultGoals } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const GET = route(async (request: NextRequest) => {
  const user = await requireUser();
  const userId = user.id;

  const purchaseService = getVaultPurchaseService();
  const equipService = getVaultEquipService();
  const collectionsService = getVaultCollectionsService();

  // Get inventory, equipment, and collection stats
  const [inventory, equipment, collectionStats] = await Promise.all([
    purchaseService.getInventory(userId),
    equipService.getEquipment(userId),
    collectionsService.getCollectionStats(userId),
  ]);

  // Get wallet balance
  const balance = await purchaseService.getWallet(userId);

  // Get wishlist
  const wishlist = await db
    .select()
    .from(vaultWishlist)
    .where(eq(vaultWishlist.userId, userId));

  // Get favorites
  const favorites = await db
    .select()
    .from(vaultOwnership)
    .where(
      and(
        eq(vaultOwnership.userId, userId),
        eq(vaultOwnership.favorite, true)
      )
    );

  // Get goal
  const goal = await db
    .select()
    .from(vaultGoals)
    .where(eq(vaultGoals.userId, userId))
    .limit(1);

  return ok({
    inventory,
    equipment,
    balance,
    collectionStats,
    totalOwned: inventory.length,
    wishlist: wishlist.map((w) => w.itemId),
    favorites: favorites.map((f) => f.itemId),
    goal: goal.length > 0 ? { itemId: goal[0].itemId, setAt: goal[0].setAt } : null,
  });
});
