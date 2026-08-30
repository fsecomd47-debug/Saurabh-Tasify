/**
 * PDR-4.1 §9-10: Task Normalization Pipeline
 * Converts raw user input into a normalized task representation.
 * Pipeline: User Input → Preprocessing → Task Normalization → AI Classification → Schema Validation
 */

import { lookupActivity, parseQuantity, type CanonicalActivity } from "@/server/verification/taxonomy";

export type NormalizedTask = {
  rawTitle: string;
  canonicalActivity: CanonicalActivity | null;
  quantity: { value: number; unit: string } | null;
  normalizedTitle: string;
};

const WORD_NUMBERS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, hundred: 100,
};

/**
 * Convert word numbers to digits.
 * "ten pushups" → "10 pushups"
 */
function expandWordNumbers(input: string): string {
  let result = input;
  for (const [word, num] of Object.entries(WORD_NUMBERS)) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    result = result.replace(regex, String(num));
  }
  return result;
}

/**
 * Preprocess raw task title for normalization.
 * §10: "10 push ups", "do ten pushups", "10 push-ups" → normalized form.
 */
function preprocessTitle(title: string): string {
  let normalized = title.toLowerCase().trim();

  // Expand word numbers
  normalized = expandWordNumbers(normalized);

  // Normalize common separators
  normalized = normalized.replace(/[-_]+/g, " ");

  // Remove filler words
  normalized = normalized.replace(/\b(do|complete|finish|go|get|make|do a|do some|get some)\b/gi, "");

  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, " ").trim();

  return normalized;
}

/**
 * Normalize a task title into a structured representation.
 * §10: All task input must go through normalization before classification.
 */
export function normalizeTask(title: string): NormalizedTask {
  const preprocessed = preprocessTitle(title);

  // Look up canonical activity
  const canonicalActivity = lookupActivity(preprocessed) ?? lookupActivity(title);

  // Extract quantity
  const quantity = parseQuantity(preprocessed) ?? parseQuantity(title);

  // Build normalized title
  let normalizedTitle = canonicalActivity?.name ?? title.trim();
  if (quantity) {
    normalizedTitle = `${quantity.value} ${quantity.unit === "repetition" ? canonicalActivity?.name ?? "" : quantity.unit} ${normalizedTitle}`.trim();
    // Clean up doubled names
    if (canonicalActivity && normalizedTitle.toLowerCase().includes(canonicalActivity.name.toLowerCase())) {
      normalizedTitle = `${quantity.value} ${canonicalActivity.name}`;
    }
  }

  return {
    rawTitle: title,
    canonicalActivity: canonicalActivity ?? null,
    quantity: quantity ?? null,
    normalizedTitle: normalizedTitle || title.trim(),
  };
}

/**
 * Extract repetition count from a task title.
 * Used by mission-service for targetRepetitions.
 */
export function extractRepetitions(title: string): number | null {
  const quantity = parseQuantity(title);
  if (quantity && quantity.unit === "repetition") {
    return quantity.value;
  }
  // Fallback: direct regex match
  const match = title.match(/(\d+)\s*(?:rep|pushup|push-up|squat|lunge|crunch|sit-up|dip|curl|burpee)/i);
  return match ? parseInt(match[1]) : null;
}

/**
 * Extract duration in seconds from a task title.
 * Used by mission-service for durationSeconds.
 */
export function extractDurationSeconds(title: string): number | null {
  const quantity = parseQuantity(title);
  if (quantity && (quantity.unit === "minutes" || quantity.unit === "hours")) {
    return quantity.unit === "hours" ? quantity.value * 3600 : quantity.value * 60;
  }
  // Fallback: direct patterns
  const hourMatch = title.match(/(\d+)\s*(?:hour|hr)/i);
  if (hourMatch) return parseInt(hourMatch[1]) * 3600;

  const minMatch = title.match(/(\d+)\s*(?:min|minute)/i);
  if (minMatch) return parseInt(minMatch[1]) * 60;

  return null;
}
