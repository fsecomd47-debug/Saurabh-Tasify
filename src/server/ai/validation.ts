/**
 * PDR-4.1 §14: AI Output Validation
 * Zod schema validation for AI task analysis output.
 * Malformed AI output must never enter the economy.
 */

import { z } from "zod";

/**
 * Allowed taxonomy values.
 * §11: Data-driven validation against canonical taxonomy.
 */
const ALLOWED_CATEGORIES = [
  "study", "work", "fitness", "reading", "health",
  "creative", "personal", "finance", "other",
] as const;

const ALLOWED_DIFFICULTIES = ["easy", "medium", "hard", "elite"] as const;

const ALLOWED_ACTIVITY_TYPES = [
  "repetition", "focus", "timer", "visual_result", "external_result", "simple",
] as const;

const ALLOWED_VERIFICATION_MODES = [
  "self_reported", "timed", "focus", "pose", "repetition",
  "interactive", "evidence", "hybrid", "activity_signal", "review", "photo",
] as const;

/**
 * Zod schema for AI task analysis output.
 * §14: AI output → Zod validation → Range validation → Allowed taxonomy check.
 */
export const TaskAnalysisSchema = z.object({
  canonicalActivity: z.string().min(1).max(100),
  category: z.enum(ALLOWED_CATEGORIES),
  difficulty: z.enum(ALLOWED_DIFFICULTIES),
  estimatedMinutes: z.number().int().min(1).max(480),
  activityType: z.enum(ALLOWED_ACTIVITY_TYPES),
  verificationMode: z.enum(ALLOWED_VERIFICATION_MODES),
  target: z.object({
    value: z.number().int().min(1).max(10000).optional(),
    unit: z.string().min(1).max(50).optional(),
  }).optional(),
  verificationRequirements: z.record(z.string(), z.unknown()).default({}),
  normalizedTitle: z.string().min(1).max(200),
  confidence: z.number().min(0).max(1),
});

export type ValidatedTaskAnalysis = z.infer<typeof TaskAnalysisSchema>;

/**
 * Validate AI output against the schema.
 * Returns either the validated data or an error.
 */
export function validateAIOutput(raw: unknown): {
  success: true;
  data: ValidatedTaskAnalysis;
} | {
  success: false;
  errors: string[];
} {
  const result = TaskAnalysisSchema.safeParse(raw);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map(
    (e) => `${e.path.map(String).join(".")}: ${e.message}`
  );

  return { success: false, errors };
}

/**
 * Cross-field validation rules.
 * §14: Policy validation beyond simple schema.
 */
export function validateCrossFieldRules(analysis: ValidatedTaskAnalysis): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Rule: focus activities should have focus verification
  if (analysis.activityType === "focus" && analysis.verificationMode !== "focus") {
    warnings.push("Focus activity should use focus verification mode");
  }

  // Rule: repetition activities should use pose verification
  if (analysis.activityType === "repetition" && !["pose", "repetition"].includes(analysis.verificationMode)) {
    warnings.push("Repetition activity should use pose or repetition verification");
  }

  // Rule: visual_result should use photo/evidence
  if (analysis.activityType === "visual_result" && !["photo", "evidence"].includes(analysis.verificationMode)) {
    warnings.push("Visual result activity should use photo or evidence verification");
  }

  // Rule: external_result should use evidence/review/activity_signal
  if (analysis.activityType === "external_result" && !["evidence", "review", "activity_signal"].includes(analysis.verificationMode)) {
    warnings.push("External result activity should use evidence, review, or activity_signal verification");
  }

  // Rule: confidence shouldn't be too low
  if (analysis.confidence < 0.4) {
    warnings.push("Very low AI confidence — consider human review");
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}
