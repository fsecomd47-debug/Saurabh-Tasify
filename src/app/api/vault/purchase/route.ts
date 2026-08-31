/**
 * PDR-6 Feature-1: THE VAULT — Purchase API
 * POST /api/vault/purchase - Purchase an item
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/session";
import { route, fail, ok } from "@/server/http";
import { getVaultPurchaseService } from "@/server/services/vault-purchase";
import { getVaultCollectionsService } from "@/server/services/vault-collections";
import { getVaultCatalog } from "@/server/services/vault-catalog";
import { db } from "@/db";
import { vaultOwnership, vaultGoals } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const POST = route(async (request: NextRequest) => {
  const user = await requireUser();
  const userId = user.id;

  const body = await request.json();
  const { itemId, operationKey } = body;

  if (!itemId || !operationKey) {
    return fail("VALIDATION_ERROR", "Missing itemId or operationKey");
  }

  const purchaseService = getVaultPurchaseService();
  const collectionsService = getVaultCollectionsService();
  const catalog = getVaultCatalog();

  const item = catalog.getItem(itemId);
  if (!item) {
    return fail("NOT_FOUND", "Item not found");
  }

  if (item.status !== "active") {
    return fail("VALIDATION_ERROR", "Item is not available for purchase");
  }

  if (item.price <= 0) {
    return fail("VALIDATION_ERROR", "This item cannot be purchased");
  }

  // Process purchase
  const result = await purchaseService.purchase(userId, itemId, operationKey);

  // Check for collection completion
  const completedCollections = await collectionsService.checkCollectionCompletion(
    userId,
    itemId
  );

  // Grant collection completion rewards
  const grantedRewards: Array<{ collectionId: string; collectionName: string; rewardItemId: string }> = [];

  for (const col of completedCollections) {
    if (!col.completionReward) continue;

    // Extract the reward item ID from the completion reward object
    const rewardItemId = col.completionReward.badgeId || col.completionReward.titleId || col.completionReward.frameId;
    if (!rewardItemId) continue;

    const existingReward = await db
      .select()
      .from(vaultOwnership)
      .where(
        and(
          eq(vaultOwnership.userId, userId),
          eq(vaultOwnership.itemId, rewardItemId)
        )
      )
      .limit(1);

    if (existingReward.length === 0) {
      // Award the completion reward item
      try {
        await db.insert(vaultOwnership).values({
          userId,
          itemId: rewardItemId,
          equipped: false,
          favorite: false,
        });

        grantedRewards.push({
          collectionId: col.id,
          collectionName: col.name,
          rewardItemId,
        });
      } catch {
        // Reward already granted or item doesn't exist — non-fatal
      }
    }
  }

  // Clear goal if the purchased item was the user's goal
  await db.delete(vaultGoals).where(
    and(eq(vaultGoals.userId, userId), eq(vaultGoals.itemId, itemId))
  );

  return ok({
    purchase: result.purchase,
    newBalance: result.newBalance,
    completedCollections: completedCollections.map((col) => ({
      id: col.id,
      name: col.name,
      completionReward: col.completionReward,
    })),
    grantedRewards,
  });
});
