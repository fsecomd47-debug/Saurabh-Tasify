/**
 * PDR-4 §57-58: Adaptive Difficulty Engine
 * Uses historical mission data to personalize difficulty recommendations.
 * Never secretly manipulates rewards — only suggests appropriate challenges.
 */

import "server-only";
import { eq, and, sql, desc } from "drizzle-orm";
import { db } from "@/db";
import { missions, tasks, activityEvents } from "@/db/schema";
import type { Difficulty, ActivityType } from "@/types";

export type DifficultyRecommendation = {
  suggestedDifficulty: Difficulty;
  reason: string;
  confidence: number;
  historicalData: {
    missionsCompleted: number;
    averageSuccessRate: number;
    recentTrend: "improving" | "stable" | "declining";
    averageCompletionTime: number;
  };
};

/**
 * §57-58: Analyze user history and recommend appropriate difficulty.
 * Does NOT modify rewards — only provides a suggestion.
 */
export async function getAdaptiveDifficulty(
  userId: string,
  activityType: ActivityType,
  currentDifficulty: Difficulty
): Promise<DifficultyRecommendation> {
  // Get recent missions of same activity type (last 20)
  const recentMissions = await db.select({
    status: missions.status,
    difficulty: missions.difficulty,
    durationSeconds: missions.durationSeconds,
    targetRepetitions: missions.targetRepetitions,
    completedAt: missions.completedAt,
    startedAt: missions.startedAt,
  })
    .from(missions)
    .innerJoin(tasks, eq(tasks.id, missions.taskId))
    .where(and(
      eq(missions.userId, userId),
      eq(missions.activityType, activityType),
      sql`${missions.status} IN ('passed', 'settled', 'failed')`
    ))
    .orderBy(desc(missions.completedAt))
    .limit(20);

  if (recentMissions.length < 3) {
    return {
      suggestedDifficulty: currentDifficulty,
      reason: "Not enough history. Keep going to get personalized recommendations.",
      confidence: 0.3,
      historicalData: {
        missionsCompleted: recentMissions.length,
        averageSuccessRate: 0,
        recentTrend: "stable",
        averageCompletionTime: 0,
      },
    };
  }

  // Calculate success rate
  const successes = recentMissions.filter((m) => m.status === "passed" || m.status === "settled").length;
  const successRate = successes / recentMissions.length;

  // Calculate average completion time
  const completedMissions = recentMissions.filter((m) => m.startedAt && m.completedAt);
  const avgCompletionTime = completedMissions.length > 0
    ? completedMissions.reduce((sum, m) => {
        const duration = (m.completedAt!.getTime() - m.startedAt!.getTime()) / 1000;
        return sum + duration;
      }, 0) / completedMissions.length
    : 0;

  // Analyze trend (last 5 vs previous 5)
  const recent5 = recentMissions.slice(0, 5);
  const previous5 = recentMissions.slice(5, 10);
  const recentSuccessRate = recent5.filter((m) => m.status === "passed" || m.status === "settled").length / Math.max(1, recent5.length);
  const previousSuccessRate = previous5.length > 0
    ? previous5.filter((m) => m.status === "passed" || m.status === "settled").length / previous5.length
    : recentSuccessRate;

  let trend: "improving" | "stable" | "declining" = "stable";
  if (recentSuccessRate > previousSuccessRate + 0.1) trend = "improving";
  else if (recentSuccessRate < previousSuccessRate - 0.1) trend = "declining";

  // §57: Adaptive logic
  const difficultyOrder: Difficulty[] = ["easy", "medium", "hard", "elite"];
  const currentIndex = difficultyOrder.indexOf(currentDifficulty);

  let suggestedDifficulty = currentDifficulty;
  let reason = "";
  let confidence = 0.6;

  if (successRate >= 0.85 && trend !== "declining" && currentIndex < 3) {
    // Consistently succeeding → suggest harder
    suggestedDifficulty = difficultyOrder[currentIndex + 1];
    reason = "You've been crushing it! Ready for a bigger challenge.";
    confidence = 0.75;
  } else if (successRate <= 0.4 && currentIndex > 0) {
    // Struggling → suggest easier
    suggestedDifficulty = difficultyOrder[currentIndex - 1];
    reason = "Let's build consistency with a slightly easier challenge.";
    confidence = 0.7;
  } else if (trend === "declining" && currentIndex > 0) {
    // Performance declining → suggest easier
    suggestedDifficulty = difficultyOrder[currentIndex - 1];
    reason = "Let's try a slightly easier challenge to rebuild momentum.";
    confidence = 0.65;
  } else if (trend === "improving" && successRate >= 0.7 && currentIndex < 3) {
    // Improving → nudge harder
    suggestedDifficulty = difficultyOrder[currentIndex + 1];
    reason = "You're improving! Consider stepping up.";
    confidence = 0.6;
  } else {
    suggestedDifficulty = currentDifficulty;
    reason = "Current difficulty looks right for where you are.";
    confidence = 0.5;
  }

  return {
    suggestedDifficulty,
    reason,
    confidence,
    historicalData: {
      missionsCompleted: recentMissions.length,
      averageSuccessRate: Math.round(successRate * 100) / 100,
      recentTrend: trend,
      averageCompletionTime: Math.round(avgCompletionTime),
    },
  };
}

/**
 * §58: Get suggested next mission after completion.
 */
export async function getSuggestedNextMission(
  userId: string,
  completedMissionId: string
): Promise<{
  suggestedActivity: string;
  suggestedDifficulty: Difficulty;
  reason: string;
} | null> {
  const completed = await db.select().from(missions).where(eq(missions.id, completedMissionId)).limit(1);
  if (!completed[0]) return null;

  const recommendation = await getAdaptiveDifficulty(
    userId,
    completed[0].activityType as ActivityType,
    completed[0].difficulty as Difficulty
  );

  return {
    suggestedActivity: completed[0].activityType,
    suggestedDifficulty: recommendation.suggestedDifficulty,
    reason: recommendation.reason,
  };
}
