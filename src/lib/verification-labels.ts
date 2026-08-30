/**
 * PDR-4.1: Verification Mode Labels
 * Human-readable labels for verification modes in the UI.
 */

import type { VerificationMode } from "@/types";

export type VerificationModeInfo = {
  label: string;
  description: string;
  icon: string;
  requiresCamera: boolean;
  requiresPhoto: boolean;
};

const MODE_MAP: Record<VerificationMode, VerificationModeInfo> = {
  self_reported: {
    label: "Self Report",
    description: "Mark as complete on your honor",
    icon: "✓",
    requiresCamera: false,
    requiresPhoto: false,
  },
  timed: {
    label: "Timer",
    description: "Timer with presence check",
    icon: "⏱",
    requiresCamera: false,
    requiresPhoto: false,
  },
  focus: {
    label: "Focus Session",
    description: "Timer + presence + continuity",
    icon: "🎯",
    requiresCamera: false,
    requiresPhoto: false,
  },
  pose: {
    label: "Camera Verification",
    description: "Camera tracks your form and counts reps",
    icon: "📷",
    requiresCamera: true,
    requiresPhoto: false,
  },
  repetition: {
    label: "Motion Counting",
    description: "Motion-based repetition counting",
    icon: "🔄",
    requiresCamera: true,
    requiresPhoto: false,
  },
  interactive: {
    label: "Interactive",
    description: "Interactive verification challenge",
    icon: "🎮",
    requiresCamera: false,
    requiresPhoto: false,
  },
  evidence: {
    label: "Evidence",
    description: "Submit photo or external evidence",
    icon: "📎",
    requiresCamera: false,
    requiresPhoto: true,
  },
  hybrid: {
    label: "Multi-Signal",
    description: "Multiple verification signals combined",
    icon: "🔗",
    requiresCamera: false,
    requiresPhoto: false,
  },
  activity_signal: {
    label: "Activity Data",
    description: "Device activity data verification",
    icon: "📊",
    requiresCamera: false,
    requiresPhoto: false,
  },
  review: {
    label: "Review Required",
    description: "Requires human review",
    icon: "👁",
    requiresCamera: false,
    requiresPhoto: false,
  },
  photo: {
    label: "Photo Result",
    description: "Photo evidence of completed result",
    icon: "📸",
    requiresCamera: false,
    requiresPhoto: true,
  },
  compound: {
    label: "Multi-Step",
    description: "Multiple tasks combined into one mission",
    icon: "🎯",
    requiresCamera: false,
    requiresPhoto: false,
  },
};

/**
 * Get human-readable info for a verification mode.
 */
export function getVerificationModeInfo(mode: VerificationMode): VerificationModeInfo {
  return MODE_MAP[mode] ?? MODE_MAP.self_reported;
}

/**
 * Get the display label for a verification mode.
 */
export function getVerificationModeLabel(mode: VerificationMode): string {
  return getVerificationModeInfo(mode).label;
}

/**
 * Get the description for a verification mode.
 */
export function getVerificationModeDescription(mode: VerificationMode): string {
  return getVerificationModeInfo(mode).description;
}

/**
 * Check if a mode shows a "camera required" badge.
 */
export function isCameraRequiredMode(mode: VerificationMode): boolean {
  return getVerificationModeInfo(mode).requiresCamera;
}
