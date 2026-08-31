/**
 * PDR-6 Feature-1: THE VAULT — Ability Service
 * Server-authoritative item effect calculation.
 *
 * Rules:
 * - Abilities must be understandable (§50)
 * - No infinite multiplier stacking (§51)
 * - Stacking policy: stackingGroup + maxGroupBonus (§52)
 * - Server calculates final effect (§179)
 * - No client multiplier (§180)
 */

import { db } from "../../db";
import { vaultOwnership, vaultEquipment, vaultItems } from "../../db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getVaultCatalog } from "./vault-catalog";
import type { ItemAbility, AbilityType, VaultItemType } from "../../types/vault";

// ============================================================================
// Ability Types
// ============================================================================

export type ActiveEffect = {
  abilityType: AbilityType;
  value: number;
  source: string;
  stackingGroup: string;
};

export type ModifierResult = {
  missionXp: number;
  questXp: number;
  petXp: number;
  stBonus: number;
  streakSupport: boolean;
  cooldownReduction: number;
  collectionBonus: number;
};

// ============================================================================
// Ability Service
// ============================================================================

export class VaultAbilityService {
  /**
   * Get all active effects for a user.
   * Considers: equipped items + owned boosts.
   */
  async getActiveEffects(userId: string): Promise<ActiveEffect[]> {
    const catalog = getVaultCatalog();
    const effects: ActiveEffect[] = [];

    // Get equipped items
    const equipment = await db
      .select()
      .from(vaultEquipment)
      .where(eq(vaultEquipment.userId, userId))
      .limit(1);

    if (equipment.length > 0) {
      const equip = equipment[0];
      const equippedItemIds = [
        equip.activePet,
        equip.activeVehicle,
        equip.profileFrame,
        equip.profileTitle,
        equip.profileBadge,
        equip.theme,
      ].filter(Boolean) as string[];

      if (equippedItemIds.length > 0) {
        // Get item details
        const items = equippedItemIds
          .map((id) => catalog.getItem(id))
          .filter(Boolean);

        for (const item of items) {
          if (item?.abilities) {
            for (const ability of item.abilities) {
              effects.push({
                abilityType: ability.type as AbilityType,
                value: ability.value,
                source: item.name,
                stackingGroup: ability.stackingGroup,
              });
            }
          }
        }
      }
    }

    // Get active boosts (owned boost items)
    // Query vault_items to find all boost-type items, then check ownership
    const boostItems = await db
      .select({ id: vaultItems.id })
      .from(vaultItems)
      .where(eq(vaultItems.type, "boost"));

    const boostItemIds = boostItems.map((b) => b.id);

    if (boostItemIds.length > 0) {
      const ownedBoosts = await db
        .select({ itemId: vaultOwnership.itemId })
        .from(vaultOwnership)
        .where(
          and(
            eq(vaultOwnership.userId, userId),
            inArray(vaultOwnership.itemId, boostItemIds)
          )
        );

      for (const owned of ownedBoosts) {
        const item = catalog.getItem(owned.itemId);
        if (item?.abilities) {
          for (const ability of item.abilities) {
            effects.push({
              abilityType: ability.type as AbilityType,
              value: ability.value,
              source: item.name,
              stackingGroup: ability.stackingGroup,
            });
          }
        }
      }
    }

    return effects;
  }

  /**
   * Calculate final modifier for a mission.
   */
  async calculateMissionModifier(
    userId: string,
    context: { missionType: string; difficulty: string }
  ): Promise<ModifierResult> {
    const effects = await this.getActiveEffects(userId);

    // Group effects by stacking group
    const grouped = new Map<string, ActiveEffect[]>();
    for (const effect of effects) {
      const existing = grouped.get(effect.stackingGroup) || [];
      existing.push(effect);
      grouped.set(effect.stackingGroup, existing);
    }

    // Apply stacking rules
    const result: ModifierResult = {
      missionXp: 1.0,
      questXp: 1.0,
      petXp: 1.0,
      stBonus: 1.0,
      streakSupport: false,
      cooldownReduction: 0,
      collectionBonus: 1.0,
    };

    for (const [group, groupEffects] of grouped) {
      // Sort by value descending, take only effects that fit within maxGroupBonus
      const sorted = groupEffects.sort((a, b) => b.value - a.value);
      let totalValue = 0;
      const maxBonus = sorted[0]?.value || 0; // Assume all in group have same max

      for (const effect of sorted) {
        if (totalValue + effect.value <= maxBonus * 2) {
          totalValue += effect.value;
        }
      }

      // Apply to appropriate modifier
      switch (sorted[0]?.abilityType) {
        case "mission_xp":
          result.missionXp += totalValue;
          break;
        case "quest_xp":
          result.questXp += totalValue;
          break;
        case "pet_xp":
          result.petXp += totalValue;
          break;
        case "st_bonus":
          result.stBonus += totalValue;
          break;
        case "streak_support":
          result.streakSupport = true;
          break;
        case "cooldown_reduction":
          result.cooldownReduction += totalValue;
          break;
        case "collection_bonus":
          result.collectionBonus += totalValue;
          break;
      }
    }

    // Cap values to prevent exploits
    result.missionXp = Math.min(result.missionXp, 2.0); // Max 100% bonus
    result.questXp = Math.min(result.questXp, 2.0);
    result.petXp = Math.min(result.petXp, 2.0);
    result.stBonus = Math.min(result.stBonus, 1.5); // Max 50% bonus
    result.cooldownReduction = Math.min(result.cooldownReduction, 0.5); // Max 50% reduction
    result.collectionBonus = Math.min(result.collectionBonus, 1.5);

    return result;
  }

  /**
   * Get ability description for display.
   */
  getAbilityDescription(ability: ItemAbility): string {
    return ability.description;
  }

  /**
   * Check if an ability is functional (affects gameplay) or cosmetic.
   */
  isFunctional(ability: ItemAbility): boolean {
    return ability.value > 0;
  }
}

// Singleton
let abilityServiceInstance: VaultAbilityService | null = null;

export function getVaultAbilityService(): VaultAbilityService {
  if (!abilityServiceInstance) {
    abilityServiceInstance = new VaultAbilityService();
  }
  return abilityServiceInstance;
}
