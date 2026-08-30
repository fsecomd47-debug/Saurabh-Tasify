/**
 * PDR-4 §9-10: Task Intelligence Engine
 * Transforms natural-language tasks into structured mission parameters.
 * Maps semantically similar tasks to the same mission framework.
 */

import type { TaskCategory, TaskDifficulty, ActivityType, VerificationMode } from "@/types";

// ============================================================================
// Task Normalization Types
// ============================================================================

export type NormalizedTask = {
  rawInput: string;
  normalizedTitle: string;
  activity: string;
  category: TaskCategory;
  activityType: ActivityType;
  difficulty: TaskDifficulty;
  verificationMode: VerificationMode;
  target?: {
    value: number;
    unit: string;
  };
  durationSeconds?: number;
  confidence: number;
  requiresCamera: boolean;
  requiresPhoto: boolean;
  requiresTimer: boolean;
};

// ============================================================================
// Activity Detection Patterns
// ============================================================================

type ActivityPattern = {
  keywords: string[];
  category: TaskCategory;
  activityType: ActivityType;
  verificationMode: VerificationMode;
  defaultUnit: string;
  defaultDuration?: number;
  defaultReps?: number;
  requiresCamera: boolean;
  requiresPhoto: boolean;
  requiresTimer: boolean;
};

const ACTIVITY_PATTERNS: ActivityPattern[] = [
  // ─── FITNESS: REPETITION ──────────────────────────────
  {
    keywords: ["pushup", "push-up", "push up", "pushups"],
    category: "fitness",
    activityType: "repetition",
    verificationMode: "pose",
    defaultUnit: "repetition",
    defaultReps: 10,
    requiresCamera: true,
    requiresPhoto: false,
    requiresTimer: false,
  },
  {
    keywords: ["squat", "squats"],
    category: "fitness",
    activityType: "repetition",
    verificationMode: "pose",
    defaultUnit: "repetition",
    defaultReps: 15,
    requiresCamera: true,
    requiresPhoto: false,
    requiresTimer: false,
  },
  {
    keywords: ["lunge", "lunges"],
    category: "fitness",
    activityType: "repetition",
    verificationMode: "pose",
    defaultUnit: "repetition",
    defaultReps: 10,
    requiresCamera: true,
    requiresPhoto: false,
    requiresTimer: false,
  },
  {
    keywords: ["jumping jack", "jumping jacks"],
    category: "fitness",
    activityType: "repetition",
    verificationMode: "pose",
    defaultUnit: "repetition",
    defaultReps: 20,
    requiresCamera: true,
    requiresPhoto: false,
    requiresTimer: false,
  },
  {
    keywords: ["situp", "sit-up", "sit up", "situps", "crunch", "crunches"],
    category: "fitness",
    activityType: "repetition",
    verificationMode: "pose",
    defaultUnit: "repetition",
    defaultReps: 15,
    requiresCamera: true,
    requiresPhoto: false,
    requiresTimer: false,
  },
  {
    keywords: ["pullup", "pull-up", "pull up"],
    category: "fitness",
    activityType: "repetition",
    verificationMode: "pose",
    defaultUnit: "repetition",
    defaultReps: 5,
    requiresCamera: true,
    requiresPhoto: false,
    requiresTimer: false,
  },
  {
    keywords: ["burpee", "burpees"],
    category: "fitness",
    activityType: "repetition",
    verificationMode: "pose",
    defaultUnit: "repetition",
    defaultReps: 10,
    requiresCamera: true,
    requiresPhoto: false,
    requiresTimer: false,
  },
  {
    keywords: ["dip", "dips"],
    category: "fitness",
    activityType: "repetition",
    verificationMode: "pose",
    defaultUnit: "repetition",
    defaultReps: 10,
    requiresCamera: true,
    requiresPhoto: false,
    requiresTimer: false,
  },
  {
    keywords: ["curl", "curls", "bicep curl"],
    category: "fitness",
    activityType: "repetition",
    verificationMode: "pose",
    defaultUnit: "repetition",
    defaultReps: 12,
    requiresCamera: true,
    requiresPhoto: false,
    requiresTimer: false,
  },

  // ─── FITNESS: TIMER ──────────────────────────────────
  {
    keywords: ["plank", "planking"],
    category: "fitness",
    activityType: "timer",
    verificationMode: "timed",
    defaultUnit: "seconds",
    defaultDuration: 60,
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
  },
  {
    keywords: ["exercise", "workout", "training"],
    category: "fitness",
    activityType: "timer",
    verificationMode: "timed",
    defaultUnit: "minutes",
    defaultDuration: 30,
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
  },
  {
    keywords: ["yoga", "stretch", "stretching"],
    category: "fitness",
    activityType: "timer",
    verificationMode: "timed",
    defaultUnit: "minutes",
    defaultDuration: 15,
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
  },

  // ─── FITNESS: EXTERNAL ──────────────────────────────
  {
    keywords: ["run", "running", "jog", "jogging", "sprint", "sprinting"],
    category: "fitness",
    activityType: "external_result",
    verificationMode: "evidence",
    defaultUnit: "km",
    defaultDuration: 30,
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
  },
  {
    keywords: ["walk", "walking", "steps"],
    category: "fitness",
    activityType: "external_result",
    verificationMode: "evidence",
    defaultUnit: "steps",
    defaultDuration: 30,
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
  },
  {
    keywords: ["bike", "biking", "cycling", "cycle"],
    category: "fitness",
    activityType: "external_result",
    verificationMode: "evidence",
    defaultUnit: "km",
    defaultDuration: 30,
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
  },
  {
    keywords: ["swim", "swimming"],
    category: "fitness",
    activityType: "external_result",
    verificationMode: "evidence",
    defaultUnit: "laps",
    defaultDuration: 30,
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
  },

  // ─── STUDY: FOCUS ────────────────────────────────────
  {
    keywords: ["study", "studying", "learn", "learning"],
    category: "study",
    activityType: "focus",
    verificationMode: "focus",
    defaultUnit: "minutes",
    defaultDuration: 30,
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
  },
  {
    keywords: ["read", "reading"],
    category: "study",
    activityType: "focus",
    verificationMode: "focus",
    defaultUnit: "minutes",
    defaultDuration: 30,
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
  },
  {
    keywords: ["meditate", "meditation", "mindfulness"],
    category: "study",
    activityType: "focus",
    verificationMode: "focus",
    defaultUnit: "minutes",
    defaultDuration: 10,
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
  },
  {
    keywords: ["revision", "review", "reviewing"],
    category: "study",
    activityType: "focus",
    verificationMode: "focus",
    defaultUnit: "minutes",
    defaultDuration: 30,
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
  },
  {
    keywords: ["homework", "assignment", "essay", "thesis"],
    category: "study",
    activityType: "focus",
    verificationMode: "focus",
    defaultUnit: "minutes",
    defaultDuration: 30,
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
  },
  {
    keywords: ["math", "mathematics", "algebra", "calculus"],
    category: "study",
    activityType: "focus",
    verificationMode: "focus",
    defaultUnit: "minutes",
    defaultDuration: 30,
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
  },

  // ─── WORK: FOCUS ─────────────────────────────────────
  {
    keywords: ["code", "coding", "programming", "develop", "developing"],
    category: "work",
    activityType: "focus",
    verificationMode: "focus",
    defaultUnit: "minutes",
    defaultDuration: 60,
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
  },
  {
    keywords: ["write", "writing"],
    category: "work",
    activityType: "focus",
    verificationMode: "focus",
    defaultUnit: "minutes",
    defaultDuration: 30,
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
  },
  {
    keywords: ["project", "project work"],
    category: "work",
    activityType: "focus",
    verificationMode: "focus",
    defaultUnit: "minutes",
    defaultDuration: 60,
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
  },
  {
    keywords: ["research", "investigate"],
    category: "work",
    activityType: "focus",
    verificationMode: "focus",
    defaultUnit: "minutes",
    defaultDuration: 30,
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
  },
  {
    keywords: ["practice", "practicing"],
    category: "work",
    activityType: "focus",
    verificationMode: "focus",
    defaultUnit: "minutes",
    defaultDuration: 30,
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
  },

  // ─── LIFE: VISUAL RESULT ─────────────────────────────
  {
    keywords: ["clean", "cleaning", "tidy", "tidying"],
    category: "personal",
    activityType: "visual_result",
    verificationMode: "photo",
    defaultUnit: "task",
    requiresCamera: false,
    requiresPhoto: true,
    requiresTimer: false,
  },
  {
    keywords: ["organize", "organizing", "sort", "sorting"],
    category: "personal",
    activityType: "visual_result",
    verificationMode: "photo",
    defaultUnit: "task",
    requiresCamera: false,
    requiresPhoto: true,
    requiresTimer: false,
  },
  {
    keywords: ["cook", "cooking", "meal prep", "mealprep"],
    category: "personal",
    activityType: "visual_result",
    verificationMode: "photo",
    defaultUnit: "task",
    requiresCamera: false,
    requiresPhoto: true,
    requiresTimer: false,
  },
  {
    keywords: ["setup", "set up", "desk setup", "workspace"],
    category: "personal",
    activityType: "visual_result",
    verificationMode: "photo",
    defaultUnit: "task",
    requiresCamera: false,
    requiresPhoto: true,
    requiresTimer: false,
  },

  // ─── LIFE: SIMPLE ────────────────────────────────────
  {
    keywords: ["drink water", "hydration", "water"],
    category: "personal",
    activityType: "simple",
    verificationMode: "self_reported",
    defaultUnit: "task",
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: false,
  },
  {
    keywords: ["take pill", "medication", "vitamin"],
    category: "personal",
    activityType: "simple",
    verificationMode: "self_reported",
    defaultUnit: "task",
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: false,
  },
  {
    keywords: ["journal", "journaling", "log", "logging"],
    category: "personal",
    activityType: "simple",
    verificationMode: "self_reported",
    defaultUnit: "task",
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: false,
  },

  // ─── EXTERNAL: EVIDENCE ──────────────────────────────
  {
    keywords: ["earn", "earning", "income", "revenue", "profit"],
    category: "finance",
    activityType: "external_result",
    verificationMode: "evidence",
    defaultUnit: "dollars",
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: false,
  },
  {
    keywords: ["sale", "sales", "sell"],
    category: "finance",
    activityType: "external_result",
    verificationMode: "evidence",
    defaultUnit: "dollars",
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: false,
  },
  {
    keywords: ["submit", "submission", "submitting"],
    category: "work",
    activityType: "external_result",
    verificationMode: "evidence",
    defaultUnit: "task",
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: false,
  },
];

// ============================================================================
// Quantity Parsing
// ============================================================================

function parseQuantity(input: string): { value: number; unit: string } | undefined {
  const cleaned = input.toLowerCase().trim();

  // Repetition patterns
  const repMatch = cleaned.match(
    /(\d+)\s*(?:rep|pushup|push-up|squat|lunge|crunch|sit-up|dip|curl|burpee|jumping.?jack)/i
  );
  if (repMatch) return { value: parseInt(repMatch[1]), unit: "repetition" };

  // Time patterns
  const hourMatch = cleaned.match(/(\d+)\s*(?:hour|hr)/i);
  const minMatch = cleaned.match(/(\d+)\s*(?:min|minute)/i);
  const secMatch = cleaned.match(/(\d+)\s*(?:sec|second)/i);

  if (hourMatch || minMatch || secMatch) {
    let totalMinutes = 0;
    if (hourMatch) totalMinutes += parseInt(hourMatch[1]) * 60;
    if (minMatch) totalMinutes += parseInt(minMatch[1]);
    if (secMatch) totalMinutes += Math.ceil(parseInt(secMatch[1]) / 60);
    return { value: totalMinutes, unit: "minutes" };
  }

  // Distance patterns
  const kmMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(?:km|kilometer)/i);
  if (kmMatch) return { value: parseFloat(kmMatch[1]), unit: "km" };

  const mileMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(?:mile|miles|mi)/i);
  if (mileMatch) return { value: parseFloat(mileMatch[1]), unit: "miles" };

  // Step patterns
  const stepMatch = cleaned.match(/(\d+)\s*(?:step|steps)/i);
  if (stepMatch) return { value: parseInt(stepMatch[1]), unit: "steps" };

  // Currency patterns
  const dollarMatch = cleaned.match(/\$?\s*(\d+(?:\.\d+)?)\s*(?:dollar|usd)?/i);
  if (dollarMatch && cleaned.includes("$")) {
    return { value: parseFloat(dollarMatch[1]), unit: "dollars" };
  }

  // Pages (reading)
  const pageMatch = cleaned.match(/(\d+)\s*(?:page|pages)/i);
  if (pageMatch) return { value: parseInt(pageMatch[1]), unit: "pages" };

  // Words
  const wordMatch = cleaned.match(/(\d+)\s*(?:word|words)/i);
  if (wordMatch) return { value: parseInt(wordMatch[1]), unit: "words" };

  // Generic number
  const numMatch = cleaned.match(/(\d+)/);
  if (numMatch) return { value: parseInt(numMatch[1]), unit: "count" };

  return undefined;
}

// ============================================================================
// Difficulty Assessment
// ============================================================================

function assessDifficulty(
  activityType: ActivityType,
  quantity?: { value: number; unit: string },
  durationSeconds?: number
): TaskDifficulty {
  // High effort indicators
  if (activityType === "repetition") {
    const reps = quantity?.value ?? 0;
    if (reps >= 50) return "elite";
    if (reps >= 25) return "hard";
    if (reps >= 10) return "medium";
    return "easy";
  }

  if (activityType === "focus" || activityType === "timer") {
    const minutes = (durationSeconds ?? 0) / 60;
    if (minutes >= 120) return "elite";
    if (minutes >= 60) return "hard";
    if (minutes >= 25) return "medium";
    return "easy";
  }

  if (activityType === "external_result") {
    if (quantity?.unit === "dollars") {
      const amount = quantity.value;
      if (amount >= 1000) return "elite";
      if (amount >= 100) return "hard";
      if (amount >= 25) return "medium";
      return "easy";
    }
  }

  return "medium";
}

// ============================================================================
// Main Normalization Function
// ============================================================================

export function normalizeTask(input: string): NormalizedTask {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  // Try pattern matching
  for (const pattern of ACTIVITY_PATTERNS) {
    const matched = pattern.keywords.some((kw) => lower.includes(kw));
    if (matched) {
      const quantity = parseQuantity(trimmed);
      const durationSeconds =
        pattern.defaultDuration
          ? (quantity?.unit === "minutes"
              ? quantity.value * 60
              : quantity?.unit === "seconds"
                ? quantity.value
                : (pattern.defaultDuration ?? 0) * 60)
          : undefined;

      const targetReps =
        pattern.activityType === "repetition"
          ? quantity?.value ?? pattern.defaultReps
          : undefined;

      const difficulty = assessDifficulty(
        pattern.activityType,
        quantity,
        durationSeconds
      );

      return {
        rawInput: trimmed,
        normalizedTitle: trimmed,
        activity: pattern.keywords[0],
        category: pattern.category,
        activityType: pattern.activityType,
        difficulty,
        verificationMode: pattern.verificationMode,
        target: targetReps
          ? { value: targetReps, unit: pattern.defaultUnit }
          : quantity
            ? { value: quantity.value, unit: quantity.unit }
            : undefined,
        durationSeconds: durationSeconds ?? (pattern.defaultDuration ? pattern.defaultDuration * 60 : undefined),
        confidence: 0.85,
        requiresCamera: pattern.requiresCamera,
        requiresPhoto: pattern.requiresPhoto,
        requiresTimer: pattern.requiresTimer,
      };
    }
  }

  // Fallback: generic task
  const quantity = parseQuantity(trimmed);
  const hasTime = /\d+\s*(?:min|hour|sec|hr)/i.test(lower);
  const hasReps = /\d+\s*(?:rep|pushup|squat)/i.test(lower);

  let activityType: ActivityType = "simple";
  let verificationMode: VerificationMode = "self_reported";
  let requiresCamera = false;
  let requiresPhoto = false;
  let requiresTimer = false;

  if (hasTime) {
    activityType = "focus";
    verificationMode = "focus";
    requiresTimer = true;
  } else if (hasReps) {
    activityType = "repetition";
    verificationMode = "pose";
    requiresCamera = true;
  }

  return {
    rawInput: trimmed,
    normalizedTitle: trimmed,
    activity: "unknown",
    category: "other",
    activityType,
    difficulty: "medium",
    verificationMode,
    target: quantity ? { value: quantity.value, unit: quantity.unit } : undefined,
    durationSeconds: hasTime ? (quantity?.value ?? 30) * 60 : undefined,
    confidence: 0.5,
    requiresCamera,
    requiresPhoto,
    requiresTimer,
  };
}

// ============================================================================
// Ambiguity Detection
// ============================================================================

export type AmbiguityResult = {
  isAmbiguous: boolean;
  clarificationNeeded?: string;
  suggestions?: string[];
};

export function detectAmbiguity(input: string): AmbiguityResult {
  const lower = input.toLowerCase().trim();

  // "10K" without context
  const hasLargeNumber = /\b\d+k\b/i.test(lower) || /\b\d{4,}\b/.test(lower);
  if (hasLargeNumber) {
    const hasUnit = /\b(?:step|km|mile|rep|pushup|squat|dollar|usd|word|page|min|hour)\b/i.test(lower);
    if (!hasUnit) {
      return {
        isAmbiguous: true,
        clarificationNeeded: "What does this number represent?",
        suggestions: ["Steps", "Distance", "Repetitions", "Money", "Words", "Other"],
      };
    }
  }

  // Generic "do exercise" without specifics
  if (/^(?:do|complete|finish)\s+(?:exercise|workout|training)$/i.test(lower)) {
    return {
      isAmbiguous: true,
      clarificationNeeded: "What kind of exercise?",
      suggestions: ["Pushups", "Running", "Yoga", "Weight lifting"],
    };
  }

  return { isAmbiguous: false };
}
