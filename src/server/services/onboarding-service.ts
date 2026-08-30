import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  activityEvents,
  onboardingProfiles,
  playerAchievements,
  playerProgress,
  profiles,
  questProgress,
  streaks as streaksTable,
  tasks,
  walletTransactions,
  wallets,
} from "@/db/schema";
import type { TaskCategory } from "@/types";
import { AVATARS_BY_ID, STARTER } from "@/lib/catalog/data";
import { logSecurity, AppError } from "@/server/http";
import { WELCOME_QUEST_ID } from "@/server/economy/definitions";
import { checkDisplayNameAvailable } from "./username-service";

const VALID_TIMEZONE = /^[A-Za-z_]+\/[A-Za-z_+\-0-9]+$|^UTC$/;

export type OnboardingInput = {
  displayName: string;
  avatarId: string;
  preferredCategories: TaskCategory[];
  dailyCommitmentMinutes: number;
  primaryGoal: string;
  timezone?: string;
  playstyle?: "grinder" | "sprinter" | "competitor" | "collector" | "balanced" | null;
};

/** Personalized starter mission title based on chosen goal. */
function starterMissionTitle(input: OnboardingInput): string {
  const goal = input.primaryGoal.trim();
  if (goal.length > 0 && goal.length <= 60) {
    return `First step: ${goal.charAt(0).toLowerCase()}${goal.slice(1)}`;
  }
  return "Complete your first mission";
}

/**
 * ONBOARDING INITIALIZATION TRANSACTION.
 * Creates the full initial player state atomically.
 * IDEMPOTENT: safe to call multiple times — no duplicate records.
 */
export async function completeOnboarding(userId: string, email: string, input: OnboardingInput): Promise<void> {
  if (!AVATARS_BY_ID[input.avatarId]) {
    return; // Invalid avatar — skip gracefully
  }
  const timezone =
    input.timezone && VALID_TIMEZONE.test(input.timezone) ? input.timezone : "UTC";

  await db.transaction(async (tx) => {
    /* Guard against double-initialization races. */
    const existing = await tx
      .select({ completed: onboardingProfiles.completed })
      .from(onboardingProfiles)
      .where(eq(onboardingProfiles.userId, userId));
    if (existing[0]?.completed) {
      /* Already initialized — safe to return. Enables idempotent retries. */
      return;
    }

    const now = new Date();

    /* 1. Finalize profile identity. */
    await tx
      .update(profiles)
      .set({ displayName: input.displayName.trim(), avatarId: input.avatarId, timezone, updatedAt: now })
      .where(eq(profiles.userId, userId));

    /* 2. Wallet + welcome bonus — ledger-idempotent via onConflictDoNothing. */
    let [wallet] = await tx.select().from(wallets).where(eq(wallets.userId, userId));
    if (!wallet) {
      [wallet] = await tx.insert(wallets).values({ userId }).returning();
    }
    const bonusTxn = await tx
      .insert(walletTransactions)
      .values({
        walletId: wallet.id,
        type: "reward",
        amount: STARTER.welcomeBonusST,
        title: "Welcome bonus",
        referenceType: "onboarding",
        referenceId: "starter",
        idempotencyKey: `PLAYER_WELCOME_BONUS:${userId}`,
      })
      .onConflictDoNothing()
      .returning({ id: walletTransactions.id });
    if (bonusTxn.length > 0) {
      await tx
        .update(wallets)
        .set({ balance: sql`${wallets.balance} + ${STARTER.welcomeBonusST}`, lifetimeEarned: sql`${wallets.lifetimeEarned} + ${STARTER.welcomeBonusST}` })
        .where(eq(wallets.id, wallet.id));
    }

    /* 3. Progression + streak rows. */
    const progressExists = await tx.select({ id: playerProgress.userId }).from(playerProgress).where(eq(playerProgress.userId, userId));
    if (!progressExists[0]) await tx.insert(playerProgress).values({ userId });
    const streakExists = await tx.select({ id: streaksTable.userId }).from(streaksTable).where(eq(streaksTable.userId, userId));
    if (!streakExists[0]) await tx.insert(streaksTable).values({ userId });

    /* 4. Starter achievement. */
    await tx.insert(playerAchievements).values({ userId, achievementId: "starter-badge" }).onConflictDoNothing();

    /* 5. Welcome quest (profile objective pre-satisfied). */
    await tx
      .insert(questProgress)
      .values({ userId, questId: WELCOME_QUEST_ID, counters: { profile_created: 1 } })
      .onConflictDoNothing();

    /* 6. First mission — idempotent guard. */
    const taskExists = await tx.select({ id: tasks.id }).from(tasks).where(eq(tasks.userId, userId)).limit(1);
    if (!taskExists[0]) {
      await tx.insert(tasks).values({
        userId,
        title: starterMissionTitle(input),
        description: "The mission that starts your legend. Complete it to earn your first rewards.",
        category: input.preferredCategories[0] ?? "other",
        difficulty: "easy",
        rarity: "common",
        reward: STARTER.firstMissionReward,
        xpReward: STARTER.firstMissionXP,
        status: "active",
      });
    }

    /* 7. Mark onboarding complete. */
    const values = {
      completed: true,
      primaryGoal: input.primaryGoal.trim().slice(0, 120),
      dailyCommitmentMinutes: input.dailyCommitmentMinutes,
      preferredCategories: input.preferredCategories,
      playstyle: input.playstyle ?? null,
      completedAt: now,
    };
    if (existing[0]) {
      await tx.update(onboardingProfiles).set(values).where(eq(onboardingProfiles.userId, userId));
    } else {
      await tx.insert(onboardingProfiles).values({ userId, ...values });
    }

    /* 8. Activity trail. */
    await tx.insert(activityEvents).values({
      userId,
      type: "PLAYER_CREATED",
      entityId: userId,
      metadata: { displayName: input.displayName.trim(), avatarId: input.avatarId, playstyle: input.playstyle ?? null },
    });
  });

  logSecurity("onboarding_completed", { userId, email: maskEmail(email), avatarId: input.avatarId });
}

export function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!domain) return "***";
  return `${name.slice(0, 2)}${"*".repeat(Math.max(1, name.length - 2))}@${domain}`;
}

/** Essential profile updates for authenticated users. */
export async function updateProfile(
  userId: string,
  patch: { displayName?: string; avatarId?: string; timezone?: string }
): Promise<void> {
  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.displayName !== undefined) {
    // Check display name uniqueness (exclude self)
    const nameCheck = await checkDisplayNameAvailable(patch.displayName, userId);
    if (!nameCheck.available) {
      throw new AppError("DISPLAY_NAME_TAKEN", `The name "${patch.displayName}" is already taken. Try a different one.`);
    }
    values.displayName = patch.displayName.trim();
  }
  if (patch.avatarId !== undefined) {
    if (!AVATARS_BY_ID[patch.avatarId]) return; // Invalid avatar — skip
    values.avatarId = patch.avatarId;
  }
  if (patch.timezone !== undefined) {
    values.timezone = VALID_TIMEZONE.test(patch.timezone) ? patch.timezone : "UTC";
  }
  await db.update(profiles).set(values).where(eq(profiles.userId, userId));
}
