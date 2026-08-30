import "server-only";
import { randomUUID } from "crypto";
import { and, eq, sql, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  petDefinitions,
  petOwnerships,
  petMiningSessions,
  petMiningSettlements,
  petXpEvents,
  wallets,
  walletTransactions,
  playerProgress,
  activityEvents,
} from "@/db/schema";
import {
  PET_BY_ID,
  PET_MINING_DAILY_CAP,
  PET_MAX_OFFLINE_HOURS,
  PET_MISSION_XP_RATIO,
} from "@/lib/pets/data";
import { AppError, logSecurity } from "@/server/http";
import { levelFromXP } from "@/server/economy/rewards";
import { localDateStr } from "@/server/economy/streaks";
import { profiles } from "@/db/schema";

/* ─────────────────────── Types ──────────────────────────────── */

export type PetOwnershipDTO = {
  id: string;
  petDefinitionId: string;
  name: string;
  emoji: string;
  description: string;
  personality: string;
  level: number;
  rarity: string;
  archetype: string;
  petLevel: number;
  petXp: number;
  xpToNextLevel: number;
  miningRate: number;
  xpBoost: number;
  equipped: boolean;
  acquiredAt: string;
  equippedAt: string | null;
  priceSt: number;
  assetGradient: string;
  unlockPlayerLevel: number;
};

export type PetCatalogDTO = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  personality: string;
  level: number;
  rarity: string;
  archetype: string;
  priceSt: number;
  miningRatePerMinute: number;
  xpBoostPercent: number;
  xpPerLevel: number;
  unlockPlayerLevel: number;
  assetGradient: string;
  owned: boolean;
  equipped: boolean;
  userPetLevel: number | null;
};

export type MiningStatusDTO = {
  active: boolean;
  petName: string;
  petEmoji: string;
  miningRate: number;
  todayMined: number;
  dailyCap: number;
  sessionStartedAt: string | null;
  lastSettlementAt: string | null;
  returnSummary: {
    stMined: number;
    petXpGained: number;
    petLevel: number;
    elapsed: string;
  } | null;
};

/* ─────────────────────── Helpers ────────────────────────────── */

function computeMiningRate(baseRate: number, petLevel: number, growth: number): number {
  return Math.round((baseRate + petLevel * growth) * 100) / 100;
}

function computeXpBoost(baseBoost: number, petLevel: number, growth: number): number {
  return Math.round((baseBoost + petLevel * growth) * 10) / 10;
}

function computeXpToNextLevel(petLevel: number, xpPerLevel: number): number {
  return xpPerLevel + petLevel * 20;
}

/* ─────────────────────── Catalog ────────────────────────────── */

export async function getPetCatalog(userId: string): Promise<PetCatalogDTO[]> {
  const [ownershipRows, progressRow] = await Promise.all([
    db.select().from(petOwnerships).where(eq(petOwnerships.userId, userId)),
    db.select().from(playerProgress).where(eq(playerProgress.userId, userId)),
  ]);

  const playerLevel = progressRow[0]?.level ?? 1;
  const ownedMap = new Map(ownershipRows.map((o) => [o.petDefinitionId, o]));

  return Object.values(PET_BY_ID).map((def) => {
    const ownership = ownedMap.get(def.id);
    return {
      id: def.id,
      name: def.name,
      emoji: def.emoji,
      description: def.description,
      personality: def.personality,
      level: def.level,
      rarity: def.rarity,
      archetype: def.archetype,
      priceSt: def.priceSt,
      miningRatePerMinute: def.miningRatePerMinute,
      xpBoostPercent: def.xpBoostPercent,
      xpPerLevel: def.xpPerLevel,
      unlockPlayerLevel: def.unlockPlayerLevel,
      assetGradient: def.assetGradient,
      owned: !!ownership,
      equipped: !!ownership?.equipped,
      userPetLevel: ownership?.petLevel ?? null,
    };
  });
}

/* ─────────────────────── Purchase ───────────────────────────── */

export async function purchasePet(userId: string, petId: string): Promise<PetOwnershipDTO> {
  const def = PET_BY_ID[petId];
  if (!def) throw new AppError("ITEM_NOT_FOUND", "This pet does not exist.");

  return db.transaction(async (tx) => {
    const [progress] = await tx.select().from(playerProgress).where(eq(playerProgress.userId, userId));
    const playerLevel = progress?.level ?? 1;
    if (playerLevel < def.unlockPlayerLevel) {
      throw new AppError("LEVEL_LOCKED", `Reach player level ${def.unlockPlayerLevel} to unlock this pet.`);
    }

    const existingOwnership = await tx
      .select({ id: petOwnerships.id })
      .from(petOwnerships)
      .where(and(eq(petOwnerships.userId, userId), eq(petOwnerships.petDefinitionId, petId)));
    if (existingOwnership.length > 0) {
      throw new AppError("ITEM_ALREADY_OWNED", "You already own this pet.");
    }

    const [wallet] = await tx.select().from(wallets).where(eq(wallets.userId, userId)).for("update");
    if (!wallet) throw new AppError("INTERNAL", "Wallet missing.");
    if (wallet.balance < def.priceSt) {
      throw new AppError("INSUFFICIENT_BALANCE", `You need ${(def.priceSt - wallet.balance).toLocaleString()} more ST.`, {
        shortfall: def.priceSt - wallet.balance,
        itemPrice: def.priceSt,
      });
    }

    const idemKey = `pet-purchase:${userId}:${petId}`;
    await tx.insert(walletTransactions).values({
      walletId: wallet.id,
      type: "purchase",
      amount: -def.priceSt,
      title: `Adopted ${def.name}`,
      context: `${def.rarity} pet`,
      referenceType: "pet",
      referenceId: petId,
      idempotencyKey: idemKey,
    }).onConflictDoNothing();

    const [wallet2] = await tx
      .update(wallets)
      .set({
        balance: sql`${wallets.balance} - ${def.priceSt}`,
        lifetimeSpent: sql`${wallets.lifetimeSpent} + ${def.priceSt}`,
        updatedAt: new Date(),
      })
      .where(and(eq(wallets.id, wallet.id), sql`${wallets.balance} >= ${def.priceSt}`))
      .returning();
    if (!wallet2) {
      logSecurity("pet_purchase_balance_race_blocked", { userId, petId });
      throw new AppError("INSUFFICIENT_BALANCE", "Your balance changed. Please try again.");
    }

    const [ownership] = await tx.insert(petOwnerships).values({
      userId,
      petDefinitionId: petId,
      petLevel: 0,
      petXp: 0,
      equipped: false,
    }).returning();

    await tx.insert(activityEvents).values({
      userId,
      type: "PET_PURCHASED",
      entityId: petId,
      metadata: { name: def.name, price: def.priceSt, emoji: def.emoji },
    });

    // Fire social event
    try {
      const { processGameEvent } = await import("@/server/services/social-event-bus");
      await processGameEvent({
        userId,
        type: "PET_PURCHASED",
        metadata: { name: def.name, emoji: def.emoji },
      });
    } catch {
      // fire-and-forget
    }

    return formatOwnership(ownership, def);
  });
}

/* ─────────────────────── Equip / Unequip ────────────────────── */

export async function equipPet(userId: string, petId: string): Promise<{ equipped: boolean; petName: string }> {
  const def = PET_BY_ID[petId];
  if (!def) throw new AppError("ITEM_NOT_FOUND", "This pet does not exist.");

  return db.transaction(async (tx) => {
    const ownerships = await tx
      .select()
      .from(petOwnerships)
      .where(and(eq(petOwnerships.userId, userId), eq(petOwnerships.petDefinitionId, petId)));
    const ownership = ownerships[0];
    if (!ownership) throw new AppError("ITEM_NOT_FOUND", "You don't own this pet.");

    if (ownership.equipped) {
      return { equipped: true, petName: def.name };
    }

    // Unequip current active pet
    await tx
      .update(petOwnerships)
      .set({ equipped: false, equippedAt: null })
      .where(and(eq(petOwnerships.userId, userId), eq(petOwnerships.equipped, true)));

    // Close any active mining session for previous pet
    const activeSessions = await tx
      .select()
      .from(petMiningSessions)
      .where(and(eq(petMiningSessions.userId, userId), eq(petMiningSessions.status, "active")));
    for (const session of activeSessions) {
      await tx
        .update(petMiningSessions)
        .set({ endedAt: new Date(), status: "settled" })
        .where(eq(petMiningSessions.id, session.id));
    }

    // Equip new pet
    await tx
      .update(petOwnerships)
      .set({ equipped: true, equippedAt: new Date() })
      .where(eq(petOwnerships.id, ownership.id));

    // Start new mining session
    await tx.insert(petMiningSessions).values({
      userId,
      petOwnershipId: ownership.id,
      status: "active",
    });

    await tx.insert(activityEvents).values({
      userId,
      type: "PET_EQUIPPED",
      entityId: petId,
      metadata: { name: def.name, emoji: def.emoji },
    });

    return { equipped: true, petName: def.name };
  });
}

export async function unequipPet(userId: string): Promise<{ unequipped: boolean }> {
  return db.transaction(async (tx) => {
    const active = await tx
      .select()
      .from(petOwnerships)
      .where(and(eq(petOwnerships.userId, userId), eq(petOwnerships.equipped, true)));
    if (active.length === 0) {
      return { unequipped: false };
    }

    await tx
      .update(petOwnerships)
      .set({ equipped: false, equippedAt: null })
      .where(eq(petOwnerships.id, active[0].id));

    // Close active mining session
    const sessions = await tx
      .select()
      .from(petMiningSessions)
      .where(and(eq(petMiningSessions.userId, userId), eq(petMiningSessions.status, "active")));
    for (const session of sessions) {
      await tx
        .update(petMiningSessions)
        .set({ endedAt: new Date(), status: "settled" })
        .where(eq(petMiningSessions.id, session.id));
    }

    return { unequipped: true };
  });
}

/* ─────────────────────── Active Pet / Mining ────────────────── */

export async function getActivePet(userId: string): Promise<PetOwnershipDTO | null> {
  const rows = await db
    .select()
    .from(petOwnerships)
    .where(and(eq(petOwnerships.userId, userId), eq(petOwnerships.equipped, true)));
  if (rows.length === 0) return null;

  const ownership = rows[0];
  const def = PET_BY_ID[ownership.petDefinitionId];
  if (!def) return null;
  return formatOwnership(ownership, def);
}

export async function getMiningStatus(userId: string): Promise<MiningStatusDTO> {
  const activePet = await getActivePet(userId);
  if (!activePet) {
    return {
      active: false,
      petName: "",
      petEmoji: "",
      miningRate: 0,
      todayMined: 0,
      dailyCap: PET_MINING_DAILY_CAP,
      sessionStartedAt: null,
      lastSettlementAt: null,
      returnSummary: null,
    };
  }

  const sessions = await db
    .select()
    .from(petMiningSessions)
    .where(and(eq(petMiningSessions.userId, userId), eq(petMiningSessions.status, "active")))
    .orderBy(desc(petMiningSessions.startedAt))
    .limit(1);

  const session = sessions[0];

  // Calculate today's mined ST (timezone-aware)
  const profile = await db.select({ timezone: profiles.timezone }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
  const timezone = profile[0]?.timezone ?? "UTC";
  const todaySettlements = await db
    .select({ total: sql<number>`coalesce(sum(${petMiningSettlements.stAmount}), 0)::int` })
    .from(petMiningSettlements)
    .where(
      and(
        eq(petMiningSettlements.userId, userId),
        sql`${petMiningSettlements.createdAt} >= date_trunc('day', now() at time zone ${timezone}) at time zone ${timezone}`
      )
    );
  const todayMined = todaySettlements[0]?.total ?? 0;

  // Find last settlement
  const lastSettlement = await db
    .select()
    .from(petMiningSettlements)
    .where(eq(petMiningSettlements.userId, userId))
    .orderBy(desc(petMiningSettlements.createdAt))
    .limit(1);

  // Calculate potential return mining (offline accrual preview)
  let returnSummary: MiningStatusDTO["returnSummary"] = null;
  if (session) {
    const elapsed = Date.now() - session.startedAt.getTime();
    const eligibleMs = Math.min(elapsed, PET_MAX_OFFLINE_HOURS * 3600000);
    const eligibleMinutes = Math.floor(eligibleMs / 60000);
    if (eligibleMinutes >= 1) {
      const def = PET_BY_ID[activePet.petDefinitionId];
      if (def) {
        const rate = computeMiningRate(def.miningRatePerMinute, activePet.petLevel, def.miningRateGrowth);
        const grossSt = Math.min(
          Math.floor(eligibleMinutes * rate),
          Math.max(0, PET_MINING_DAILY_CAP - todayMined)
        );
        if (grossSt > 0) {
          const elapsedHours = Math.floor(eligibleMinutes / 60);
          const elapsedMins = eligibleMinutes % 60;
          returnSummary = {
            stMined: grossSt,
            petXpGained: Math.max(1, Math.floor(grossSt * 0.1)),
            petLevel: activePet.petLevel,
            elapsed: elapsedHours > 0 ? `${elapsedHours}h ${elapsedMins}m` : `${elapsedMins}m`,
          };
        }
      }
    }
  }

  return {
    active: !!session,
    petName: activePet.name,
    petEmoji: activePet.emoji,
    miningRate: activePet.miningRate,
    todayMined,
    dailyCap: PET_MINING_DAILY_CAP,
    sessionStartedAt: session?.startedAt?.toISOString() ?? null,
    lastSettlementAt: lastSettlement[0]?.createdAt?.toISOString() ?? null,
    returnSummary,
  };
}

/* ─────────────────────── Mining Settlement ──────────────────── */

export async function settleMining(userId: string): Promise<{ stMined: number; settled: boolean }> {
  return db.transaction(async (tx) => {
    const activePet = await tx
      .select()
      .from(petOwnerships)
      .where(and(eq(petOwnerships.userId, userId), eq(petOwnerships.equipped, true)));
    if (activePet.length === 0) return { stMined: 0, settled: false };

    const ownership = activePet[0];
    const def = PET_BY_ID[ownership.petDefinitionId];
    if (!def) return { stMined: 0, settled: false };

    const activeSessions = await tx
      .select()
      .from(petMiningSessions)
      .where(and(eq(petMiningSessions.userId, userId), eq(petMiningSessions.status, "active")));
    if (activeSessions.length === 0) return { stMined: 0, settled: false };

    const session = activeSessions[0];
    const now = new Date();
    const elapsed = now.getTime() - session.startedAt.getTime();
    const eligibleMs = Math.min(elapsed, PET_MAX_OFFLINE_HOURS * 3600000);
    const eligibleMinutes = Math.floor(eligibleMs / 60000);
    if (eligibleMinutes < 1) return { stMined: 0, settled: false };

    const miningRate = computeMiningRate(def.miningRatePerMinute, ownership.petLevel, def.miningRateGrowth);
    let grossSt = Math.floor(eligibleMinutes * miningRate);

    // Daily cap check (timezone-aware)
    const profile = await tx.select({ timezone: profiles.timezone }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
    const tz = profile[0]?.timezone ?? "UTC";
    const todaySettlements = await tx
      .select({ total: sql<number>`coalesce(sum(${petMiningSettlements.stAmount}), 0)::int` })
      .from(petMiningSettlements)
      .where(
        and(
          eq(petMiningSettlements.userId, userId),
          sql`${petMiningSettlements.createdAt} >= date_trunc('day', now() at time zone ${tz}) at time zone ${tz}`
        )
      );
    const todayMined = todaySettlements[0]?.total ?? 0;
    grossSt = Math.min(grossSt, Math.max(0, PET_MINING_DAILY_CAP - todayMined));
    if (grossSt <= 0) return { stMined: 0, settled: false };

    // Credit wallet
    const [wallet] = await tx.select().from(wallets).where(eq(wallets.userId, userId)).for("update");
    if (!wallet) return { stMined: 0, settled: false };

    const idemKey = `pet-mining:${userId}:${session.id}:${now.toISOString().slice(0, 13)}`;
    const [txRow] = await tx.insert(walletTransactions).values({
      walletId: wallet.id,
      type: "earning",
      amount: grossSt,
      title: `${def.name} mining`,
      context: "pet_mining",
      referenceType: "pet_mining",
      referenceId: session.id,
      idempotencyKey: idemKey,
      metadata: { petId: def.id, minutes: eligibleMinutes, rate: miningRate },
    }).onConflictDoNothing().returning();
    if (!txRow) return { stMined: 0, settled: false };

    await tx
      .update(wallets)
      .set({
        balance: sql`${wallets.balance} + ${grossSt}`,
        lifetimeEarned: sql`${wallets.lifetimeEarned} + ${grossSt}`,
      })
      .where(eq(wallets.id, wallet.id));

    // Record settlement
    await tx.insert(petMiningSettlements).values({
      miningSessionId: session.id,
      userId,
      eligibleMinutes,
      stAmount: grossSt,
      walletTransactionId: txRow.id,
    });

    // Restart session for continuous mining
    await tx
      .update(petMiningSessions)
      .set({ endedAt: now, status: "settled" })
      .where(eq(petMiningSessions.id, session.id));
    await tx.insert(petMiningSessions).values({
      userId,
      petOwnershipId: ownership.id,
      status: "active",
    });

    await tx.insert(activityEvents).values({
      userId,
      type: "PET_MINING_REWARD",
      entityId: def.id,
      metadata: { name: def.name, st: grossSt, minutes: eligibleMinutes },
    });

    return { stMined: grossSt, settled: true };
  });
}

/* ─────────────────────── Pet XP ─────────────────────────────── */

export async function grantPetXp(
  userId: string,
  missionXp: number,
  missionId?: string
): Promise<{ petXp: number; levelUp: boolean; newLevel: number } | null> {
  const activePet = await db
    .select()
    .from(petOwnerships)
    .where(and(eq(petOwnerships.userId, userId), eq(petOwnerships.equipped, true)));
  if (activePet.length === 0) return null;

  const ownership = activePet[0];
  const def = PET_BY_ID[ownership.petDefinitionId];
  if (!def) return null;

  return db.transaction(async (tx) => {
    const xpGain = Math.max(1, Math.floor(missionXp * PET_MISSION_XP_RATIO));
    let newPetXp = ownership.petXp + xpGain;
    let newPetLevel = ownership.petLevel;
    let levelUp = false;

    // Allow multiple level-ups from a single large XP grant
    let xpThreshold = computeXpToNextLevel(newPetLevel, def.xpPerLevel);
    while (newPetXp >= xpThreshold) {
      newPetXp -= xpThreshold;
      newPetLevel += 1;
      levelUp = true;
      xpThreshold = computeXpToNextLevel(newPetLevel, def.xpPerLevel);
    }

    await tx
      .update(petOwnerships)
      .set({ petXp: newPetXp, petLevel: newPetLevel })
      .where(eq(petOwnerships.id, ownership.id));

    await tx.insert(petXpEvents).values({
      userId,
      petOwnershipId: ownership.id,
      xpAmount: xpGain,
      source: "mission",
      missionId: missionId ?? null,
    });

    if (levelUp) {
      await tx.insert(activityEvents).values({
        userId,
        type: "PET_LEVEL_UP",
        entityId: def.id,
        metadata: { name: def.name, newLevel: newPetLevel, emoji: def.emoji },
      });

      // Fire-and-forget: social event
      try {
        const { processGameEvent } = await import("@/server/services/social-event-bus");
        await processGameEvent({
          type: "PET_LEVEL_UP",
          userId,
          metadata: { name: def.name, newLevel: newPetLevel, emoji: def.emoji },
        });
      } catch { /* social bus failure must not break pet settlement */ }
    }

    return { petXp: newPetXp, levelUp, newLevel: newPetLevel };
  });
}

/* ─────────────────────── User Pets ──────────────────────────── */

export async function getUserPets(userId: string): Promise<PetOwnershipDTO[]> {
  const rows = await db
    .select()
    .from(petOwnerships)
    .where(eq(petOwnerships.userId, userId))
    .orderBy(desc(petOwnerships.equipped), desc(petOwnerships.acquiredAt));

  return rows.map((o) => {
    const def = PET_BY_ID[o.petDefinitionId];
    if (!def) return null;
    return formatOwnership(o, def);
  }).filter(Boolean) as PetOwnershipDTO[];
}

/* ─────────────────────── Formatting ─────────────────────────── */

function formatOwnership(
  ownership: typeof petOwnerships.$inferSelect,
  def: (typeof PET_BY_ID)[string]
): PetOwnershipDTO {
  const miningRate = computeMiningRate(def.miningRatePerMinute, ownership.petLevel, def.miningRateGrowth);
  const xpBoost = computeXpBoost(def.xpBoostPercent, ownership.petLevel, def.xpBoostGrowth);
  const xpToNext = computeXpToNextLevel(ownership.petLevel, def.xpPerLevel);

  return {
    id: ownership.id,
    petDefinitionId: ownership.petDefinitionId,
    name: def.name,
    emoji: def.emoji,
    description: def.description,
    personality: def.personality,
    level: def.level,
    rarity: def.rarity,
    archetype: def.archetype,
    petLevel: ownership.petLevel,
    petXp: ownership.petXp,
    xpToNextLevel: xpToNext,
    miningRate,
    xpBoost,
    equipped: ownership.equipped,
    acquiredAt: ownership.acquiredAt?.toISOString() ?? new Date().toISOString(),
    equippedAt: ownership.equippedAt?.toISOString() ?? null,
    priceSt: def.priceSt,
    assetGradient: def.assetGradient,
    unlockPlayerLevel: def.unlockPlayerLevel,
  };
}
