/**
 * PDR-4.1 §10-11: Canonical Activity Taxonomy
 * Data-driven, extensible taxonomy for task normalization.
 * Maps activities to their properties and verification requirements.
 */

export type ActivityCategory =
  | "fitness"
  | "study"
  | "work"
  | "life"
  | "external_result"
  | "other";

export type ActivityFamily =
  | "repetition"
  | "focus"
  | "timer"
  | "visual_result"
  | "external_result"
  | "simple";

export type CanonicalActivity = {
  id: string;
  name: string;
  category: ActivityCategory;
  family: ActivityFamily;
  defaultUnit: string;
  aliases: string[];
  requiresCamera: boolean;
  requiresPhoto: boolean;
  requiresTimer: boolean;
  defaultDurationMinutes?: number;
  defaultRepetitions?: number;
};

/**
 * The master taxonomy. New activities are added here.
 * All UI and verification logic references this data, not hardcoded strings.
 */
export const ACTIVITY_TAXONOMY: CanonicalActivity[] = [
  // ─── FITNESS: REPETITION ──────────────────────────────
  {
    id: "pushup",
    name: "Pushups",
    category: "fitness",
    family: "repetition",
    defaultUnit: "repetition",
    aliases: ["pushup", "push-up", "push up", "pushups"],
    requiresCamera: true,
    requiresPhoto: false,
    requiresTimer: false,
    defaultRepetitions: 10,
  },
  {
    id: "squat",
    name: "Squats",
    category: "fitness",
    family: "repetition",
    defaultUnit: "repetition",
    aliases: ["squat", "squats"],
    requiresCamera: true,
    requiresPhoto: false,
    requiresTimer: false,
    defaultRepetitions: 15,
  },
  {
    id: "lunge",
    name: "Lunges",
    category: "fitness",
    family: "repetition",
    defaultUnit: "repetition",
    aliases: ["lunge", "lunges"],
    requiresCamera: true,
    requiresPhoto: false,
    requiresTimer: false,
    defaultRepetitions: 10,
  },
  {
    id: "plank",
    name: "Plank",
    category: "fitness",
    family: "timer",
    defaultUnit: "seconds",
    aliases: ["plank", "planking"],
    requiresCamera: true,
    requiresPhoto: false,
    requiresTimer: true,
    defaultDurationMinutes: 1,
  },
  {
    id: "jumping_jack",
    name: "Jumping Jacks",
    category: "fitness",
    family: "repetition",
    defaultUnit: "repetition",
    aliases: ["jumping jack", "jumping jacks"],
    requiresCamera: true,
    requiresPhoto: false,
    requiresTimer: false,
    defaultRepetitions: 20,
  },
  {
    id: "situp",
    name: "Sit-ups",
    category: "fitness",
    family: "repetition",
    defaultUnit: "repetition",
    aliases: ["situp", "sit-up", "sit up", "situps"],
    requiresCamera: true,
    requiresPhoto: false,
    requiresTimer: false,
    defaultRepetitions: 15,
  },
  {
    id: "pullup",
    name: "Pull-ups",
    category: "fitness",
    family: "repetition",
    defaultUnit: "repetition",
    aliases: ["pullup", "pull-up", "pull up"],
    requiresCamera: true,
    requiresPhoto: false,
    requiresTimer: false,
    defaultRepetitions: 5,
  },
  {
    id: "burpee",
    name: "Burpees",
    category: "fitness",
    family: "repetition",
    defaultUnit: "repetition",
    aliases: ["burpee", "burpees"],
    requiresCamera: true,
    requiresPhoto: false,
    requiresTimer: false,
    defaultRepetitions: 10,
  },
  {
    id: "crunch",
    name: "Crunches",
    category: "fitness",
    family: "repetition",
    defaultUnit: "repetition",
    aliases: ["crunch", "crunches"],
    requiresCamera: true,
    requiresPhoto: false,
    requiresTimer: false,
    defaultRepetitions: 20,
  },
  {
    id: "dip",
    name: "Dips",
    category: "fitness",
    family: "repetition",
    defaultUnit: "repetition",
    aliases: ["dip", "dips"],
    requiresCamera: true,
    requiresPhoto: false,
    requiresTimer: false,
    defaultRepetitions: 10,
  },
  {
    id: "curl",
    name: "Curls",
    category: "fitness",
    family: "repetition",
    defaultUnit: "repetition",
    aliases: ["curl", "curls"],
    requiresCamera: true,
    requiresPhoto: false,
    requiresTimer: false,
    defaultRepetitions: 12,
  },

  // ─── FITNESS: DISTANCE/ACTIVITY ──────────────────────
  {
    id: "run",
    name: "Running",
    category: "fitness",
    family: "external_result",
    defaultUnit: "km",
    aliases: ["run", "running", "jog", "jogging", "sprint", "sprinting"],
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
    defaultDurationMinutes: 30,
  },
  {
    id: "walk",
    name: "Walking",
    category: "fitness",
    family: "external_result",
    defaultUnit: "steps",
    aliases: ["walk", "walking", "steps"],
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
    defaultDurationMinutes: 30,
  },
  {
    id: "bike",
    name: "Cycling",
    category: "fitness",
    family: "external_result",
    defaultUnit: "km",
    aliases: ["bike", "biking", "cycling", "cycle"],
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
    defaultDurationMinutes: 30,
  },
  {
    id: "swim",
    name: "Swimming",
    category: "fitness",
    family: "external_result",
    defaultUnit: "laps",
    aliases: ["swim", "swimming"],
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
    defaultDurationMinutes: 30,
  },
  {
    id: "yoga",
    name: "Yoga",
    category: "fitness",
    family: "timer",
    defaultUnit: "minutes",
    aliases: ["yoga", "stretch", "stretching"],
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
    defaultDurationMinutes: 15,
  },

  // ─── FITNESS: TIMER ──────────────────────────────────
  {
    id: "exercise",
    name: "Exercise",
    category: "fitness",
    family: "timer",
    defaultUnit: "minutes",
    aliases: ["exercise", "workout", "training"],
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
    defaultDurationMinutes: 30,
  },

  // ─── STUDY: FOCUS ────────────────────────────────────
  {
    id: "study",
    name: "Studying",
    category: "study",
    family: "focus",
    defaultUnit: "minutes",
    aliases: ["study", "studying", "learn", "learning"],
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
    defaultDurationMinutes: 30,
  },
  {
    id: "reading",
    name: "Reading",
    category: "study",
    family: "focus",
    defaultUnit: "minutes",
    aliases: ["read", "reading"],
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
    defaultDurationMinutes: 30,
  },
  {
    id: "revision",
    name: "Revision",
    category: "study",
    family: "focus",
    defaultUnit: "minutes",
    aliases: ["revision", "review", "reviewing"],
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
    defaultDurationMinutes: 30,
  },
  {
    id: "mathematics",
    name: "Mathematics",
    category: "study",
    family: "focus",
    defaultUnit: "minutes",
    aliases: ["math", "mathematics", "algebra", "calculus"],
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
    defaultDurationMinutes: 30,
  },
  {
    id: "meditation",
    name: "Meditation",
    category: "study",
    family: "focus",
    defaultUnit: "minutes",
    aliases: ["meditate", "meditation", "mindfulness"],
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
    defaultDurationMinutes: 10,
  },
  {
    id: "homework",
    name: "Homework",
    category: "study",
    family: "focus",
    defaultUnit: "minutes",
    aliases: ["homework", "assignment", "essay", "thesis"],
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
    defaultDurationMinutes: 30,
  },

  // ─── WORK: FOCUS ─────────────────────────────────────
  {
    id: "coding",
    name: "Coding",
    category: "work",
    family: "focus",
    defaultUnit: "minutes",
    aliases: ["code", "coding", "programming", "develop", "developing"],
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
    defaultDurationMinutes: 60,
  },
  {
    id: "writing",
    name: "Writing",
    category: "work",
    family: "focus",
    defaultUnit: "minutes",
    aliases: ["write", "writing"],
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
    defaultDurationMinutes: 30,
  },
  {
    id: "project_work",
    name: "Project Work",
    category: "work",
    family: "focus",
    defaultUnit: "minutes",
    aliases: ["project", "project work", "projectwork"],
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
    defaultDurationMinutes: 60,
  },
  {
    id: "research",
    name: "Research",
    category: "work",
    family: "focus",
    defaultUnit: "minutes",
    aliases: ["research", "investigate"],
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
    defaultDurationMinutes: 30,
  },
  {
    id: "practice",
    name: "Practice",
    category: "work",
    family: "focus",
    defaultUnit: "minutes",
    aliases: ["practice", "practicing"],
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
    defaultDurationMinutes: 30,
  },

  // ─── LIFE: VISUAL_RESULT ─────────────────────────────
  {
    id: "cleaning",
    name: "Cleaning",
    category: "life",
    family: "visual_result",
    defaultUnit: "task",
    aliases: ["clean", "cleaning", "tidy", "tidying"],
    requiresCamera: false,
    requiresPhoto: true,
    requiresTimer: false,
  },
  {
    id: "organizing",
    name: "Organizing",
    category: "life",
    family: "visual_result",
    defaultUnit: "task",
    aliases: ["organize", "organizing", "sort", "sorting"],
    requiresCamera: false,
    requiresPhoto: true,
    requiresTimer: false,
  },
  {
    id: "cooking",
    name: "Cooking",
    category: "life",
    family: "visual_result",
    defaultUnit: "task",
    aliases: ["cook", "cooking", "meal prep", "mealprep"],
    requiresCamera: false,
    requiresPhoto: true,
    requiresTimer: false,
  },
  {
    id: "desk_setup",
    name: "Desk Setup",
    category: "life",
    family: "visual_result",
    defaultUnit: "task",
    aliases: ["desk", "workspace", "setup"],
    requiresCamera: false,
    requiresPhoto: true,
    requiresTimer: false,
  },

  // ─── LIFE: SIMPLE ────────────────────────────────────
  {
    id: "drink_water",
    name: "Drink Water",
    category: "life",
    family: "simple",
    defaultUnit: "task",
    aliases: ["drink water", "hydration", "water"],
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: false,
  },
  {
    id: "take_pill",
    name: "Take Medication",
    category: "life",
    family: "simple",
    defaultUnit: "task",
    aliases: ["take pill", "medication", "vitamin"],
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: false,
  },
  {
    id: "journal",
    name: "Journaling",
    category: "life",
    family: "simple",
    defaultUnit: "task",
    aliases: ["journal", "journaling", "log", "logging"],
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: false,
  },
  {
    id: "call",
    name: "Phone Call",
    category: "life",
    family: "simple",
    defaultUnit: "task",
    aliases: ["call", "phone call", "text", "email"],
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: false,
  },

  // ─── EXTERNAL_RESULT ─────────────────────────────────
  {
    id: "earnings",
    name: "Earnings",
    category: "external_result",
    family: "external_result",
    defaultUnit: "dollars",
    aliases: ["earn", "earning", "income", "revenue", "profit", "sale", "sell"],
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: false,
  },
  {
    id: "sales",
    name: "Sales",
    category: "external_result",
    family: "external_result",
    defaultUnit: "sales",
    aliases: ["sale", "sales", "client", "customer"],
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: false,
  },
  {
    id: "submission",
    name: "Submission",
    category: "external_result",
    family: "external_result",
    defaultUnit: "task",
    aliases: ["submit", "submission", "submitting"],
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: false,
  },
];

/**
 * Look up a canonical activity by alias (case-insensitive).
 * Returns the best match or undefined.
 */
export function lookupActivity(input: string): CanonicalActivity | undefined {
  const normalized = input.toLowerCase().trim();

  // Exact alias match
  for (const activity of ACTIVITY_TAXONOMY) {
    if (activity.aliases.some((a) => normalized.includes(a))) {
      return activity;
    }
  }

  // Partial match
  for (const activity of ACTIVITY_TAXONOMY) {
    if (activity.aliases.some((a) => normalized.includes(a) || a.includes(normalized))) {
      return activity;
    }
  }

  return undefined;
}

/**
 * Get all activities for a given category.
 */
export function getActivitiesByCategory(category: ActivityCategory): CanonicalActivity[] {
  return ACTIVITY_TAXONOMY.filter((a) => a.category === category);
}

/**
 * Get all activities for a given family.
 */
export function getActivitiesByFamily(family: ActivityFamily): CanonicalActivity[] {
  return ACTIVITY_TAXONOMY.filter((a) => a.family === family);
}

/**
 * Normalize a quantity string with unit detection.
 * "10 pushups" → { value: 10, unit: "repetition" }
 * "30 minutes" → { value: 30, unit: "minutes" }
 * "5km" → { value: 5, unit: "km" }
 */
export function parseQuantity(input: string): { value: number; unit: string } | undefined {
  const cleaned = input.toLowerCase().trim();

  // Repetition patterns
  const repMatch = cleaned.match(/(\d+)\s*(?:rep|pushup|push-up|squat|lunge|crunch|sit-up|dip|curl|burpee|jumping.?jack)/i);
  if (repMatch) {
    return { value: parseInt(repMatch[1]), unit: "repetition" };
  }

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
  const kmMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(?:km|kilometer|kilometers)/i);
  if (kmMatch) {
    return { value: parseFloat(kmMatch[1]), unit: "km" };
  }

  const mileMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(?:mile|miles|mi)/i);
  if (mileMatch) {
    return { value: parseFloat(mileMatch[1]), unit: "miles" };
  }

  // Step patterns
  const stepMatch = cleaned.match(/(\d+)\s*(?:step|steps)/i);
  if (stepMatch) {
    return { value: parseInt(stepMatch[1]), unit: "steps" };
  }

  // Currency patterns
  const dollarMatch = cleaned.match(/\$?\s*(\d+(?:\.\d+)?)\s*(?:dollar|usd)?/i);
  if (dollarMatch && cleaned.includes("$")) {
    return { value: parseFloat(dollarMatch[1]), unit: "dollars" };
  }

  // Generic number
  const numMatch = cleaned.match(/(\d+)/);
  if (numMatch) {
    return { value: parseInt(numMatch[1]), unit: "count" };
  }

  return undefined;
}
