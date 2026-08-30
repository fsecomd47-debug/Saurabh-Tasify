import "server-only";
import { and, eq, sql, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  missions,
  missionSessions,
  missionEvents,
  verificationResults,
  tasks,
  taskAnalyses,
  activityEvents,
} from "@/db/schema";
import { AppError, logSecurity } from "@/server/http";
import { analyzeTask } from "@/server/ai/task-parser";
import { normalizeTask, extractRepetitions, extractDurationSeconds } from "@/server/ai/normalization";
import { isFeatureEnabled } from "@/server/feature-flags";
import { checkMissionVelocity } from "@/server/anti-abuse/velocity";
import { logEvent } from "@/server/verification/observability";
import type { TaskCategory, Difficulty, MissionStatus, VerificationMode, ActivityType } from "@/types";

/* ──────────────────── DTOs ─────────────────────────────────────── */

export type MissionDTO = {
  id: string;
  taskId: string;
  taskTitle: string;
  activityType: ActivityType;
  verificationMode: VerificationMode;
  status: MissionStatus;
  difficulty: Difficulty;
  durationSeconds: number | null;
  targetRepetitions: number | null;
  rewardStPreview: number;
  rewardXpPreview: number;
  verificationRules: Record<string, unknown>;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type AnalysisDTO = {
  id: string;
  category: TaskCategory;
  difficulty: Difficulty;
  estimatedMinutes: number;
  activityType: ActivityType;
  verificationMode: VerificationMode;
  normalizedTitle: string;
  confidence: number;
  rewardSt: number;
  rewardXp: number;
};

/* ──────────────────── Helpers ──────────────────────────────────── */

function toMissionDTO(row: typeof missions.$inferSelect, taskTitle: string): MissionDTO {
  return {
    id: row.id,
    taskId: row.taskId,
    taskTitle,
    activityType: row.activityType,
    verificationMode: row.verificationMode,
    status: row.status,
    difficulty: row.difficulty,
    durationSeconds: row.durationSeconds,
    targetRepetitions: row.targetRepetitions,
    rewardStPreview: row.rewardStPreview,
    rewardXpPreview: row.rewardXpPreview,
    verificationRules: (row.verificationRules as Record<string, unknown>) ?? {},
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function computeMissionReward(difficulty: Difficulty, minutes: number): { st: number; xp: number } {
  const base: Record<string, { st: number; xp: number }> = {
    easy: { st: 50, xp: 25 },
    medium: { st: 150, xp: 75 },
    hard: { st: 400, xp: 150 },
    elite: { st: 1000, xp: 350 },
  };
  const b = base[difficulty] ?? base.medium;
  const durationFactor = Math.max(1, Math.round(minutes / 30));
  return {
    st: Math.round(b.st * durationFactor * 0.8),
    xp: Math.round(b.xp * durationFactor * 0.8),
  };
}

/* ──────────────────── Analyze Task ─────────────────────────────── */

export async function analyzeAndStore(taskId: string, userId: string): Promise<AnalysisDTO> {
  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!task[0]) throw new AppError("TASK_NOT_FOUND", "Mission not found.");
  if (task[0].userId !== userId) throw new AppError("FORBIDDEN", "Not your mission.");

  // §9: Task normalization pipeline — normalize before AI classification
  const normalized = normalizeTask(task[0].title);
  logEvent("TASK_NORMALIZED", {
    rawTitle: task[0].title,
    canonicalActivity: normalized.canonicalActivity?.id,
    quantity: normalized.quantity,
  }, { missionId: taskId, userId });

  // Check if already analyzed (unique constraint is on normalized_input)
  const normalizedInput = task[0].title.toLowerCase().trim().replace(/\s+/g, " ");
  const existing = await db.select().from(taskAnalyses)
    .where(eq(taskAnalyses.normalizedInput, normalizedInput))
    .limit(1);
  if (existing[0]) {
    logEvent("TASK_ANALYZED", { provider: "cache", confidence: existing[0].confidence }, { missionId: taskId, userId });
    return {
      id: existing[0].id,
      category: existing[0].category,
      difficulty: existing[0].difficulty,
      estimatedMinutes: existing[0].estimatedMinutes,
      activityType: existing[0].activityType,
      verificationMode: existing[0].verificationMode,
      normalizedTitle: existing[0].normalizedInput,
      confidence: existing[0].confidence,
      rewardSt: existing[0].baseRewardSt,
      rewardXp: existing[0].baseRewardXp,
    };
  }

  const analysis = await analyzeTask({
    taskId,
    title: task[0].title,
    description: task[0].description ?? undefined,
  });

  logEvent("TASK_ANALYZED", {
    provider: "ai",
    canonicalActivity: analysis.canonicalActivity,
    category: analysis.category,
    difficulty: analysis.difficulty,
    activityType: analysis.activityType,
    verificationMode: analysis.verificationMode,
    confidence: analysis.confidence,
  }, { missionId: taskId, userId });

  const reward = computeMissionReward(analysis.difficulty, analysis.estimatedMinutes);

  // Store analysis
  const [stored] = await db.insert(taskAnalyses).values({
    id: taskId, // Use task ID as analysis ID for simplicity
    normalizedInput,
    category: analysis.category,
    difficulty: analysis.difficulty,
    activityType: analysis.activityType,
    verificationMode: analysis.verificationMode,
    estimatedMinutes: analysis.estimatedMinutes,
    baseRewardSt: reward.st,
    baseRewardXp: reward.xp,
    aiProvider: "grok",
    confidence: analysis.confidence,
  }).returning();

  return {
    id: stored.id,
    category: stored.category,
    difficulty: stored.difficulty,
    estimatedMinutes: stored.estimatedMinutes,
    activityType: stored.activityType,
    verificationMode: stored.verificationMode,
    normalizedTitle: stored.normalizedInput,
    confidence: stored.confidence,
    rewardSt: stored.baseRewardSt,
    rewardXp: stored.baseRewardXp,
  };
}

/* ──────────────────── Create Mission ───────────────────────────── */

export async function createMission(taskId: string, userId: string): Promise<MissionDTO> {
  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!task[0]) throw new AppError("TASK_NOT_FOUND", "Mission not found.");
  if (task[0].userId !== userId) throw new AppError("FORBIDDEN", "Not your mission.");

  // Daily mission limit: max 20 per day
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayCount = await db.select({ count: sql<number>`count(*)::int` })
    .from(missions)
    .where(and(
      eq(missions.userId, userId),
      sql`${missions.createdAt} >= ${todayStart.toISOString()}`
    ));
  if ((todayCount[0]?.count ?? 0) >= 20) {
    throw new AppError("RATE_LIMITED", "Daily mission limit reached (20/day). Try again tomorrow.");
  }

  // Velocity check: cooldown, hourly, daily limits
  const existingAnalysis = await db.select().from(taskAnalyses).where(eq(taskAnalyses.id, taskId)).limit(1);
  if (existingAnalysis[0]) {
    const velocity = await checkMissionVelocity(userId, existingAnalysis[0].activityType as ActivityType);
    if (!velocity.allowed) {
      throw new AppError("RATE_LIMITED", `Mission velocity limit: ${velocity.reason}. Please wait.`);
    }
  }

  // Check if mission already exists for this task
  const existingMission = await db.select().from(missions)
    .where(eq(missions.taskId, taskId))
    .limit(1);
  if (existingMission[0]) {
    return toMissionDTO(existingMission[0], task[0].title);
  }

  // Get or create analysis
  let analysis = await db.select().from(taskAnalyses).where(eq(taskAnalyses.id, taskId)).limit(1);
  if (!analysis[0]) {
    await analyzeAndStore(taskId, userId);
    analysis = await db.select().from(taskAnalyses).where(eq(taskAnalyses.id, taskId)).limit(1);
  }

  const a = analysis[0];
  if (!a) throw new AppError("ANALYSIS_FAILED", "Could not analyze mission.");

  // §10: Use normalization pipeline for target extraction
  const normalized = normalizeTask(task[0].title);

  const durationSeconds = a.activityType === "focus" || a.activityType === "timer"
    ? (extractDurationSeconds(task[0].title) ?? a.estimatedMinutes * 60)
    : undefined;

  const targetReps = a.activityType === "repetition"
    ? (normalized.quantity?.unit === "repetition" ? normalized.quantity.value : extractRepetitions(task[0].title))
    : undefined;

  // Feasibility validation: reject impossible tasks
  if (durationSeconds && durationSeconds > 8 * 3600) {
    throw new AppError("VALIDATION_ERROR", "Mission duration cannot exceed 8 hours.");
  }
  if (durationSeconds && durationSeconds < 60) {
    throw new AppError("VALIDATION_ERROR", "Mission duration must be at least 1 minute.");
  }
  if (targetReps && targetReps > 1000) {
    throw new AppError("VALIDATION_ERROR", "Repetition target cannot exceed 1,000.");
  }
  if (targetReps && targetReps < 1) {
    throw new AppError("VALIDATION_ERROR", "Repetition target must be at least 1.");
  }

  // §39-45: Determine verification flow hints from task analysis.
  // These guide the client UI to the correct verification experience.
  const taskText = task[0].title.toLowerCase();
  const verificationRules: Record<string, unknown> = {};

  // §39-40: Object counting flow — "put N books on shelf"
  if (
    a.activityType === "visual_result" &&
    normalized.quantity &&
    (taskText.includes("book") || taskText.includes("shelf") || taskText.includes("place") || taskText.includes("put") || taskText.includes("arrange") || taskText.includes("stack"))
  ) {
    verificationRules.flow = "object_count";
    verificationRules.expectedObjectCount = normalized.quantity.value;
    verificationRules.objectCategory = taskText.includes("book") ? "book" : "object";
  }
  // §41-43: Before/after scene comparison — "clean desk", "organize room"
  else if (
    a.activityType === "visual_result" &&
    (taskText.includes("clean") || taskText.includes("organize") || taskText.includes("tidy") || taskText.includes("declutter") || taskText.includes("neaten"))
  ) {
    verificationRules.flow = "before_after";
    verificationRules.steps = ["before", "after"];
  }
  // §44-45: Document/OCR flow — "make $100", receipt, invoice
  else if (
    a.activityType === "external_result" ||
    (taskText.includes("receipt") || taskText.includes("invoice") || taskText.includes("document") || taskText.includes("proof") || taskText.includes("screenshot"))
  ) {
    verificationRules.flow = "document";
    verificationRules.extractFields = ["date", "amount"];
  }
  // Default: no specific flow needed
  else if (a.activityType === "visual_result") {
    verificationRules.flow = "photo";
  }

  const [mission] = await db.insert(missions).values({
    taskId,
    userId,
    activityType: a.activityType,
    verificationMode: a.verificationMode,
    status: "ready",
    difficulty: a.difficulty,
    durationSeconds: durationSeconds ?? null,
    targetRepetitions: targetReps ?? null,
    rewardStPreview: a.baseRewardSt,
    rewardXpPreview: a.baseRewardXp,
    verificationRules,
  }).returning();

  logEvent("MISSION_CREATED", {
    difficulty: a.difficulty,
    verificationMode: a.verificationMode,
    activityType: a.activityType,
    durationSeconds,
    targetReps,
  }, { missionId: mission.id, userId });

  // Log activity
  await db.insert(activityEvents).values({
    userId,
    type: "MISSION_CREATED",
    entityId: mission.id,
    metadata: { taskId, difficulty: a.difficulty, verificationMode: a.verificationMode },
  });

  return toMissionDTO(mission, task[0].title);
}

/* ──────────────────── Start Mission ────────────────────────────── */

export async function startMission(missionId: string, userId: string): Promise<MissionDTO> {
  const mission = await db.select().from(missions).where(eq(missions.id, missionId)).limit(1);
  if (!mission[0]) throw new AppError("MISSION_NOT_FOUND", "Mission not found.");
  if (mission[0].userId !== userId) throw new AppError("FORBIDDEN", "Not your mission.");

  const task = await db.select().from(tasks).where(eq(tasks.id, mission[0].taskId)).limit(1);
  const taskTitle = task[0]?.title ?? "Unknown";

  // Allow restart from ready, failed, or cancelled states; return as-is if already active
  const terminalStatuses: MissionStatus[] = ["passed", "expired"];
  if (terminalStatuses.includes(mission[0].status as MissionStatus)) {
    throw new AppError("MISSION_NOT_READY", `Mission is ${mission[0].status}, not ready.`);
  }

  // If already active, return existing without creating duplicate sessions/events
  if (mission[0].status === "active") {
    return toMissionDTO(mission[0], taskTitle);
  }

  const [updated] = await db.update(missions)
    .set({ status: "active", startedAt: new Date(), updatedAt: new Date() })
    .where(eq(missions.id, missionId))
    .returning();

  if (!updated) throw new AppError("MISSION_START_FAILED", "Could not start mission.");

  logEvent("MISSION_STARTED", {
    verificationMode: mission[0].verificationMode,
    activityType: mission[0].activityType,
  }, { missionId, userId });

  // Create session (only if no active session exists)
  const existingSession = await db.select().from(missionSessions)
    .where(and(eq(missionSessions.missionId, missionId), eq(missionSessions.status, "active")))
    .limit(1);

  let session;
  if (existingSession[0]) {
    session = existingSession[0];
  } else {
    [session] = await db.insert(missionSessions).values({
      missionId,
      status: "active",
    }).returning();
  }

  // Insert initial event only if none exist for this mission
  const existingEvents = await db.select({ id: missionEvents.id })
    .from(missionEvents)
    .where(eq(missionEvents.missionId, missionId))
    .limit(1);

  if (existingEvents.length === 0) {
    await db.insert(missionEvents).values({
      missionId,
      sessionId: session.id,
      type: "SESSION_STARTED",
      metadata: {
        verificationMode: mission[0].verificationMode,
        activityType: mission[0].activityType,
      },
    });
  }

  return toMissionDTO(updated, taskTitle);
}

/* ──────────────────── Cancel Mission ───────────────────────────── */

export async function cancelMission(missionId: string, userId: string): Promise<MissionDTO> {
  const mission = await db.select().from(missions).where(eq(missions.id, missionId)).limit(1);
  if (!mission[0]) throw new AppError("MISSION_NOT_FOUND", "Mission not found.");
  if (mission[0].userId !== userId) throw new AppError("FORBIDDEN", "Not your mission.");

  const terminalStatuses: MissionStatus[] = ["passed", "failed", "cancelled", "expired"];
  if (terminalStatuses.includes(mission[0].status as MissionStatus)) {
    throw new AppError("MISSION_TERMINAL", `Mission is already ${mission[0].status}.`);
  }

  const task = await db.select().from(tasks).where(eq(tasks.id, mission[0].taskId)).limit(1);
  const taskTitle = task[0]?.title ?? "Unknown";

  const [updated] = await db.update(missions)
    .set({ status: "cancelled", completedAt: new Date(), updatedAt: new Date() })
    .where(eq(missions.id, missionId))
    .returning();

  return toMissionDTO(updated, taskTitle);
}

/* ──────────────────── Get Missions ─────────────────────────────── */

export async function getUserMissions(userId: string, status?: MissionStatus): Promise<MissionDTO[]> {
  const conditions = [eq(missions.userId, userId)];
  if (status) conditions.push(eq(missions.status, status));

  const rows = await db
    .select({ mission: missions, taskTitle: tasks.title })
    .from(missions)
    .innerJoin(tasks, eq(tasks.id, missions.taskId))
    .where(and(...conditions))
    .orderBy(desc(missions.createdAt))
    .limit(20);

  return rows.map((r) => toMissionDTO(r.mission, r.taskTitle));
}

export async function getMission(missionId: string, userId: string): Promise<MissionDTO> {
  const rows = await db
    .select({ mission: missions, taskTitle: tasks.title })
    .from(missions)
    .innerJoin(tasks, eq(tasks.id, missions.taskId))
    .where(and(eq(missions.id, missionId), eq(missions.userId, userId)))
    .limit(1);

  if (!rows[0]) throw new AppError("MISSION_NOT_FOUND", "Mission not found.");
  return toMissionDTO(rows[0].mission, rows[0].taskTitle);
}

export async function getActiveMission(userId: string): Promise<MissionDTO | null> {
  const rows = await db
    .select({ mission: missions, taskTitle: tasks.title })
    .from(missions)
    .innerJoin(tasks, eq(tasks.id, missions.taskId))
    .where(and(eq(missions.userId, userId), eq(missions.status, "active")))
    .orderBy(desc(missions.startedAt))
    .limit(1);

  return rows[0] ? toMissionDTO(rows[0].mission, rows[0].taskTitle) : null;
}
