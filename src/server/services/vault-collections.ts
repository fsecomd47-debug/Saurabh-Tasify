/**
 * PDR-6 Feature-1: THE VAULT — Collections Service
 * Manages collection progress, completion, and rewards.
 *
 * Rules:
 * - Collection completion derived from actual ownership (§207)
 * - Completion rewards: badge, title, frame (§41)
 * - No duplicate rewards
 */

import { db } from "../../db";
import { vaultOwnership } from "../../db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getVaultCatalog } from "./vault-catalog";
import type { Collection } from "../../types/vault";

// ============================================================================
// Collections Service
// ============================================================================

export class VaultCollectionsService {
  /**
   * Get user's collection progress.
   */
  async getCollectionProgress(
    userId: string
  ): Promise<
    Array<
      Collection & {
        ownedCount: number;
        completed: boolean;
      }
    >
  > {
    const catalog = getVaultCatalog();
    const collections = catalog.getAllCollections();

    // Get user's owned items
    const ownership = await db
      .select({ itemId: vaultOwnership.itemId })
      .from(vaultOwnership)
      .where(eq(vaultOwnership.userId, userId));

    const ownedItemIds = new Set(ownership.map((o) => o.itemId));

    return collections.map((col) => {
      const ownedCount = col.itemIds.filter((id) => ownedItemIds.has(id)).length;
      return {
        ...col,
        ownedCount,
        completed: ownedCount === col.itemIds.length,
      };
    });
  }

  /**
   * Get a specific collection with user progress.
   */
  async getCollection(
    userId: string,
    collectionId: string
  ): Promise<
    | (Collection & {
        ownedCount: number;
        completed: boolean;
        ownedItems: string[];
        missingItems: string[];
      })
    | null
  > {
    const catalog = getVaultCatalog();
    const collection = catalog.getCollection(collectionId);

    if (!collection) {
      return null;
    }

    // Get user's owned items in this collection
    const ownership = await db
      .select({ itemId: vaultOwnership.itemId })
      .from(vaultOwnership)
      .where(
        and(
          eq(vaultOwnership.userId, userId),
          inArray(vaultOwnership.itemId, collection.itemIds)
        )
      );

    const ownedItemIds = new Set(ownership.map((o) => o.itemId));
    const ownedItems = collection.itemIds.filter((id) => ownedItemIds.has(id));
    const missingItems = collection.itemIds.filter(
      (id) => !ownedItemIds.has(id)
    );

    return {
      ...collection,
      ownedCount: ownedItems.length,
      completed: ownedItems.length === collection.itemIds.length,
      ownedItems,
      missingItems,
    };
  }

  /**
   * Check if completing a purchase would complete a collection.
   * Returns completed collections if any.
   */
  async checkCollectionCompletion(
    userId: string,
    purchasedItemId: string
  ): Promise<Collection[]> {
    const catalog = getVaultCatalog();
    const collections = catalog.getAllCollections();

    const completedCollections: Collection[] = [];

    for (const col of collections) {
      if (!col.itemIds.includes(purchasedItemId)) continue;

      // Check if this collection is now complete
      const ownership = await db
        .select({ itemId: vaultOwnership.itemId })
        .from(vaultOwnership)
        .where(
          and(
            eq(vaultOwnership.userId, userId),
            inArray(vaultOwnership.itemId, col.itemIds)
          )
        );

      const ownedCount = ownership.length;
      if (ownedCount === col.itemIds.length) {
        completedCollections.push(col);
      }
    }

    return completedCollections;
  }

  /**
   * Get collection stats for profile.
   */
  async getCollectionStats(
    userId: string
  ): Promise<{
    totalCollections: number;
    completedCollections: number;
    totalItems: number;
    ownedItems: number;
  }> {
    const catalog = getVaultCatalog();
    const collections = catalog.getAllCollections();

    // Get user's owned items
    const ownership = await db
      .select({ itemId: vaultOwnership.itemId })
      .from(vaultOwnership)
      .where(eq(vaultOwnership.userId, userId));

    const ownedItemIds = new Set(ownership.map((o) => o.itemId));

    let completedCollections = 0;
    for (const col of collections) {
      const ownedCount = col.itemIds.filter((id) => ownedItemIds.has(id)).length;
      if (ownedCount === col.itemIds.length) {
        completedCollections++;
      }
    }

    return {
      totalCollections: collections.length,
      completedCollections,
      totalItems: catalog.getCatalog().items.length,
      ownedItems: ownedItemIds.size,
    };
  }
}

// Singleton
let collectionsServiceInstance: VaultCollectionsService | null = null;

export function getVaultCollectionsService(): VaultCollectionsService {
  if (!collectionsServiceInstance) {
    collectionsServiceInstance = new VaultCollectionsService();
  }
  return collectionsServiceInstance;
}
