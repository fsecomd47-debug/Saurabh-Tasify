import type { AIProvider, MissionInput, TaskAnalysis } from "./provider";
import { GrokProvider } from "./grok-provider";
import { FallbackProvider } from "./fallback-provider";
import { validateAIOutput, validateCrossFieldRules } from "./validation";
import { lookupActivity } from "@/server/verification/taxonomy";
import { checkAmbiguity, resolveDisambiguation } from "./disambiguation";

let providerInstance: AIProvider | null = null;

function getProvider(): AIProvider {
  if (providerInstance) return providerInstance;

  const hasGroq = !!process.env.GROQ_API_KEY;
  providerInstance = hasGroq ? new GrokProvider() : new FallbackProvider();
  return providerInstance;
}

/**
 * §14: Server-side enforcement of correct verification modes.
 * Safety net: ensures AI can't return incorrect modes for known activities.
 */
function enforceVerificationMode(analysis: TaskAnalysis, input: MissionInput): TaskAnalysis {
  const text = `${input.title} ${input.description ?? ""}`.toLowerCase();
  const canonical = lookupActivity(text);

  // Financial tasks should use evidence verification (screenshot upload)
  if (analysis.category === "finance" || text.match(/earn|money|rupee|dollar|income|salary|profit|revenue|sell|sales|budget|save/)) {
    if (analysis.verificationMode === "review" || analysis.verificationMode === "activity_signal" || analysis.verificationMode === "self_reported") {
      console.warn(`[task-parser] Enforcing verification mode: ${analysis.verificationMode} → evidence for finance task`);
      analysis.verificationMode = "evidence";
      analysis.activityType = "external_result";
    }
  }

  if (canonical) {
    // Taxonomy is the source of truth for verification mode
    const familyToMode: Record<string, TaskAnalysis["verificationMode"]> = {
      repetition: "pose",
      focus: "focus",
      timer: "timed",
      visual_result: "photo",
      external_result: "activity_signal",
      simple: "self_reported",
    };

    const correctMode = familyToMode[canonical.family];
    // Don't override evidence mode for finance tasks
    if (correctMode && analysis.verificationMode !== correctMode && analysis.verificationMode !== "evidence") {
      console.warn(`[task-parser] Enforcing verification mode: ${analysis.verificationMode} → ${correctMode} for ${canonical.id}`);
      analysis.verificationMode = correctMode;
      analysis.activityType = canonical.family as TaskAnalysis["activityType"];
    }
  }

  return analysis;
}

/**
 * §15: AI failure fallback.
 * Analyze a task with validation and fallback.
 */
export async function analyzeTask(input: MissionInput): Promise<TaskAnalysis> {
  // §105: Check for ambiguous inputs before AI classification
  const ambiguity = checkAmbiguity(input.title);
  if (ambiguity.needsClarification && ambiguity.options && ambiguity.options.length > 0) {
    // Use first option as default resolution (client should handle disambiguation UI)
    console.warn(`[task-parser] Ambiguous input "${input.title}" — resolved to first option: ${ambiguity.options[0].label}`);
    const resolved = resolveDisambiguation(ambiguity.options[0], input.title);
    return {
      canonicalActivity: resolved.canonicalActivity ?? input.title,
      category: (resolved.category as TaskAnalysis["category"]) ?? "other",
      difficulty: (resolved.difficulty as TaskAnalysis["difficulty"]) ?? "medium",
      activityType: (resolved.activityType as TaskAnalysis["activityType"]) ?? "simple",
      verificationMode: (resolved.verificationMode as TaskAnalysis["verificationMode"]) ?? "self_reported",
      confidence: resolved.confidence ?? 0.5,
      estimatedMinutes: resolved.estimatedMinutes ?? 15,
      verificationRequirements: {},
      normalizedTitle: input.title.toLowerCase().trim(),
    } as TaskAnalysis;
  }

  const provider = getProvider();

  try {
    const rawResult = await provider.analyzeTask(input);

    // §14: Validate AI output against schema
    const validation = validateAIOutput(rawResult);
    if (!validation.success) {
      console.warn(`[task-parser] AI output validation failed:`, validation.errors);
      return new FallbackProvider().analyzeTask(input);
    }

    // §14: Cross-field validation
    const crossField = validateCrossFieldRules(validation.data);
    if (crossField.warnings.length > 0) {
      console.warn(`[task-parser] Cross-field warnings:`, crossField.warnings);
    }

    // §14: Server-side enforcement
    return enforceVerificationMode(validation.data, input);
  } catch (err) {
    // §15: If AI fails, try fallback
    if (provider.name !== "fallback") {
      console.warn(`[task-parser] AI provider "${provider.name}" failed, using fallback:`, err);
      const fallbackResult = await new FallbackProvider().analyzeTask(input);
      return enforceVerificationMode(fallbackResult, input);
    }
    throw err;
  }
}

/**
 * Analyze with analysis caching.
 * Checks if an identical normalized input was already analyzed.
 */
export async function analyzeTaskCached(
  input: MissionInput,
  cache?: { get: (key: string) => TaskAnalysis | null; set: (key: string, val: TaskAnalysis) => void }
): Promise<TaskAnalysis> {
  const normalizedKey = input.title.toLowerCase().trim().replace(/\s+/g, " ");

  if (cache) {
    const cached = cache.get(normalizedKey);
    if (cached) return cached;
  }

  const result = await analyzeTask(input);

  if (cache) {
    cache.set(normalizedKey, result);
  }

  return result;
}
