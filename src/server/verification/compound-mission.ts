/**
 * PDR-4 §4.4: Compound Mission Backend
 * Multi-step missions with sequential evidence collection.
 * Each step has its own verification method and evidence requirements.
 */

import "server-only";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { missions, missionEvents, missionSessions, verificationResults } from "@/db/schema";
import { AppError } from "@/server/http";
import { isValidTransition } from "./state-machine";
import { logEvent } from "./observability";
import type { MissionStatus, VerificationMode } from "@/types";

export type CompoundStep = {
  stepIndex: number;
  title: string;
  verificationMode: VerificationMode;
  requiredEvidence: "photo" | "timer" | "pose" | "evidence" | "self_report";
  durationSeconds?: number;
  targetRepetitions?: number;
};

export type CompoundMissionConfig = {
  steps: CompoundStep[];
  requireSequential: boolean; // Steps must be completed in order
  allowParallel: boolean; // Steps can be done in parallel (non-sequential)
};

export type StepProgress = {
  stepIndex: number;
  status: "pending" | "active" | "completed" | "failed";
  missionId?: string;
  verificationStatus?: string;
  startedAt?: string;
  completedAt?: string;
};

export type CompoundProgress = {
  missionId: string;
  totalSteps: number;
  completedSteps: number;
  currentStep: number;
  allComplete: boolean;
  steps: StepProgress[];
};

/**
 * §4.4: Create compound mission from config.
 * Each step becomes a sub-mission linked to the parent.
 */
export async function createCompoundMission(
  parentMissionId: string,
  userId: string,
  config: CompoundMissionConfig
): Promise<{ parentMissionId: string; stepMissionIds: string[] }> {
  const parent = await db.select().from(missions).where(eq(missions.id, parentMissionId)).limit(1);
  if (!parent[0]) throw new AppError("MISSION_NOT_FOUND", "Parent mission not found.");
  if (parent[0].userId !== userId) throw new AppError("FORBIDDEN", "Not your mission.");

  const stepMissionIds: string[] = [];

  for (const step of config.steps) {
    // Ensure verificationMode is a valid DB value (compound steps use their own mode)
    const validModes = ["self_reported", "timed", "focus", "pose", "repetition", "interactive", "evidence", "hybrid", "activity_signal", "review", "photo"];
    const stepMode = (validModes.includes(step.verificationMode) ? step.verificationMode : "self_reported") as "self_reported" | "timed" | "focus" | "pose" | "repetition" | "interactive" | "evidence" | "hybrid" | "activity_signal" | "review" | "photo";

    const [stepMission] = await db.insert(missions).values({
      taskId: parent[0].taskId,
      userId,
      activityType: parent[0].activityType,
      verificationMode: stepMode,
      status: step.stepIndex === 0 ? "ready" : "draft", // First step ready, rest draft
      difficulty: parent[0].difficulty,
      durationSeconds: step.durationSeconds ?? parent[0].durationSeconds,
      targetRepetitions: step.targetRepetitions ?? parent[0].targetRepetitions,
      rewardStPreview: Math.round((parent[0].rewardStPreview ?? 0) / config.steps.length),
      rewardXpPreview: Math.round((parent[0].rewardXpPreview ?? 0) / config.steps.length),
      verificationRules: {
        compoundParentId: parentMissionId,
        stepIndex: step.stepIndex,
        stepTitle: step.title,
        isCompoundStep: true,
      },
    }).returning();

    stepMissionIds.push(stepMission.id);

    logEvent("COMPOUND_STEP_CREATED", {
      stepIndex: step.stepIndex,
      verificationMode: step.verificationMode,
      parentMissionId,
    }, { missionId: stepMission.id, userId });
  }

  // Update parent to track compound state
  await db.update(missions).set({
    verificationRules: {
      isCompound: true,
      totalSteps: config.steps.length,
      stepMissionIds,
      requireSequential: config.requireSequential,
    },
    status: "active",
    startedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(missions.id, parentMissionId));

  return { parentMissionId, stepMissionIds };
}

/**
 * §4.4: Get compound mission progress.
 */
export async function getCompoundProgress(
  parentMissionId: string,
  userId: string
): Promise<CompoundProgress> {
  const parent = await db.select().from(missions).where(eq(missions.id, parentMissionId)).limit(1);
  if (!parent[0]) throw new AppError("MISSION_NOT_FOUND", "Mission not found.");
  if (parent[0].userId !== userId) throw new AppError("FORBIDDEN", "Not your mission.");

  const rules = (parent[0].verificationRules as Record<string, unknown>) ?? {};
  const stepMissionIds = (rules.stepMissionIds as string[]) ?? [];
  const totalSteps = (rules.totalSteps as number) ?? stepMissionIds.length;

  const steps: StepProgress[] = [];
  let completedSteps = 0;
  let currentStep = 0;

  for (let i = 0; i < totalSteps; i++) {
    const stepMissionId = stepMissionIds[i];
    if (!stepMissionId) {
      steps.push({ stepIndex: i, status: "pending" });
      continue;
    }

    const stepMission = await db.select().from(missions).where(eq(missions.id, stepMissionId)).limit(1);
    if (!stepMission[0]) {
      steps.push({ stepIndex: i, status: "pending" });
      continue;
    }

    const stepStatus = stepMission[0].status as MissionStatus;
    let progressStatus: StepProgress["status"] = "pending";

    if (stepStatus === "passed" || stepStatus === "settled") {
      progressStatus = "completed";
      completedSteps++;
    } else if (stepStatus === "failed") {
      progressStatus = "failed";
    } else if (stepStatus === "active") {
      progressStatus = "active";
      currentStep = i;
    } else if (stepStatus === "ready") {
      progressStatus = i === completedSteps ? "active" : "pending";
      if (progressStatus === "active") currentStep = i;
    }

    steps.push({
      stepIndex: i,
      status: progressStatus,
      missionId: stepMissionId,
      verificationStatus: stepStatus,
      startedAt: stepMission[0].startedAt?.toISOString(),
      completedAt: stepMission[0].completedAt?.toISOString(),
    });
  }

  return {
    missionId: parentMissionId,
    totalSteps,
    completedSteps,
    currentStep,
    allComplete: completedSteps === totalSteps,
    steps,
  };
}

/**
 * §4.4: Advance to next step in compound mission.
 */
export async function advanceCompoundStep(
  parentMissionId: string,
  userId: string,
  completedStepIndex: number
): Promise<{ nextStepIndex: number | null; allComplete: boolean }> {
  const progress = await getCompoundProgress(parentMissionId, userId);
  const rules = (await db.select().from(missions).where(eq(missions.id, parentMissionId)).limit(1))[0];
  const verificationRules = (rules?.verificationRules as Record<string, unknown>) ?? {};
  const requireSequential = verificationRules.requireSequential as boolean;
  const stepMissionIds = (verificationRules.stepMissionIds as string[]) ?? [];

  // Mark current step as ready for next
  const nextIndex = completedStepIndex + 1;

  if (nextIndex >= progress.totalSteps) {
    // All steps complete → mark parent as passed
    if (!isValidTransition(rules!.status as MissionStatus, "passed")) {
      throw new AppError("STATE_TRANSITION_INVALID", "Cannot complete compound mission.");
    }

    await db.update(missions).set({
      status: "passed",
      completedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(missions.id, parentMissionId));

    return { nextStepIndex: null, allComplete: true };
  }

  // Activate next step
  if (requireSequential) {
    const nextMissionId = stepMissionIds[nextIndex];
    if (nextMissionId) {
      await db.update(missions).set({
        status: "ready",
        updatedAt: new Date(),
      }).where(eq(missions.id, nextMissionId));
    }
  }

  return { nextStepIndex: nextIndex, allComplete: false };
}
