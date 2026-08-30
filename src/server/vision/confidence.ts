/**
 * PDR-4.2 §55-57: Vision Confidence Abstraction
 * Maps internal confidence scores to user-facing language.
 * Never exposes raw model confidence to users.
 */

import type { VisionConfidenceLevel, VisionResult } from "./types";

/**
 * §55: Map internal confidence score to user-facing level.
 */
export function getConfidenceLevel(score: number): VisionConfidenceLevel {
  if (score >= 0.75) return "clear";
  if (score >= 0.5) return "likely";
  if (score >= 0.3) return "uncertain";
  return "needs_better_view";
}

/**
 * §55: Get user-facing confidence description.
 */
export function getConfidenceDescription(level: VisionConfidenceLevel): string {
  const descriptions: Record<VisionConfidenceLevel, string> = {
    clear: "Clear result",
    likely: "Likely detected",
    uncertain: "Uncertain result",
    needs_better_view: "Need a clearer view",
  };
  return descriptions[level];
}

/**
 * §57: Get actionable feedback for uncertain results.
 * Provides the most useful next action.
 */
export function getUncertaintyAction(result: VisionResult): string {
  if (result.confidenceLevel === "clear" || result.confidenceLevel === "likely") {
    return "";
  }

  const reasonCode = result.reasonCode;

  // Map reason codes to actionable feedback
  if (reasonCode.includes("DARK") || reasonCode.includes("LIGHTING")) {
    return "Improve the lighting and try again.";
  }
  if (reasonCode.includes("BLUR") || reasonCode.includes("SHARPNESS")) {
    return "Hold the camera steady and try again.";
  }
  if (reasonCode.includes("DISTANCE") || reasonCode.includes("FAR")) {
    return "Move a little closer.";
  }
  if (reasonCode.includes("FRAMING") || reasonCode.includes("CUTOFF")) {
    return "Make sure the full subject is in frame.";
  }
  if (reasonCode.includes("DEPTH")) {
    return "Try going a little deeper.";
  }
  if (reasonCode.includes("ALIGNMENT")) {
    return "Keep your body aligned.";
  }
  if (reasonCode.includes("COUNT")) {
    return "Make sure all items are clearly visible.";
  }
  if (reasonCode.includes("CHANGE") || reasonCode.includes("BEFORE")) {
    return "Make sure the result is clearly visible in the photo.";
  }

  return "Please try again with a clearer view.";
}

/**
 * §55: Get status badge text for verification result.
 */
export function getResultStatusText(result: VisionResult): string {
  switch (result.status) {
    case "supported":
      return "Verified";
    case "uncertain":
      return "Needs Review";
    case "unsupported":
      return "Not Verified";
    default:
      return "Unknown";
  }
}

/**
 * §75: Psychological feedback levels.
 * During activity: subtle. Verification: clear. Reward: strong.
 */
export function getFeedbackLevel(result: VisionResult): "subtle" | "clear" | "strong" {
  if (result.status === "supported" && result.confidenceLevel === "clear") {
    return "strong";
  }
  if (result.status === "supported" || result.status === "uncertain") {
    return "clear";
  }
  return "subtle";
}
