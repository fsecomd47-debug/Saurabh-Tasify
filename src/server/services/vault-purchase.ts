/**
 * PDR-6 Feature-1: THE VAULT — Purchase Service
 * Server-authoritative purchase with atomic transactions.
 *
 * Flow:
 * validate → debit wallet → create ownership → record transaction
 *
 * Rules:
 * - Server loads authoritative price (§199)
 * - Atomic transaction (§260)
 * - Idempotent purchases (§96, §196)
 * - No partial purchase state (§259)
 */

import { db } from "../../db";
import {
  vaultOwnership,
  vaultTransactions,
  walletTransactions,
  wallets,
} from "../../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getVaultCatalog } from "./vault-catalog";
import type { VaultPurchase, ItemOwnership } from "../../types/vault";

// ============================================================================
// Purchase Service
// ============================================================================

export class VaultPurchaseService {
  /**
   * Purchase an item atomically.
   * Returns the purchase record and new balance.
   */
  async purchase(
    userId: string,
    itemId: string,
    operationKey: string
  ): Promise<{ purchase: VaultPurchase; newBalance: number }> {
    const catalog = getVaultCatalog();
    const item = catalog.getItem(itemId);

    if (!item) {
      throw new Error("Item not found");
    }

    if (item.status !== "active") {
      throw new Error("Item is not available");
    }

    if (item.price === 0) {
      throw new Error("Item cannot be purchased");
    }

    // Check idempotency
    const existingPurchase = await db
      .select()
      .from(vaultTransactions)
      .where(eq(vaultTransactions.operationKey, operationKey))
      .limit(1);

    if (existingPurchase.length > 0) {
      // Already processed
      const wallet = await this.getWallet(userId);
      return { purchase: existingPurchase[0] as VaultPurchase, newBalance: wallet };
    }

    // Check if already owned (non-stackable)
    if (!this.isStackable(item.type)) {
      const existingOwnership = await db
        .select()
        .from(vaultOwnership)
        .where(
          and(
            eq(vaultOwnership.userId, userId),
            eq(vaultOwnership.itemId, itemId)
          )
        )
        .limit(1);

      if (existingOwnership.length > 0) {
        throw new Error("Item already owned");
      }
    }

    // Atomic purchase: debit wallet + create ownership + record transaction
    const result = await db.transaction(async (tx) => {
      // Get wallet
      const walletResult = await tx
        .select()
        .from(wallets)
        .where(eq(wallets.userId, userId))
        .limit(1);

      if (walletResult.length === 0) {
        throw new Error("Wallet not found");
      }

      const wallet = walletResult[0];
      const currentBalance = wallet.balance;

      if (currentBalance < item.price) {
        throw new Error("Insufficient balance");
      }

      // Debit wallet
      await tx
        .update(wallets)
        .set({
          balance: currentBalance - item.price,
          lifetimeSpent: wallet.lifetimeSpent + item.price,
        })
        .where(eq(wallets.userId, userId));

      // Record wallet transaction
      await tx.insert(walletTransactions).values({
        walletId: wallet.id,
        type: "spending",
        amount: item.price,
        title: `Vault purchase: ${item.name}`,
        context: "vault_purchase",
        referenceType: "vault_item",
        referenceId: itemId,
        idempotencyKey: operationKey,
        metadata: { itemId, operationKey },
      });

      // Create ownership
      const ownershipResult = await tx
        .insert(vaultOwnership)
        .values({
          userId,
          itemId,
          quantity: 1,
          equipped: false,
          favorite: false,
          showcased: false,
        })
        .returning();

      // Record vault transaction
      const transactionResult = await tx
        .insert(vaultTransactions)
        .values({
          userId,
          itemId,
          price: item.price,
          operationKey,
        })
        .returning();

      return {
        ownership: ownershipResult[0],
        transaction: transactionResult[0],
        newBalance: currentBalance - item.price,
      };
    });

    return {
      purchase: {
        id: result.transaction.id,
        userId,
        itemId,
        price: item.price,
        purchasedAt: result.transaction.purchasedAt,
        transactionId: result.transaction.id,
        operationKey,
      },
      newBalance: result.newBalance,
    };
  }

  /**
   * Check if a user owns an item.
   */
  async ownsItem(userId: string, itemId: string): Promise<boolean> {
    const result = await db
      .select()
      .from(vaultOwnership)
      .where(
        and(
          eq(vaultOwnership.userId, userId),
          eq(vaultOwnership.itemId, itemId)
        )
      )
      .limit(1);

    return result.length > 0;
  }

  /**
   * Get user's inventory.
   */
  async getInventory(userId: string): Promise<ItemOwnership[]> {
    const result = await db
      .select()
      .from(vaultOwnership)
      .where(eq(vaultOwnership.userId, userId));

    return result.map((row) => ({
      userId: row.userId,
      itemId: row.itemId,
      acquiredAt: row.acquiredAt,
      quantity: row.quantity,
      equipped: row.equipped,
      favorite: row.favorite,
      showcased: row.showcased,
    }));
  }

  /**
   * Get user's wallet balance.
   */
  async getWallet(userId: string): Promise<number> {
    const result = await db
      .select({ balance: wallets.balance })
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);

    return result.length > 0 ? result[0].balance : 0;
  }

  /**
   * Check if item type is stackable.
   */
  private isStackable(type: string): boolean {
    return type === "boost";
  }
}

// Singleton
let purchaseServiceInstance: VaultPurchaseService | null = null;

export function getVaultPurchaseService(): VaultPurchaseService {
  if (!purchaseServiceInstance) {
    purchaseServiceInstance = new VaultPurchaseService();
  }
  return purchaseServiceInstance;
}
