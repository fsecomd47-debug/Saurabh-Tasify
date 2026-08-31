/**
 * PDR-6 Feature-1: THE VAULT — Equip Service
 * Server-authoritative equipment management.
 *
 * Rules:
 * - Only owned items can be equipped (§204)
 * - One item per slot (§188)
 * - Server validates ownership (§206)
 */

import { db } from "../../db";
import { vaultOwnership, vaultEquipment } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import type { EquipmentState, EquipSlot } from "../../types/vault";

// ============================================================================
// Equip Service
// ============================================================================

export class VaultEquipService {
  /**
   * Equip an item in a slot (atomic transaction).
   */
  async equip(
    userId: string,
    itemId: string,
    slot: EquipSlot
  ): Promise<EquipmentState> {
    // Verify ownership
    const ownership = await db
      .select()
      .from(vaultOwnership)
      .where(
        and(
          eq(vaultOwnership.userId, userId),
          eq(vaultOwnership.itemId, itemId)
        )
      )
      .limit(1);

    if (ownership.length === 0) {
      throw new Error("Item not owned");
    }

    // Atomic transaction for equip
    await db.transaction(async (tx) => {
      // Get or create equipment record
      let equipment = await tx
        .select()
        .from(vaultEquipment)
        .where(eq(vaultEquipment.userId, userId))
        .limit(1);

      if (equipment.length === 0) {
        await tx.insert(vaultEquipment).values({
          userId,
          [slot]: itemId,
          showcaseItems: [],
        });
      } else {
        // Unequip any currently equipped item in this slot
        const currentEquipped = equipment[0]?.[slot];
        if (currentEquipped && currentEquipped !== itemId) {
          await tx
            .update(vaultOwnership)
            .set({ equipped: false })
            .where(
              and(
                eq(vaultOwnership.userId, userId),
                eq(vaultOwnership.itemId, currentEquipped)
              )
            );
        }

        // Set new item in slot
        await tx
          .update(vaultEquipment)
          .set({
            [slot]: itemId,
            updatedAt: new Date(),
          })
          .where(eq(vaultEquipment.userId, userId));
      }

      // Mark new item as equipped
      await tx
        .update(vaultOwnership)
        .set({ equipped: true })
        .where(
          and(
            eq(vaultOwnership.userId, userId),
            eq(vaultOwnership.itemId, itemId)
          )
        );
    });

    return this.getEquipment(userId);
  }

  /**
   * Unequip an item from a slot (atomic transaction).
   */
  async unequip(userId: string, slot: EquipSlot): Promise<EquipmentState> {
    const equipment = await db
      .select()
      .from(vaultEquipment)
      .where(eq(vaultEquipment.userId, userId))
      .limit(1);

    if (equipment.length === 0) {
      throw new Error("No equipment found");
    }

    const currentItemId = equipment[0]?.[slot];

    await db.transaction(async (tx) => {
      if (currentItemId) {
        // Mark item as unequipped
        await tx
          .update(vaultOwnership)
          .set({ equipped: false })
          .where(
            and(
              eq(vaultOwnership.userId, userId),
              eq(vaultOwnership.itemId, currentItemId)
            )
          );
      }

      // Clear slot
      await tx
        .update(vaultEquipment)
        .set({
          [slot]: null,
          updatedAt: new Date(),
        })
        .where(eq(vaultEquipment.userId, userId));
    });

    return this.getEquipment(userId);
  }

  /**
   * Get user's equipment state.
   */
  async getEquipment(userId: string): Promise<EquipmentState> {
    const result = await db
      .select()
      .from(vaultEquipment)
      .where(eq(vaultEquipment.userId, userId))
      .limit(1);

    if (result.length === 0) {
      return {
        userId,
        showcaseItems: [],
      };
    }

    const row = result[0];
    return {
      userId,
      activePet: row.activePet || undefined,
      activeVehicle: row.activeVehicle || undefined,
      profileFrame: row.profileFrame || undefined,
      profileTitle: row.profileTitle || undefined,
      profileBadge: row.profileBadge || undefined,
      theme: row.theme || undefined,
      showcaseItems: (row.showcaseItems as string[]) || [],
    };
  }

  /**
   * Set showcase items (max 3).
   */
  async setShowcase(
    userId: string,
    itemIds: string[]
  ): Promise<EquipmentState> {
    // Verify ownership of all items
    for (const itemId of itemIds) {
      const owns = await this.ownsItem(userId, itemId);
      if (!owns) {
        throw new Error(`Item ${itemId} not owned`);
      }
    }

    // Limit to 3 items
    const showcase = itemIds.slice(0, 3);

    // Update or create equipment record
    const existing = await db
      .select()
      .from(vaultEquipment)
      .where(eq(vaultEquipment.userId, userId))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(vaultEquipment).values({
        userId,
        showcaseItems: showcase,
      });
    } else {
      await db
        .update(vaultEquipment)
        .set({
          showcaseItems: showcase,
          updatedAt: new Date(),
        })
        .where(eq(vaultEquipment.userId, userId));
    }

    return this.getEquipment(userId);
  }

  /**
   * Check if user owns an item.
   */
  private async ownsItem(userId: string, itemId: string): Promise<boolean> {
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
}

// Singleton
let equipServiceInstance: VaultEquipService | null = null;

export function getVaultEquipService(): VaultEquipService {
  if (!equipServiceInstance) {
    equipServiceInstance = new VaultEquipService();
  }
  return equipServiceInstance;
}
