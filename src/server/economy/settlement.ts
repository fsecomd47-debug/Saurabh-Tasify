import "server-only";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  missions,
  wallets,
  walletTransactions,
  playerProgress,
  streaks as streaksTable,
  activityEvents,
  verificationResults,
  activeBoosts,
  profiles,
  settlementAudit,
  petOwnerships,
  petXpEvents,
} from "@/db/schema";
import { PET_BY_ID, PET_MISSION_XP_RATIO } from "@/lib/pets/data";
import { AppError, logSecurity } from "@/server/http";
import { levelFromXP, computeCompletionReward } from "@/server/economy/rewards";
import { localDateStr, nextStreakState } from "@/server/economy/streaks";
import { clampReward, checkDailyCap, applyEconomyGuard } from "@/server/anti-abuse/economy-guard";

export type SettlementResult = {
  stGained: number;
  xpGained: number;
  levelUp: boolean;
  newLevel: number;
  missionId: string;
  /** True when this exact mission was already settled earlier (§62). */
  alreadySettled?: boolean;
};

/**
 * Atomically settle a verified mission reward.
 * Uses INSERT with ON CONFLICT to guarantee atomic idempotency.
 * If two concurrent requests race, only one will insert; the other gets rowsAffected=0.
 */
export async function settleMissionReward(
  missionId: string,
  userId: string
): Promise<SettlementResult> {
  return db.transaction(async (tx) => {
    // 1. Load mission + verification result
    const missionRow = await tx.select().from(missions).where(eq(missions.id, missionId)).limit(1);
    if (!missionRow[0]) throw new AppError("MISSION_NOT_FOUND", "Mission not found.");
    if (missionRow[0].userId !== userId) throw new AppError("FORBIDDEN", "Not your mission.");
    if (missionRow[0].status !== "passed") {
      throw new AppError("MISSION_TERMINAL", "Mission is not verified as passed.");
    }

    const verification = await tx.select().from(verificationResults)
      .where(eq(verificationResults.missionId, missionId))
      .orderBy(sql`${verificationResults.createdAt} desc`)
      .limit(1);
    if (!verification[0]) throw new AppError("VERIFICATION_FAILED", "No verification result found.");

    // 2. Lock wallet row to prevent concurrent double-credit
    const walletRows = await tx.execute<{ id: string; balance: number }>(
      sql`SELECT id, balance FROM wallets WHERE user_id = ${userId} FOR UPDATE`
    );
    if (!walletRows[0]) throw new AppError("INTERNAL", "Wallet not found.");
    const walletId = walletRows[0].id;

    // 3. Idempotency check — if already settled, return zeros
    const idempotencyKey = `mission:${missionId}`;
    const existing = await tx.select().from(walletTransactions)
      .where(eq(walletTransactions.idempotencyKey, idempotencyKey))
      .limit(1);

    if (existing[0]) {
      logSecurity("settlement_already_completed", { missionId });
      return { stGained: 0, xpGained: 0, levelUp: false, newLevel: 0, missionId, alreadySettled: true };
    }

    // 4. Cooldown: block if last settlement was < 60 seconds ago
    const lastSettlement = await tx.select({ createdAt: walletTransactions.createdAt })
      .from(walletTransactions)
      .where(and(
        eq(walletTransactions.walletId, walletId),
        eq(walletTransactions.type, "earning")
      ))
      .orderBy(sql`${walletTransactions.createdAt} desc`)
      .limit(1);

    if (lastSettlement[0]) {
      const secondsSince = (Date.now() - lastSettlement[0].createdAt.getTime()) / 1000;
      if (secondsSince < 60) {
        logSecurity("settlement_cooldown", { missionId, secondsSince: Math.round(secondsSince) });
        throw new AppError("RATE_LIMITED", "Please wait before claiming another reward.");
      }
    }

    // 5. Daily earnings cap via economy guard
    const dailyCap = await checkDailyCap(walletId);
    if (dailyCap.exceeded) {
      logSecurity("settlement_daily_cap", { missionId, earnedToday: dailyCap.earnedToday });
      throw new AppError("RATE_LIMITED", "Daily earnings limit reached. Try again tomorrow.");
    }

    // 3. Calculate reward with multipliers
    const mission = missionRow[0];
    const stBase = mission.rewardStPreview;
    const xpBase = mission.rewardXpPreview;

    // Load profile for timezone
    const profile = await tx.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
    const timezone = profile[0]?.timezone ?? "UTC";

    // Load streak for multiplier
    const streak = await tx.select().from(streaksTable).where(eq(streaksTable.userId, userId)).limit(1);
    const currentStreak = streak[0]?.current ?? 0;

    // Count today's completions for momentum multiplier (timezone-aware)
    const todayCompletions = await tx.select({ count: sql<number>`count(*)::int` })
      .from(activityEvents)
      .where(and(
        eq(activityEvents.userId, userId),
        eq(activityEvents.type, "MISSION_COMPLETED"),
        sql`${activityEvents.createdAt} >= date_trunc('day', now() at time zone ${timezone}) at time zone ${timezone}`
      ));
    const tasksCompletedToday = (todayCompletions[0]?.count ?? 0) + 1; // +1 for this mission

    // Load active boosts
    const boosts = await tx.select().from(activeBoosts)
      .where(and(
        eq(activeBoosts.userId, userId),
        sql`${activeBoosts.expiresAt} > NOW()`
      ));
    const activeStBoost = boosts.find((b) => b.boostType === "stMultiplier" || b.boostType === "st_boost");
    const activeXpBoost = boosts.find((b) => b.boostType === "xpMultiplier" || b.boostType === "xp_boost");
    const localHour = parseInt(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: timezone }));

    // Compute reward with all multipliers
    const completionReward = computeCompletionReward({
      baseReward: stBase,
      baseXP: xpBase,
      streak: currentStreak,
      tasksCompletedToday,
      activeStBoostValue: activeStBoost?.value ?? null,
      activeXpBoostValue: activeXpBoost?.value ?? null,
      localHour,
    });

    // Apply confidence multiplier on top
    const confidenceMult = verification[0].confidenceScore;
    const stRaw = Math.round(completionReward.stGained * confidenceMult);
    const xpRaw = Math.max(1, Math.round(completionReward.xpGained * confidenceMult));

    // Apply economy guard: clamp reward + daily cap partial
    const guarded = applyEconomyGuard(stRaw, dailyCap.earnedToday);
    const stFinal = guarded.st;
    const xpFinal = Math.max(1, Math.round(xpRaw * (guarded.st / Math.max(1, stRaw))));

    // 4. Credit wallet
    await tx.update(wallets)
      .set({
        balance: sql`${wallets.balance} + ${stFinal}`,
        lifetimeEarned: sql`${wallets.lifetimeEarned} + ${stFinal}`,
        updatedAt: new Date(),
      })
      .where(eq(wallets.userId, userId));

    // 9. Ledger entry — onConflictDoNothing for atomic idempotency
    const insertedTxn = await tx.insert(walletTransactions).values({
      walletId: walletId,
      type: "earning",
      amount: stFinal,
      title: `Mission: ${mission.activityType}`,
      context: `Verified ${mission.difficulty} mission`,
      referenceType: "mission",
      referenceId: missionId,
      idempotencyKey,
      metadata: {
        missionId,
        difficulty: mission.difficulty,
        activityType: mission.activityType,
        verificationMode: mission.verificationMode,
        confidence: verification[0].confidenceScore,
        multipliers: {
          streak: completionReward.streakMultiplier,
          momentum: completionReward.momentumMultiplier,
          earlyBird: completionReward.earlyBird,
          criticalHit: completionReward.criticalHit,
          boost: completionReward.boostMultiplier,
        },
      },
    }).onConflictDoNothing().returning();

    // If onConflictDoNothing returned empty, another request settled this — bail
    if (insertedTxn.length === 0) {
      logSecurity("settlement_race_detected", { missionId });
      return { stGained: 0, xpGained: 0, levelUp: false, newLevel: 0, missionId, alreadySettled: true };
    }

    // 7. XP + level
    const progress = await tx.select().from(playerProgress).where(eq(playerProgress.userId, userId)).limit(1);
    if (!progress[0]) throw new AppError("INTERNAL", "Player progress not found.");

    const newXP = progress[0].xp + xpFinal;
    const newLevel = levelFromXP(newXP);
    const levelUp = newLevel > progress[0].level;

    await tx.update(playerProgress)
      .set({
        xp: newXP,
        level: newLevel,
        tasksCompleted: sql`${playerProgress.tasksCompleted} + 1`,
        hardTasksCompleted: mission.difficulty === "hard" || mission.difficulty === "elite"
          ? sql`${playerProgress.hardTasksCompleted} + 1`
          : sql`${playerProgress.hardTasksCompleted}`,
        updatedAt: new Date(),
      })
      .where(eq(playerProgress.userId, userId));

    // 8. Streak update — nextStreakState handles shields internally
    if (streak[0]) {
      const today = localDateStr(new Date(), timezone);
      const lastDateStr = streak[0].lastCompletionDate
        ? localDateStr(new Date(streak[0].lastCompletionDate), timezone)
        : null;
      const newStreak = nextStreakState({
        currentStreak: streak[0].current,
        lastCompletionDate: lastDateStr,
        todayLocal: today,
        bestStreak: streak[0].best,
        shieldCount: streak[0].shields,
      });

      // Use the shieldsUsed field directly from nextStreakState
      const shieldUsed = newStreak.shieldsUsed > 0;

      await tx.update(streaksTable)
        .set({
          current: newStreak.current,
          best: Math.max(streak[0].best, newStreak.current),
          shields: shieldUsed ? streak[0].shields - 1 : streak[0].shields,
          lastCompletionDate: today,
        })
        .where(eq(streaksTable.userId, userId));

      if (shieldUsed) {
        logSecurity("streak_shield_consumed", { userId, missionId, shieldsRemaining: streak[0].shields - 1 });
      }
    }

    // 9. Activity event
    await tx.insert(activityEvents).values({
      userId,
      type: "MISSION_COMPLETED",
      entityId: missionId,
      metadata: {
        stGained: stFinal,
        xpGained: xpFinal,
        difficulty: mission.difficulty,
        activityType: mission.activityType,
        verificationMode: mission.verificationMode,
        verified: true,
        criticalHit: completionReward.criticalHit,
        earlyBird: completionReward.earlyBird,
        streakMultiplier: completionReward.streakMultiplier,
      },
    });

    // 10. Settlement audit trail
    await tx.insert(settlementAudit).values({
      missionId,
      userId,
      stBase,
      xpBase,
      confidenceScore: confidenceMult,
      multipliers: {
        streak: completionReward.streakMultiplier,
        momentum: completionReward.momentumMultiplier,
        earlyBird: completionReward.earlyBird,
        criticalHit: completionReward.criticalHit,
        boost: completionReward.boostMultiplier,
      },
      stFinal,
      xpFinal,
    });

    // 11. Grant pet XP for active pet
    let petLevelUp = false;
    let petNewLevel = 0;
    try {
      const activePetRows = await tx
        .select()
        .from(petOwnerships)
        .where(and(eq(petOwnerships.userId, userId), eq(petOwnerships.equipped, true)));
      if (activePetRows.length > 0) {
        const ap = activePetRows[0];
        const def = PET_BY_ID[ap.petDefinitionId];
        if (def) {
          const xpGain = Math.max(1, Math.round(xpFinal * PET_MISSION_XP_RATIO));
          let newXp = ap.petXp + xpGain;
          let newLevel = ap.petLevel;
          let threshold = def.xpPerLevel + ap.petLevel * 20;
          while (newXp >= threshold) {
            newXp -= threshold;
            newLevel += 1;
            threshold = def.xpPerLevel + newLevel * 20;
          }
          await tx.update(petOwnerships).set({ petXp: newXp, petLevel: newLevel }).where(eq(petOwnerships.id, ap.id));
          await tx.insert(petXpEvents).values({ userId, petOwnershipId: ap.id, xpAmount: xpGain, source: "mission", missionId });
          if (newLevel > ap.petLevel) {
            petLevelUp = true;
            petNewLevel = newLevel;
          }
        }
      }
    } catch {
      // Pet XP failure should not block mission settlement
    }

    // 11. Mark mission as settled so claim is clearly idempotent
    await tx.update(missions)
      .set({ status: "settled", updatedAt: new Date() })
      .where(eq(missions.id, missionId));

    logSecurity("mission_settled", { missionId, st: stFinal, xp: xpFinal });

    // Fire-and-forget: process social event (failures must NOT break settlement)
    try {
      const { processGameEvent } = await import("@/server/services/social-event-bus");
      await processGameEvent({
        type: "ST_EARNED",
        userId,
        metadata: {
          amount: stFinal,
          missionId,
          difficulty: mission.difficulty,
          activityType: mission.activityType,
          verificationMode: mission.verificationMode,
          verified: true,
        },
      });
      if (levelUp) {
        await processGameEvent({
          type: "LEVEL_UP",
          userId,
          metadata: { level: newLevel, previousLevel: progress[0].level },
        });
      }
      if (petLevelUp) {
        await processGameEvent({
          type: "PET_LEVEL_UP",
          userId,
          metadata: { level: petNewLevel },
        });
      }
    } catch {
      // Social bus failure must not break settlement
    }

    return {
      stGained: stFinal,
      xpGained: xpFinal,
      levelUp,
      newLevel,
      missionId,
    };
  });
}
