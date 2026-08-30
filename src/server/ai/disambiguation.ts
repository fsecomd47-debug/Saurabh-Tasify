/**
 * PDR-4 §105: Task Disambiguation Engine
 * Handles ambiguous task inputs where the system cannot determine
 * the intended activity with sufficient confidence.
 *
 * Example: "10K" → Could be steps, distance, pushups, money, words.
 * Example: "Do something hard" → No specific activity.
 * Example: "Exercise" → Could be pushups, squats, running, etc.
 */

import type { TaskAnalysis } from "./provider";

export type DisambiguationOption = {
  id: string;
  label: string;
  description: string;
  suggestedActivity: string;
  suggestedCategory: string;
  suggestedDifficulty: string;
};

export type DisambiguationResult = {
  needsClarification: boolean;
  confidence: number;
  question?: string;
  options?: DisambiguationOption[];
  resolvedAnalysis?: TaskAnalysis;
};

// Ambiguity patterns that require clarification
const AMBIGUOUS_PATTERNS: Array<{
  test: RegExp;
  question: string;
  options: DisambiguationOption[];
}> = [
  {
    // §104: "10K" without clear context
    test: /^[\s]*\d+[kK]\s*$/i,
    question: "10K what?",
    options: [
      { id: "steps", label: "Steps", description: "Walk 10,000 steps", suggestedActivity: "walking", suggestedCategory: "fitness", suggestedDifficulty: "medium" },
      { id: "run_distance", label: "Running Distance", description: "Run 10 kilometers", suggestedActivity: "running", suggestedCategory: "fitness", suggestedDifficulty: "hard" },
      { id: "pushups", label: "Pushups", description: "Do 10,000 pushups", suggestedActivity: "pushup", suggestedCategory: "fitness", suggestedDifficulty: "elite" },
      { id: "money", label: "Money", description: "Earn $10,000", suggestedActivity: "financial_result", suggestedCategory: "external_result", suggestedDifficulty: "elite" },
      { id: "words", label: "Words", description: "Read 10,000 words", suggestedActivity: "reading", suggestedCategory: "study", suggestedDifficulty: "hard" },
    ],
  },
  {
    // "Do 100" without specifying activity
    test: /^[\s]*(do|complete|finish)[\s]+(\d+)\s*$/i,
    question: "Do 100 what?",
    options: [
      { id: "pushups", label: "Pushups", description: "Do 100 pushups", suggestedActivity: "pushup", suggestedCategory: "fitness", suggestedDifficulty: "hard" },
      { id: "squats", label: "Squats", description: "Do 100 squats", suggestedActivity: "squat", suggestedCategory: "fitness", suggestedDifficulty: "hard" },
      { id: "situps", label: "Sit-ups", description: "Do 100 sit-ups", suggestedActivity: "situp", suggestedCategory: "fitness", suggestedDifficulty: "medium" },
      { id: "jumping_jacks", label: "Jumping Jacks", description: "Do 100 jumping jacks", suggestedActivity: "jumping_jack", suggestedCategory: "fitness", suggestedDifficulty: "medium" },
    ],
  },
  {
    // "Exercise" / "Work out" without specifics
    test: /^[\s]*(exercise|work\s*out|train|fitness)\s*$/i,
    question: "What kind of exercise?",
    options: [
      { id: "pushups", label: "Pushups", description: "Upper body push exercise", suggestedActivity: "pushup", suggestedCategory: "fitness", suggestedDifficulty: "medium" },
      { id: "squats", label: "Squats", description: "Lower body exercise", suggestedActivity: "squat", suggestedCategory: "fitness", suggestedDifficulty: "medium" },
      { id: "running", label: "Running", description: "Cardio running", suggestedActivity: "running", suggestedCategory: "fitness", suggestedDifficulty: "medium" },
      { id: "plank", label: "Plank", description: "Core stability hold", suggestedActivity: "plank", suggestedCategory: "fitness", suggestedDifficulty: "medium" },
    ],
  },
  {
    // "Study" / "Learn" without specifics
    test: /^[\s]*(study|learn|read)\s*$/i,
    question: "Study what?",
    options: [
      { id: "coding", label: "Coding", description: "Study programming", suggestedActivity: "coding", suggestedCategory: "study", suggestedDifficulty: "medium" },
      { id: "reading", label: "Reading", description: "Read a book or article", suggestedActivity: "reading", suggestedCategory: "study", suggestedDifficulty: "easy" },
      { id: "language", label: "Language", description: "Study a new language", suggestedActivity: "language_study", suggestedCategory: "study", suggestedDifficulty: "medium" },
    ],
  },
  {
    // "Clean" without specifics
    test: /^[\s]*(clean|tidy|organize)\s*$/i,
    question: "Clean what?",
    options: [
      { id: "room", label: "Room", description: "Clean your room", suggestedActivity: "room_cleaning", suggestedCategory: "life", suggestedDifficulty: "medium" },
      { id: "desk", label: "Desk", description: "Clean your desk", suggestedActivity: "desk_cleaning", suggestedCategory: "life", suggestedDifficulty: "easy" },
      { id: "kitchen", label: "Kitchen", description: "Clean the kitchen", suggestedActivity: "kitchen_cleaning", suggestedCategory: "life", suggestedDifficulty: "hard" },
      { id: "bathroom", label: "Bathroom", description: "Clean the bathroom", suggestedActivity: "bathroom_cleaning", suggestedCategory: "life", suggestedDifficulty: "hard" },
    ],
  },
  {
    // Very vague: "Do something", "Task", "Mission"
    test: /^[\s]*(do\s+something|task|mission|stuff|things|something)\s*$/i,
    question: "What would you like to accomplish?",
    options: [
      { id: "fitness", label: "Fitness", description: "Physical exercise", suggestedActivity: "pushup", suggestedCategory: "fitness", suggestedDifficulty: "medium" },
      { id: "study", label: "Study", description: "Learning activity", suggestedActivity: "coding", suggestedCategory: "study", suggestedDifficulty: "medium" },
      { id: "life", label: "Life", description: "Daily life task", suggestedActivity: "room_cleaning", suggestedCategory: "life", suggestedDifficulty: "easy" },
      { id: "work", label: "Work", description: "Work productivity", suggestedActivity: "coding", suggestedCategory: "work", suggestedDifficulty: "medium" },
    ],
  },
  {
    // Large number without unit context: "Do 500"
    test: /^[\s]*(do|complete|finish|run|walk|earn|read)[\s]+\d{3,}\s*$/i,
    question: "Complete which activity?",
    options: [
      { id: "pushups", label: "Pushups", description: "Bodyweight push exercise", suggestedActivity: "pushup", suggestedCategory: "fitness", suggestedDifficulty: "hard" },
      { id: "squats", label: "Squats", description: "Bodyweight leg exercise", suggestedActivity: "squat", suggestedCategory: "fitness", suggestedDifficulty: "hard" },
      { id: "steps", label: "Steps", description: "Walking steps", suggestedActivity: "walking", suggestedCategory: "fitness", suggestedDifficulty: "medium" },
      { id: "words", label: "Words", description: "Words read", suggestedActivity: "reading", suggestedCategory: "study", suggestedDifficulty: "hard" },
    ],
  },
];

/**
 * §105: Check if a task title is ambiguous and needs clarification.
 * Returns disambiguation options if the system cannot determine intent.
 */
export function checkAmbiguity(title: string): DisambiguationResult {
  const normalized = title.toLowerCase().trim();

  for (const pattern of AMBIGUOUS_PATTERNS) {
    if (pattern.test.test(normalized)) {
      return {
        needsClarification: true,
        confidence: 0.3,
        question: pattern.question,
        options: pattern.options,
      };
    }
  }

  return {
    needsClarification: false,
    confidence: 1.0,
  };
}

/**
 * §105: Resolve a disambiguation choice into a TaskAnalysis-compatible object.
 */
export function resolveDisambiguation(
  option: DisambiguationOption,
  originalTitle: string
): Partial<TaskAnalysis> {
  return {
    canonicalActivity: option.suggestedActivity,
    category: option.suggestedCategory as TaskAnalysis["category"],
    difficulty: option.suggestedDifficulty as TaskAnalysis["difficulty"],
    activityType: inferActivityType(option.suggestedActivity),
    verificationMode: inferVerificationMode(option.suggestedActivity, option.suggestedCategory),
    confidence: 0.85,
    estimatedMinutes: estimateDuration(option.suggestedActivity),
  };
}

function inferActivityType(activity: string): TaskAnalysis["activityType"] {
  const repetitionActivities = ["pushup", "squat", "lunge", "situp", "jumping_jack", "pullup", "dip"];
  const focusActivities = ["coding", "studying", "reading", "language_study", "meditation"];
  const timerActivities = ["plank", "holding", "staring"];
  const externalActivities = ["financial_result", "earning"];

  if (repetitionActivities.includes(activity)) return "repetition";
  if (focusActivities.includes(activity)) return "focus";
  if (timerActivities.includes(activity)) return "timer";
  if (externalActivities.includes(activity)) return "external_result";
  return "simple";
}

function inferVerificationMode(activity: string, category: string): TaskAnalysis["verificationMode"] {
  const cameraActivities = ["pushup", "squat", "lunge", "situp", "jumping_jack", "pullup", "dip"];
  const focusActivities = ["coding", "studying", "reading", "language_study"];
  const visualActivities = ["room_cleaning", "desk_cleaning", "kitchen_cleaning", "bathroom_cleaning"];

  if (cameraActivities.includes(activity)) return "pose";
  if (focusActivities.includes(activity)) return "focus";
  if (visualActivities.includes(activity)) return "photo";
  if (category === "external_result") return "evidence";
  return "self_reported";
}

function estimateDuration(activity: string): number {
  const durations: Record<string, number> = {
    pushup: 10, squat: 10, lunge: 10, situp: 10, jumping_jack: 10,
    running: 30, walking: 30, plank: 5,
    coding: 30, studying: 30, reading: 30, language_study: 30,
    room_cleaning: 20, desk_cleaning: 10, kitchen_cleaning: 30,
    meditation: 15, financial_result: 120,
  };
  return durations[activity] ?? 15;
}
