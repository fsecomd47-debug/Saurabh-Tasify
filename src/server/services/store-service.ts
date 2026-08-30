import "server-only";
import { randomUUID } from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  activeBoosts,
  activityEvents,
  inventory,
  playerProgress,
  profiles,
  questProgress,
  streaks as streaksTable,
  walletTransactions,
  wallets,
  wishlists,
} from "@/db/schema";
import { CATALOG, CATALOG_BY_ID, COLLECTIONS } from "@/lib/catalog/data";
import type { CatalogItem } from "@/lib/catalog/data";
import { AppError, logSecurity } from "@/server/http";

export type CatalogItemDTO = CatalogItem & {
  owned: boolean;
  equipped: boolean;
  inWishlist: boolean;
};

export async function getCatalogForUser(userId: string): Promise<{
  items: CatalogItemDTO[];
  collections: { id: string; ownedCount: number; total: number }[];
}> {
  const [invRows, wlRows] = await Promise.all([
    db.select().from(inventory).where(eq(inventory.userId, userId)),
    db.select().from(wishlists).where(eq(wishlists.userId, userId)),
  ]);
  const ownedIds = new Set(invRows.map((r) => r.itemId));
  const equippedIds = new Set(invRows.filter((r) => r.equipped).map((r) => r.itemId));
  const wishIds = new Set(wlRows.map((r) => r.itemId));

  const items = CATALOG.map((i) => ({
    ...i,
    owned: ownedIds.has(i.id),
    equipped: equippedIds.has(i.id),
    inWishlist: wishIds.has(i.id),
  }));

  const collections = COLLECTIONS.map((c) => ({
    id: c.id,
    ownedCount: c.items.filter((id) => ownedIds.has(id)).length,
    total: c.items.length,
  }));

  return { items, collections };
}

/* ─────────────────────── PURCHASE PIPELINE ────────────────────── */

export type PurchaseResult = {
  itemId: string;
  pricePaid: number;
  balance: number;
  effect?: {
    kind: "boost" | "shield" | "instant" | "mystery" | "redeemable";
    amount?: number;
    expiresAt?: string;
    shieldsAdded?: number;
  };
};

export async function purchaseItem(userId: string, itemId: string, clientKey?: string): Promise<PurchaseResult> {
  // Server looks up the authoritative price — client only sends an id (spec §97).
  const item = CATALOG_BY_ID[itemId];
  if (!item) throw new AppError("ITEM_NOT_FOUND", "This item does not exist.");

  return db.transaction(async (tx) => {
    const [wallet] = await tx.select().from(wallets).where(eq(wallets.userId, userId)).for("update");
    if (!wallet) throw new AppError("INTERNAL", "Wallet missing.");

    const [progress] = await tx.select().from(playerProgress).where(eq(playerProgress.userId, userId));
    const level = progress?.level ?? 1;
    if (item.requiredLevel && level < item.requiredLevel) {
      throw new AppError("LEVEL_LOCKED", `Reach level ${item.requiredLevel} to unlock this.`);
    }

    /* Durables: unique ownership enforced before any debit. */
    let idemKey = clientKey?.trim() || randomUUID();
    if (!item.consumable) {
      idemKey = `purchase:${userId}:${item.id}`; // deterministic — a durable can only ever be bought once
      const existing = await tx
        .select({ id: inventory.id })
        .from(inventory)
        .where(and(eq(inventory.userId, userId), eq(inventory.itemId, item.id), eq(inventory.consumable, false)));
      if (existing.length > 0) throw new AppError("ITEM_ALREADY_OWNED", "You already own this.");
    }

    if (wallet.balance < item.price) {
      throw new AppError("INSUFFICIENT_BALANCE", `You need ${(item.price - wallet.balance).toLocaleString()} more ST.`, {
        shortfall: item.price - wallet.balance,
        itemPrice: item.price,
      });
    }

    /* Debit + ledger entry inside the same atomic boundary. */
    await tx.insert(walletTransactions).values({
      walletId: wallet.id,
      type: "purchase",
      amount: -item.price,
      title: item.name,
      context: `${item.rarity} ${item.category}`,
      referenceType: "item",
      referenceId: item.id,
      idempotencyKey: idemKey,
    }).onConflictDoNothing();
    const [wallet2] = await tx
      .update(wallets)
      .set({
        balance: sql`${wallets.balance} - ${item.price}`,
        lifetimeSpent: sql`${wallets.lifetimeSpent} + ${item.price}`,
        updatedAt: new Date(),
      })
      .where(and(eq(wallets.id, wallet.id), sql`${wallets.balance} >= ${item.price}`))
      .returning();
    if (!wallet2) {
      // Balance fell below price between read & write (CHECK constraint race backstop).
      logSecurity("purchase_balance_race_blocked", { userId, itemId });
      throw new AppError("INSUFFICIENT_BALANCE", "Your balance changed. Please try again.");
    }

    /* Ownership record. */
    await tx.insert(inventory).values({ userId, itemId: item.id, consumable: item.consumable });

    /* Consumable activation effects. */
    let effect: PurchaseResult["effect"];
    switch (item.boostType) {
      case "stMultiplier":
      case "xpMultiplier": {
        const expiresAt = new Date(Date.now() + (item.boostDurationMinutes ?? 30) * 60000);
        await tx.insert(activeBoosts).values({ userId, boostType: item.boostType, value: item.boostValue ?? 1, expiresAt });
        effect = { kind: "boost", amount: item.boostValue, expiresAt: expiresAt.toISOString() };
        break;
      }
      case "streakShield": {
        await tx
          .update(streaksTable)
          .set({ shields: sql`${streaksTable.shields} + ${item.boostValue ?? 1}` })
          .where(eq(streaksTable.userId, userId));
        effect = { kind: "shield", shieldsAdded: item.boostValue ?? 1 };
        break;
      }
      case "dailyBonus": {
        await tx.insert(walletTransactions).values({
          walletId: wallet.id,
          type: "reward",
          amount: item.boostValue ?? 500,
          title: "Daily Bonus claimed",
          referenceType: "item",
          referenceId: item.id,
          idempotencyKey: `${idemKey}:bonus`,
        }).onConflictDoNothing();
        await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} + ${item.boostValue ?? 500}`, lifetimeEarned: sql`${wallets.lifetimeEarned} + ${item.boostValue ?? 500}` })
          .where(eq(wallets.id, wallet.id));
        effect = { kind: "instant", amount: item.boostValue ?? 500 };
        break;
      }
      case "mysteryBox": {
        const roll = Math.floor(Math.random() * 800) + 100;
        await tx.insert(walletTransactions).values({
          walletId: wallet.id,
          type: "reward",
          amount: roll,
          title: "Mystery Reward opened",
          referenceType: "item",
          referenceId: item.id,
          idempotencyKey: `${idemKey}:mystery`,
          metadata: { roll },
        }).onConflictDoNothing();
        await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} + ${roll}`, lifetimeEarned: sql`${wallets.lifetimeEarned} + ${roll}` })
          .where(eq(wallets.id, wallet.id));
        effect = { kind: "mystery", amount: roll };
        break;
      }
      default:
        effect = item.consumable ? { kind: "redeemable" } : undefined;
    }

    /* Collection completion detection (guarded by a quest_progress ledger row). */
    let collectionBonus: { name: string; st: number; xp: number } | null = null;
    for (const col of COLLECTIONS) {
      if (!col.items.includes(item.id)) continue;
      const ownedCount = (
        await tx
          .select({ n: sql<number>`count(*)::int` })
          .from(inventory)
          .where(
            and(
              eq(inventory.userId, userId),
              sql`${inventory.itemId} in (${sql.join(col.items.map((id2) => sql`${id2}`), sql`, `)})`,
              eq(inventory.consumable, false)
            )
          )
      )[0].n;
      const alreadyGranted = await tx
        .select({ id: questProgress.id })
        .from(questProgress)
        .where(and(eq(questProgress.userId, userId), eq(questProgress.questId, `collection:${col.id}`)));
      if (ownedCount >= col.items.length && alreadyGranted.length === 0) {
        await tx.insert(questProgress).values({ userId, questId: `collection:${col.id}`, counters: {}, claimedAt: new Date() });
        await tx.insert(walletTransactions).values({
          walletId: wallet.id,
          type: "reward",
          amount: col.reward.st,
          title: `Collection complete — ${col.name}`,
          referenceType: "collection",
          referenceId: col.id,
          idempotencyKey: `collection:${userId}:${col.id}`,
        }).onConflictDoNothing();
        await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} + ${col.reward.st}`, lifetimeEarned: sql`${wallets.lifetimeEarned} + ${col.reward.st}` })
          .where(eq(wallets.id, wallet.id));
        await tx
          .update(playerProgress)
          .set({ xp: sql`${playerProgress.xp} + ${col.reward.xp}`, updatedAt: new Date() })
          .where(eq(playerProgress.userId, userId));
        collectionBonus = { name: col.name, st: col.reward.st, xp: col.reward.xp };
      }
    }

    /* Activity trail (spec §56). */
    const events: (typeof activityEvents.$inferInsert)[] = [
      { userId, type: "STORE_PURCHASE", entityId: item.id, metadata: { price: item.price, name: item.name } },
    ];
    if (collectionBonus) {
      events.push({ userId, type: "QUEST_COMPLETED", entityId: collectionBonus.name, metadata: { st: collectionBonus.st, xp: collectionBonus.xp } });
    }
    await tx.insert(activityEvents).values(events);

    const [finalWallet] = await tx.select().from(wallets).where(eq(wallets.id, wallet.id));

    logSecurity("purchase_completed", { userId, itemId, price: item.price });
    return { itemId, pricePaid: item.price, balance: finalWallet.balance, effect };
  });
}

/* ───────────────────────── Equip / wishlist ───────────────────── */

export async function setEquipped(userId: string, itemId: string, equipped: boolean): Promise<{ itemId: string; equipped: boolean }> {
  const item = CATALOG_BY_ID[itemId];
  if (!item) throw new AppError("ITEM_NOT_FOUND", "This item does not exist.");

  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(inventory)
      .where(and(eq(inventory.userId, userId), eq(inventory.itemId, itemId)))
      .limit(1);
    const inv = rows[0];
    if (!inv) throw new AppError("ITEM_NOT_FOUND", "You don't own this item.");

    if (equipped && !inv.equipped && item.slot) {
      // Unequip everything else in the same slot first.
      const sameSlotIds = CATALOG.filter((c) => c.slot === item.slot).map((c) => c.id);
      await tx
        .update(inventory)
        .set({ equipped: false })
        .where(and(eq(inventory.userId, userId), sql`${inventory.itemId} in (${sql.join(sameSlotIds.map((i) => sql`${i}`), sql`, `)})`));
    }
    await tx.update(inventory).set({ equipped }).where(eq(inventory.id, inv.id));

    if (equipped) {
      await tx.insert(activityEvents).values({ userId, type: "ITEM_EQUIPPED", entityId: itemId, metadata: {} });
    }
    return { itemId, equipped };
  });
}

export async function redeemConsumable(userId: string, itemId: string): Promise<void> {
  const item = CATALOG_BY_ID[itemId];
  if (!item || !item.consumable) throw new AppError("ITEM_NOT_FOUND", "This item cannot be redeemed.");

  await db.transaction(async (tx) => {
    const rows = await tx.select().from(inventory).where(and(eq(inventory.userId, userId), eq(inventory.itemId, itemId))).limit(1);
    const inv = rows[0];
    if (!inv) throw new AppError("ITEM_NOT_FOUND", "You don't own this item.");
    await tx.delete(inventory).where(eq(inventory.id, inv.id));
    await tx.insert(activityEvents).values({ userId, type: "REWARD_REDEEMED", entityId: itemId, metadata: { name: item.name } });
  });
}

export async function toggleWishlist(userId: string, itemId: string, add: boolean): Promise<void> {
  if (!CATALOG_BY_ID[itemId]) throw new AppError("ITEM_NOT_FOUND", "Unknown item.");
  if (add) {
    await db.insert(wishlists).values({ userId, itemId }).onConflictDoNothing();
  } else {
    await db.delete(wishlists).where(and(eq(wishlists.userId, userId), eq(wishlists.itemId, itemId)));
  }
}

export async function setPurchaseGoal(userId: string, itemId: string | null): Promise<void> {
  if (itemId !== null && !CATALOG_BY_ID[itemId]) throw new AppError("ITEM_NOT_FOUND", "Unknown item.");
  await db.update(profiles).set({ goalItemId: itemId, updatedAt: new Date() }).where(eq(profiles.userId, userId));
}
