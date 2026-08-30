import type { AIProvider, MissionInput, TaskAnalysis } from "./provider";
import { lookupActivity, parseQuantity, type CanonicalActivity } from "@/server/verification/taxonomy";

const FITNESS_KEYWORDS = [
  "pushup", "push-up", "push up", "squat", "lunge", "plank", "sit-up", "situp",
  "pull-up", "pullup", "burpee", "jumping jack", "crunch", "dip", "curl",
  "run", "jog", "sprint", "walk", "lap", "bike", "swim", "stretch",
  "yoga", "pushups", "squats", "lunges", "reps",
];

const FOCUS_KEYWORDS = [
  "study", "read", "reading", "learn", "code", "coding", "write", "writing",
  "review", "practice", "research", "focus", "concentrate", "meditate",
  "homework", "assignment", "essay", "thesis", "document", "book",
];

const EVIDENCE_KEYWORDS = [
  "clean", "organize", "cook", "meal", "prep", "photo", "picture",
  "desk", "room", "kitchen", "workspace",
];

const QUICK_KEYWORDS = [
  "drink water", "take pill", "meditation", "breathing", "journal",
  "log", "track", "check", "remind", "call", "text", "email",
];

const DISTANCE_KEYWORDS = [
  "steps", "walk", "running", "run", "jog", "bike", "cycling",
  "distance", "miles", "km", "kilometers",
];

const FINANCIAL_KEYWORDS = [
  "earn", "make", "sell", "income", "revenue", "profit", "client",
  "sale", "money", "$", "dollars",
];

function hasAny(text: string, keywords: string[]): boolean {
  return keywords.some((k) => text.includes(k));
}

function extractMinutes(text: string): number {
  const hourMatch = text.match(/(\d+)\s*(?:hour|hr)/i);
  const minMatch = text.match(/(\d+)\s*(?:min|minute)/i);

  let minutes = 0;
  if (hourMatch) minutes += parseInt(hourMatch[1]) * 60;
  if (minMatch) minutes += parseInt(minMatch[1]);

  if (minutes === 0) {
    // Distance tasks: estimate from distance (walking ~20min/mile, running ~8min/mile)
    const mileMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:mile|mi)/i);
    if (mileMatch) {
      const miles = parseFloat(mileMatch[1]);
      const isRunning = /run|jog|sprint/i.test(text);
      const pacePerMile = isRunning ? 8 : 20;
      minutes = Math.round(miles * pacePerMile);
    } else if (hasAny(text, DISTANCE_KEYWORDS)) {
      minutes = 30; // Default for distance tasks without explicit distance
    } else if (hasAny(text, FOCUS_KEYWORDS)) {
      minutes = 30;
    } else if (hasAny(text, FITNESS_KEYWORDS)) {
      minutes = 10;
    } else {
      minutes = 15;
    }
  }

  return Math.max(1, Math.min(480, minutes));
}

function extractReps(text: string): number | null {
  const repMatch = text.match(/(\d+)\s*(?:rep|pushup|push-up|squat|lunge|crunch|sit-up|dip|curl|burpee|jumping jack)/i);
  return repMatch ? parseInt(repMatch[1]) : null;
}

function classifyDifficulty(minutes: number, isPhysical: boolean): TaskAnalysis["difficulty"] {
  if (isPhysical) {
    if (minutes <= 5) return "easy";
    if (minutes <= 15) return "medium";
    return "hard";
  }
  if (minutes <= 15) return "easy";
  if (minutes <= 30) return "medium";
  if (minutes <= 60) return "hard";
  return "elite";
}

function estimateReward(difficulty: TaskAnalysis["difficulty"], minutes: number): { st: number; xp: number } {
  const base: Record<string, { st: number; xp: number }> = {
    easy: { st: 50, xp: 25 },
    medium: { st: 150, xp: 75 },
    hard: { st: 400, xp: 150 },
    elite: { st: 1000, xp: 350 },
  };
  const b = base[difficulty];
  const durationFactor = Math.max(1, Math.round(minutes / 30));
  return {
    st: Math.round(b.st * durationFactor * 0.8),
    xp: Math.round(b.xp * durationFactor * 0.8),
  };
}

/**
 * Deterministic fallback when AI is unavailable.
 * Uses keyword matching and rules to classify tasks.
 */
export class FallbackProvider implements AIProvider {
  readonly name = "fallback";

  async analyzeTask(input: MissionInput): Promise<TaskAnalysis> {
    const text = `${input.title} ${input.description ?? ""}`.toLowerCase();

    // §10-11: Task Normalization via canonical taxonomy
    const canonicalActivity = lookupActivity(text);
    const quantity = parseQuantity(text);

    // Determine category and family from taxonomy
    let category: TaskAnalysis["category"] = "other";
    let activityType: TaskAnalysis["activityType"] = "simple";
    let verificationMode: TaskAnalysis["verificationMode"] = "self_reported";
    let canonicalId = "unknown";

    if (canonicalActivity) {
      canonicalId = canonicalActivity.id;
      category = canonicalActivity.category as TaskAnalysis["category"];
      activityType = canonicalActivity.family as TaskAnalysis["activityType"];

      // Map family to verification mode
      switch (canonicalActivity.family) {
        case "repetition":
          verificationMode = "pose";
          break;
        case "focus":
          verificationMode = "focus";
          break;
        case "timer":
          verificationMode = "timed";
          break;
        case "visual_result":
          verificationMode = "photo";
          break;
        case "external_result":
          verificationMode = "activity_signal";
          break;
        case "simple":
        default:
          verificationMode = "self_reported";
          break;
      }
    } else {
      // Fallback keyword-based classification
      // §10-11: Check distance BEFORE fitness (walk is NOT a repetition)
      const isDistance = hasAny(text, DISTANCE_KEYWORDS);
      const isFinancial = hasAny(text, FINANCIAL_KEYWORDS);
      const isPhysical = hasAny(text, FITNESS_KEYWORDS) && !isDistance;
      const isFocus = hasAny(text, FOCUS_KEYWORDS);
      const isEvidence = hasAny(text, EVIDENCE_KEYWORDS);
      const isQuick = hasAny(text, QUICK_KEYWORDS);

      if (isDistance) { category = "fitness"; activityType = "external_result"; verificationMode = "activity_signal"; }
      else if (isFinancial) { category = "finance"; activityType = "external_result"; verificationMode = "review"; }
      else if (isPhysical) { category = "fitness"; activityType = "repetition"; verificationMode = "pose"; }
      else if (isFocus) { category = "study"; activityType = "focus"; verificationMode = "focus"; }
      else if (isEvidence) { category = "personal"; activityType = "visual_result"; verificationMode = "photo"; }
      else if (isQuick) { category = "personal"; activityType = "simple"; verificationMode = "self_reported"; }
      else { activityType = "timer"; verificationMode = "timed"; }
    }

    // Duration estimation
    const minutes = extractMinutes(text);
    const difficulty = classifyDifficulty(minutes, category === "fitness");

    // Target extraction
    const target = quantity ? { value: quantity.value, unit: quantity.unit } : undefined;

    const normalizedTitle = input.title
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);

    return {
      canonicalActivity: canonicalId,
      category,
      difficulty,
      estimatedMinutes: minutes,
      activityType,
      verificationMode,
      target,
      verificationRequirements: {},
      normalizedTitle,
      confidence: canonicalActivity ? 0.75 : 0.6,
    };
  }
}
