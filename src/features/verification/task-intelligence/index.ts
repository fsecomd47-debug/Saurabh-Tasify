/**
 * PDR-4 Task Intelligence Module
 * Normalizes natural-language tasks into structured mission parameters.
 */

export { normalizeTask, detectAmbiguity } from "./task-normalizer";
export type { NormalizedTask, AmbiguityResult } from "./task-normalizer";
