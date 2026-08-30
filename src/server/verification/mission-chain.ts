/**
 * PDR-4.4 §64: Compound Mission Chain Service
 * Manages multi-step missions where completing one step unlocks the next.
 * Provides progress tracking, step validation, and chain completion.
 */

import "server-only";
import { eq, and, sql, asc } from "drizzle-orm";
import { db } from "@/db";
import { missions, missionSessions, missionEvents, tasks, activityEvents } from "@/db/schema";
import { AppError, logSecurity } from "@/server/http";
import { isValidTransition } from "./state-machine";
import type { MissionStatus, VerificationMode, ActivityType, Difficulty } from "@/types";

export type ChainStep = {
  missionId: string;
  taskId: string;
  taskTitle: string;
  verificationMode: VerificationMode;
  activityType: ActivityType;
  difficulty: Difficulty;
  targetRepetitions?: number;
  durationSeconds?: number;
  rewardStPreview: number;
  rewardXpPreview: number;
  status: MissionStatus;
  orderIndex: number;
};

export type ChainProgress = {
  chainId: string;
  steps: ChainStep[];
  totalSteps: number;
  completedSteps: number;
  currentStepIndex: number;
  allCompleted: boolean;
  totalSt: number;
  totalXp: number;
  earnedSt: number;
  earnedXp: number;
};

export type ChainCreateInput = {
  userId: string;
  taskIds: string[];
  allStepsRequired?: boolean;
};

/**
 * Create a compound mission chain from multiple tasks.
 * Each task becomes a step in the chain.
 */
export async function createMissionChain(input: ChainCreateInput): Promise<ChainProgress> {
  const { userId, taskIds } = input;

  if (taskIds.length < 2) {
    throw new AppError("VALIDATION_ERROR", "Chain requires at least 2 tasks.");
  }
  if (taskIds.length > 5) {
    throw new AppError("VALIDATION_ERROR", "Chain cannot exceed 5 tasks.");
  }

  // Load all tasks
  const taskRows = await db.select().from(tasks)
    .where(and(
      eq(tasks.userId, userId),
      sql`${tasks.id} IN ${taskIds}`
    ));

  if (taskRows.length !== taskIds.length) {
    throw new AppError("TASK_NOT_FOUND", "One or more tasks not found.");
  }

  // Create missions for each task with chain metadata
  const chainId = `chain_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const steps: ChainStep[] = [];

  for (let i = 0; i < taskIds.length; i++) {
    const task = taskRows.find((t) => t.id === taskIds[i]);
    if (!task) continue;

    // Check if mission already exists for this task
    const existing = await db.select().from(missions)
      .where(eq(missions.taskId, task.id))
      .limit(1);

    if (existing[0]) {
      steps.push({
        missionId: existing[0].id,
        taskId: task.id,
        taskTitle: task.title,
        verificationMode: existing[0].verificationMode,
        activityType: existing[0].activityType,
        difficulty: existing[0].difficulty,
        targetRepetitions: existing[0].targetRepetitions ?? undefined,
        durationSeconds: existing[0].durationSeconds ?? undefined,
        rewardStPreview: existing[0].rewardStPreview,
        rewardXpPreview: existing[0].rewardXpPreview,
        status: existing[0].status as MissionStatus,
        orderIndex: i,
      });
      continue;
    }

    // Import analyzeTask dynamically to avoid circular deps
    const { analyzeTask } = await import("@/server/ai/task-parser");
    const { normalizeTask, extractRepetitions, extractDurationSeconds } = await import("@/server/ai/normalization");

    const normalized = normalizeTask(task.title);
    const analysis = await analyzeTask({
      taskId: task.id,
      title: task.title,
      description: task.description ?? undefined,
    });

    const durationSeconds = analysis.activityType === "focus" || analysis.activityType === "timer"
      ? (extractDurationSeconds(task.title) ?? analysis.estimatedMinutes * 60)
      : undefined;

    const targetReps = analysis.activityType === "repetition"
      ? (normalized.quantity?.unit === "repetition" ? normalized.quantity.value : extractRepetitions(task.title))
      : undefined;

    // Compute reward
    const base: Record<string, { st: number; xp: number }> = {
      easy: { st: 50, xp: 25 },
      medium: { st: 150, xp: 75 },
      hard: { st: 400, xp: 150 },
      elite: { st: 1000, xp: 350 },
    };
    const b = base[analysis.difficulty] ?? base.medium;
    const durationFactor = Math.max(1, Math.round(analysis.estimatedMinutes / 30));
    const st = Math.round(b.st * durationFactor * 0.8);
    const xp = Math.round(b.xp * durationFactor * 0.8);

    const [mission] = await db.insert(missions).values({
      taskId: task.id,
      userId,
      activityType: analysis.activityType,
      verificationMode: analysis.verificationMode,
      status: i === 0 ? "ready" : "draft",
      difficulty: analysis.difficulty,
      durationSeconds: durationSeconds ?? null,
      targetRepetitions: targetReps ?? null,
      rewardStPreview: st,
      rewardXpPreview: xp,
      verificationRules: {
        chainId,
        chainStep: i,
        totalSteps: taskIds.length,
      },
    }).returning();

    steps.push({
      missionId: mission.id,
      taskId: task.id,
      taskTitle: task.title,
      verificationMode: analysis.verificationMode,
      activityType: analysis.activityType,
      difficulty: analysis.difficulty,
      targetRepetitions: targetReps ?? undefined,
      durationSeconds: durationSeconds ?? undefined,
      rewardStPreview: st,
      rewardXpPreview: xp,
      status: "ready",
      orderIndex: i,
    });
  }

  // Store chain metadata as activity event
  await db.insert(activityEvents).values({
    userId,
    type: "MISSION_CHAIN_CREATED",
    entityId: chainId,
    metadata: {
      chainId,
      stepCount: steps.length,
      missionIds: steps.map((s) => s.missionId),
    },
  });

  const totalSt = steps.reduce((sum, s) => sum + s.rewardStPreview, 0);
  const totalXp = steps.reduce((sum, s) => sum + s.rewardXpPreview, 0);

  return {
    chainId,
    steps,
    totalSteps: steps.length,
    completedSteps: 0,
    currentStepIndex: 0,
    allCompleted: false,
    totalSt,
    totalXp,
    earnedSt: 0,
    earnedXp: 0,
  };
}

/**
 * Get chain progress for a mission that is part of a chain.
 */
export async function getChainProgress(missionId: string, userId: string): Promise<ChainProgress | null> {
  const mission = await db.select().from(missions).where(eq(missions.id, missionId)).limit(1);
  if (!mission[0]) throw new AppError("MISSION_NOT_FOUND", "Mission not found.");
  if (mission[0].userId !== userId) throw new AppError("FORBIDDEN", "Not your mission.");

  const rules = mission[0].verificationRules as Record<string, unknown>;
  const chainId = rules?.chainId as string | undefined;
  if (!chainId) return null;

  // Get all missions in this chain
  const chainMissions = await db.select().from(missions)
    .where(and(
      eq(missions.userId, userId),
      sql`${missions.verificationRules}->>'chainId' = ${chainId}`
    ))
    .orderBy(sql`${missions.verificationRules}->>'chainStep' asc`);

  if (chainMissions.length === 0) return null;

  const steps: ChainStep[] = chainMissions.map((m, i) => ({
    missionId: m.id,
    taskId: m.taskId,
    taskTitle: "", // Will be filled below
    verificationMode: m.verificationMode,
    activityType: m.activityType,
    difficulty: m.difficulty,
    targetRepetitions: m.targetRepetitions ?? undefined,
    durationSeconds: m.durationSeconds ?? undefined,
    rewardStPreview: m.rewardStPreview,
    rewardXpPreview: m.rewardXpPreview,
    status: m.status as MissionStatus,
    orderIndex: (m.verificationRules as Record<string, unknown>)?.chainStep as number ?? i,
  }));

  // Fill task titles
  const taskIds = steps.map((s) => s.taskId);
  const taskRows = await db.select().from(tasks)
    .where(sql`${tasks.id} IN ${taskIds}`);

  for (const step of steps) {
    const task = taskRows.find((t) => t.id === step.taskId);
    step.taskTitle = task?.title ?? "Unknown Task";
  }

  const completedCount = steps.filter((s) => s.status === "passed" || s.status === "settled").length;
  const currentIdx = steps.findIndex((s) => s.status === "ready" || s.status === "active");

  const totalSt = steps.reduce((sum, s) => sum + s.rewardStPreview, 0);
  const totalXp = steps.reduce((sum, s) => sum + s.rewardXpPreview, 0);
  const earnedSt = steps
    .filter((s) => s.status === "passed" || s.status === "settled")
    .reduce((sum, s) => sum + s.rewardStPreview, 0);
  const earnedXp = steps
    .filter((s) => s.status === "passed" || s.status === "settled")
    .reduce((sum, s) => sum + s.rewardXpPreview, 0);

  return {
    chainId,
    steps,
    totalSteps: steps.length,
    completedSteps: completedCount,
    currentStepIndex: currentIdx >= 0 ? currentIdx : steps.length,
    allCompleted: completedCount === steps.length,
    totalSt,
    totalXp,
    earnedSt,
    earnedXp,
  };
}

/**
 * Advance the chain to the next step after completing the current one.
 */
export async function advanceChain(
  missionId: string,
  userId: string
): Promise<{ nextMissionId: string | null; chainComplete: boolean }> {
  const progress = await getChainProgress(missionId, userId);
  if (!progress) return { nextMissionId: null, chainComplete: false };

  // Find next incomplete step
  const nextStep = progress.steps.find((s) => s.status === "draft");
  if (!nextStep) return { nextMissionId: null, chainComplete: true };

  // Activate next step
  await db.update(missions)
    .set({ status: "ready", updatedAt: new Date() })
    .where(eq(missions.id, nextStep.missionId));

  logSecurity("chain_advanced", {
    chainId: progress.chainId,
    completedMission: missionId,
    nextMission: nextStep.missionId,
    completedSteps: progress.completedSteps + 1,
    totalSteps: progress.totalSteps,
  });

  return { nextMissionId: nextStep.missionId, chainComplete: false };
}

/**
 * Get all chains for a user.
 */
export async function getUserChains(userId: string): Promise<ChainProgress[]> {
  // Find all chain IDs from activity events
  const chainEvents = await db.select({ entityId: activityEvents.entityId })
    .from(activityEvents)
    .where(and(
      eq(activityEvents.userId, userId),
      eq(activityEvents.type, "MISSION_CHAIN_CREATED")
    ));

  const chainIds = chainEvents.map((e) => e.entityId).filter(Boolean) as string[];
  if (chainIds.length === 0) return [];

  const chains: ChainProgress[] = [];
  for (const chainId of chainIds) {
    // Get first mission of chain
    const firstMission = await db.select({ id: missions.id })
      .from(missions)
      .where(and(
        eq(missions.userId, userId),
        sql`${missions.verificationRules}->>'chainId' = ${chainId}`
      ))
      .limit(1);

    if (firstMission[0]) {
      const progress = await getChainProgress(firstMission[0].id, userId);
      if (progress) chains.push(progress);
    }
  }

  return chains;
}
