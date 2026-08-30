/**
 * PDR-4.1 §16-18: Verification Policy Engine
 * Routes missions to the correct verification method based on
 * task analysis, difficulty, risk, and verifiability.
 */

import type { TaskAnalysis } from "@/server/ai/provider";
import type { VerificationMode } from "@/types";

export type VerificationPolicy = {
  mode: VerificationMode;
  requiresCamera: boolean;
  requiresPhoto: boolean;
  requiresTimer: boolean;
  allowsSelfReport: boolean;
  checkpointInterval?: number;
  confidenceThreshold?: number;
  description: string;
};

type PolicyInput = {
  taskAnalysis: TaskAnalysis;
  riskLevel: "low" | "medium" | "high";
  verifiability: "easy" | "moderate" | "hard";
};

/**
 * Policy definitions per activity family + verification combination.
 */
const POLICY_MAP: Record<string, VerificationPolicy> = {
  // ─── REPETITION ──────────────────────────────────────
  "repetition:pose": {
    mode: "pose",
    requiresCamera: true,
    requiresPhoto: false,
    requiresTimer: false,
    allowsSelfReport: false,
    confidenceThreshold: 0.7,
    description: "Camera verifies rep count and form",
  },
  "repetition:repetition": {
    mode: "repetition",
    requiresCamera: true,
    requiresPhoto: false,
    requiresTimer: false,
    allowsSelfReport: false,
    confidenceThreshold: 0.7,
    description: "Motion counting verifies repetitions",
  },

  // ─── FOCUS ───────────────────────────────────────────
  "focus:focus": {
    mode: "focus",
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
    allowsSelfReport: false,
    checkpointInterval: 300,
    confidenceThreshold: 0.65,
    description: "Timer + presence + continuity",
  },

  // ─── TIMER ───────────────────────────────────────────
  "timer:timed": {
    mode: "timed",
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
    allowsSelfReport: false,
    confidenceThreshold: 0.6,
    description: "Simple timer verification",
  },

  // ─── VISUAL_RESULT ──────────────────────────────────
  "visual_result:photo": {
    mode: "photo",
    requiresCamera: false,
    requiresPhoto: true,
    requiresTimer: false,
    allowsSelfReport: false,
    confidenceThreshold: 0.65,
    description: "Photo evidence of completed result",
  },
  "visual_result:evidence": {
    mode: "evidence",
    requiresCamera: false,
    requiresPhoto: true,
    requiresTimer: false,
    allowsSelfReport: false,
    confidenceThreshold: 0.65,
    description: "Visual evidence submission",
  },

  // ─── EXTERNAL_RESULT ─────────────────────────────────
  "external_result:evidence": {
    mode: "evidence",
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: false,
    allowsSelfReport: false,
    confidenceThreshold: 0.5,
    description: "External evidence submission",
  },
  "external_result:review": {
    mode: "review",
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: false,
    allowsSelfReport: false,
    confidenceThreshold: 0.5,
    description: "Requires human review",
  },
  "external_result:activity_signal": {
    mode: "activity_signal",
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: false,
    allowsSelfReport: false,
    confidenceThreshold: 0.6,
    description: "Device activity data verification",
  },

  // ─── SIMPLE ──────────────────────────────────────────
  "simple:self_reported": {
    mode: "self_reported",
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: false,
    allowsSelfReport: true,
    confidenceThreshold: 0.6,
    description: "Self-reported completion",
  },

  // ─── HYBRID (fallback) ──────────────────────────────
  "hybrid:hybrid": {
    mode: "hybrid",
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: true,
    allowsSelfReport: false,
    confidenceThreshold: 0.65,
    description: "Multiple verification signals combined",
  },
};

/**
 * Risk assessment based on task characteristics.
 */
function assessRisk(input: PolicyInput): "low" | "medium" | "high" {
  const { taskAnalysis } = input;

  // High-risk: external claims, financial
  if (taskAnalysis.category === "finance" || taskAnalysis.activityType === "external_result") {
    return "high";
  }

  // Medium-risk: self-reported, easy tasks
  if (taskAnalysis.verificationMode === "self_reported") {
    return "medium";
  }

  // Low-risk: camera-verified, timer-verified
  if (taskAnalysis.verificationMode === "pose" || taskAnalysis.verificationMode === "focus") {
    return "low";
  }

  return input.riskLevel;
}

/**
 * Determine verifiability based on task clarity.
 */
function assessVerifiability(input: PolicyInput): "easy" | "moderate" | "hard" {
  const { taskAnalysis } = input;

  if (taskAnalysis.confidence >= 0.8) return "easy";
  if (taskAnalysis.confidence >= 0.6) return "moderate";
  return "hard";
}

/**
 * Core policy routing logic.
 * Maps task analysis to the appropriate verification policy.
 */
export function resolveVerificationPolicy(input: PolicyInput): VerificationPolicy {
  const { taskAnalysis } = input;

  // Try exact match first
  const key = `${taskAnalysis.activityType}:${taskAnalysis.verificationMode}`;
  if (POLICY_MAP[key]) {
    return POLICY_MAP[key];
  }

  // Fallback: try activity type only
  const fallbackKey = `${taskAnalysis.activityType}:self_reported`;
  if (POLICY_MAP[fallbackKey]) {
    return POLICY_MAP[fallbackKey];
  }

  // Final fallback: simple self-report
  return {
    mode: "self_reported",
    requiresCamera: false,
    requiresPhoto: false,
    requiresTimer: false,
    allowsSelfReport: true,
    confidenceThreshold: 0.6,
    description: "Default self-report verification",
  };
}

/**
 * Main entry point: resolve policy from task analysis.
 * Applies risk and verifiability adjustments.
 */
export function getVerificationPolicy(taskAnalysis: TaskAnalysis): VerificationPolicy {
  const riskLevel = assessRisk({ taskAnalysis, riskLevel: "low", verifiability: "moderate" });
  const verifiability = assessVerifiability({ taskAnalysis, riskLevel, verifiability: "moderate" });

  const policy = resolveVerificationPolicy({
    taskAnalysis,
    riskLevel,
    verifiability,
  });

  // High-risk adjustments
  if (riskLevel === "high") {
    policy.allowsSelfReport = false;
    if (!policy.requiresCamera && !policy.requiresPhoto) {
      // High-risk without camera or photo → force review
      return {
        ...policy,
        mode: "review",
        confidenceThreshold: 0.5,
        description: "High-risk claim requires human review",
      };
    }
  }

  // Low confidence adjustments
  if (taskAnalysis.confidence < 0.5) {
    return {
      ...policy,
      mode: "review",
      confidenceThreshold: 0.5,
      description: "Low classification confidence — escalated to review",
    };
  }

  return policy;
}
