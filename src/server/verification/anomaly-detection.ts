import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { missions, missionEvents, visionEvents, visionResults, activityEvents } from "@/db/schema";
import { logSecurity } from "@/server/http";

/**
 * PDR-4.3 §55-58: Anomaly Detection Engine
 * Detects suspicious patterns in verification behavior.
 * Uses statistical analysis of repetition patterns, timing, and evidence signals.
 */

export type AnomalyLevel = "normal" | "suspicious" | "requires_retry" | "review" | "restricted";

export type AnomalyResult = {
  level: AnomalyLevel;
  signals: string[];
  confidence: number;
  recommendation: string;
};

/**
 * Analyze repetition timing patterns for anomalies.
 * Detects: too-perfect timing, impossible consistency, acceleration patterns.
 */
export async function analyzeRepetitionAnomaly(
  missionId: string
): Promise<AnomalyResult> {
  const events = await db
    .select({ timestamp: missionEvents.timestamp, metadata: missionEvents.metadata })
    .from(missionEvents)
    .where(and(
      eq(missionEvents.missionId, missionId),
      eq(missionEvents.type, "REP_CONFIRMED")
    ))
    .orderBy(sql`${missionEvents.timestamp} asc`);

  if (events.length < 3) {
    return { level: "normal", signals: [], confidence: 1, recommendation: "" };
  }

  const signals: string[] = [];
  let anomalyLevel: AnomalyLevel = "normal";
  let confidence = 1;

  // Calculate inter-rep intervals
  const intervals: number[] = [];
  for (let i = 1; i < events.length; i++) {
    intervals.push(events[i].timestamp.getTime() - events[i - 1].timestamp.getTime());
  }

  if (intervals.length < 2) {
    return { level: "normal", signals: [], confidence: 1, recommendation: "" };
  }

  // 1. Check for impossible consistency (bot-like)
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance = intervals.reduce((sum, g) => sum + Math.pow(g - mean, 2), 0) / intervals.length;
  const stddev = Math.sqrt(variance);
  const cv = mean > 0 ? stddev / mean : 0;

  if (cv < 0.02 && intervals.length >= 5) {
    signals.push("IMPOSSIBLE_CONSISTENCY");
    anomalyLevel = "suspicious";
    confidence *= 0.7;
  }

  // 2. Check for acceleration pattern (speeding up unnaturally)
  if (intervals.length >= 4) {
    const firstHalf = intervals.slice(0, Math.floor(intervals.length / 2));
    const secondHalf = intervals.slice(Math.floor(intervals.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    if (secondAvg < firstAvg * 0.4) {
      signals.push("SUSPICIOUS_ACCELERATION");
      anomalyLevel = "suspicious";
      confidence *= 0.8;
    }
  }

  // 3. Check for impossible rep rate (> 2 reps/second sustained)
  const fastIntervals = intervals.filter((i) => i < 500);
  if (fastIntervals.length > intervals.length * 0.5) {
    signals.push("IMPOSSIBLE_TEMPO");
    anomalyLevel = "requires_retry";
    confidence *= 0.6;
  }

  // 4. Check for timestamp manipulation (non-monotonic)
  for (let i = 1; i < events.length; i++) {
    if (events[i].timestamp.getTime() <= events[i - 1].timestamp.getTime()) {
      signals.push("TIMESTAMP_MANIPULATION");
      anomalyLevel = "review";
      confidence *= 0.5;
      break;
    }
  }

  return {
    level: anomalyLevel,
    signals,
    confidence,
    recommendation: signals.length > 0
      ? "Evidence shows unusual patterns. Please try again with natural movement."
      : "",
  };
}

/**
 * Analyze focus session anomalies.
 * Detects: too-perfect presence, impossible session continuity.
 */
export async function analyzeFocusAnomaly(
  missionId: string
): Promise<AnomalyResult> {
  const events = await db
    .select({ type: missionEvents.type, timestamp: missionEvents.timestamp })
    .from(missionEvents)
    .where(eq(missionEvents.missionId, missionId))
    .orderBy(sql`${missionEvents.timestamp} asc`);

  const signals: string[] = [];
  let anomalyLevel: AnomalyLevel = "normal";
  let confidence = 1;

  const presenceEvents = events.filter((e) => e.type === "PRESENCE_CONFIRMED");
  const interruptionEvents = events.filter((e) => e.type === "INTERRUPTION");

  // 1. Check for zero interruptions over long session (> 30 min)
  if (presenceEvents.length > 6 && interruptionEvents.length === 0) {
    signals.push("NO_INTERRUPTIONS_LONG_SESSION");
    anomalyLevel = "suspicious";
    confidence *= 0.85;
  }

  // 2. Check for perfectly timed presence samples
  if (presenceEvents.length >= 3) {
    const presenceIntervals: number[] = [];
    for (let i = 1; i < presenceEvents.length; i++) {
      presenceIntervals.push(
        presenceEvents[i].timestamp.getTime() - presenceEvents[i - 1].timestamp.getTime()
      );
    }
    const meanInterval = presenceIntervals.reduce((a, b) => a + b, 0) / presenceIntervals.length;
    const intervalVariance = presenceIntervals.reduce((sum, g) => sum + Math.pow(g - meanInterval, 2), 0) / presenceIntervals.length;
    const intervalCV = meanInterval > 0 ? Math.sqrt(intervalVariance) / meanInterval : 0;

    if (intervalCV < 0.03 && presenceIntervals.length >= 4) {
      signals.push("PERFECTLY_TIMED_PRESENCE");
      anomalyLevel = "suspicious";
      confidence *= 0.8;
    }
  }

  return {
    level: anomalyLevel,
    signals,
    confidence,
    recommendation: signals.length > 0
      ? "Session patterns seem unusual. Please ensure you're genuinely present during focus sessions."
      : "",
  };
}

/**
 * Analyze vision evidence anomalies.
 * Detects: low quality submissions, suspicious confidence patterns.
 */
export async function analyzeVisionAnomaly(
  missionId: string
): Promise<AnomalyResult> {
  const results = await db
    .select()
    .from(visionResults)
    .where(eq(visionResults.missionId, missionId))
    .orderBy(sql`${visionResults.createdAt} asc`);

  const signals: string[] = [];
  let anomalyLevel: AnomalyLevel = "normal";
  let confidence = 1;

  if (results.length === 0) {
    return { level: "normal", signals: [], confidence: 1, recommendation: "" };
  }

  // 1. Check for consistently low quality
  const lowQualityCount = results.filter((r) =>
    r.evidenceClass === "insufficient"
  ).length;
  if (lowQualityCount >= 3) {
    signals.push("REPEATED_LOW_QUALITY");
    anomalyLevel = "requires_retry";
    confidence *= 0.7;
  }

  // 2. Check for evidence resubmission patterns
  const unsupportedCount = results.filter((r) => r.status === "unsupported").length;
  if (unsupportedCount >= 2) {
    signals.push("REPEATED_UNSUPPORTED_EVIDENCE");
    anomalyLevel = "suspicious";
    confidence *= 0.8;
  }

  // 3. Check for identical confidence scores (possible automation)
  const confidenceScores = results.map((r) => r.confidenceScore);
  if (confidenceScores.length >= 3) {
    const uniqueScores = new Set(confidenceScores.map((s) => Math.round(s * 100) / 100));
    if (uniqueScores.size === 1) {
      signals.push("IDENTICAL_CONFIDENCE_SCORES");
      anomalyLevel = "suspicious";
      confidence *= 0.85;
    }
  }

  return {
    level: anomalyLevel,
    signals,
    confidence,
    recommendation: signals.length > 0
      ? "Evidence quality is concerning. Please submit fresh, high-quality evidence."
      : "",
  };
}

/**
 * Run all anomaly detection checks for a mission.
 * Returns the highest severity anomaly found.
 */
export async function runAnomalyDetection(
  missionId: string,
  verificationMode: string
): Promise<AnomalyResult> {
  const checks: AnomalyResult[] = [];

  // Mode-specific anomaly checks
  if (verificationMode === "pose" || verificationMode === "repetition") {
    checks.push(await analyzeRepetitionAnomaly(missionId));
  }

  if (verificationMode === "focus" || verificationMode === "timed") {
    checks.push(await analyzeFocusAnomaly(missionId));
  }

  if (["photo", "evidence", "hybrid"].includes(verificationMode)) {
    checks.push(await analyzeVisionAnomaly(missionId));
  }

  // Always run vision anomaly if there are vision results
  const visionCheck = await analyzeVisionAnomaly(missionId);
  if (visionCheck.signals.length > 0) {
    checks.push(visionCheck);
  }

  // Return the highest severity anomaly
  const severityOrder: Record<AnomalyLevel, number> = {
    normal: 0,
    suspicious: 1,
    requires_retry: 2,
    review: 3,
    restricted: 4,
  };

  let worst: AnomalyResult = { level: "normal", signals: [], confidence: 1, recommendation: "" };
  for (const check of checks) {
    if (severityOrder[check.level] > severityOrder[worst.level]) {
      worst = check;
    }
  }

  if (worst.level !== "normal") {
    logSecurity("anomaly_detected", {
      missionId,
      level: worst.level,
      signals: worst.signals,
      confidence: worst.confidence,
    });
  }

  return worst;
}
