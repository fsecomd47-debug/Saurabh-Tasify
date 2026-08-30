/**
 * PDR-4.1 §61: Feature Flags
 * Controlled rollout flags for PDR-4.1 subsystems.
 * Allows independent testing of each verification subsystem.
 */

export type FeatureFlag =
  | "TASK_AI_ANALYSIS"
  | "TASK_NORMALIZATION"
  | "POSE_VERIFICATION"
  | "SQUAT_VERIFICATION"
  | "LUNGE_VERIFICATION"
  | "FOCUS_VERIFICATION"
  | "TIMER_VERIFICATION"
  | "PHOTO_EVIDENCE"
  | "SCENE_COMPARISON"
  | "OCR_DOCUMENT"
  | "EXTERNAL_EVIDENCE"
  | "VISION_FEEDBACK"
  | "VERIFICATION_POLICY_ENGINE"
  | "PROVIDER_ARCHITECTURE"
  | "ACTIVITY_TAXONOMY"
  | "PHOTO_QUALITY_ENGINE"
  | "COMPOUND_MISSIONS"
  | "MISSION_CHAINS"
  | "ANTI_CHEAT_ADVANCED"
  | "ADAPTIVE_DIFFICULTY"
  | "OBSERVABILITY_LOGGING";

type FlagConfig = {
  enabled: boolean;
  description: string;
  rolloutPercentage?: number;
};

/**
 * Default flag configuration.
 * All flags enabled by default in development.
 * Must be explicitly configured for production.
 */
const DEFAULT_FLAGS: Record<FeatureFlag, FlagConfig> = {
  TASK_AI_ANALYSIS: {
    enabled: true,
    description: "AI-powered task analysis and classification",
  },
  TASK_NORMALIZATION: {
    enabled: true,
    description: "Task normalization to canonical activity taxonomy",
  },
  POSE_VERIFICATION: {
    enabled: true,
    description: "Camera-based pose verification for exercises",
  },
  SQUAT_VERIFICATION: {
    enabled: true,
    description: "Camera-based squat verification with depth detection",
  },
  LUNGE_VERIFICATION: {
    enabled: true,
    description: "Camera-based lunge verification with alignment checks",
  },
  FOCUS_VERIFICATION: {
    enabled: true,
    description: "Focus session verification with presence tracking",
  },
  TIMER_VERIFICATION: {
    enabled: true,
    description: "Simple timer-based verification for fixed-duration activities",
  },
  PHOTO_EVIDENCE: {
    enabled: true,
    description: "Photo evidence submission and quality checks",
  },
  SCENE_COMPARISON: {
    enabled: true,
    description: "Before/after scene comparison for visual result tasks",
  },
  OCR_DOCUMENT: {
    enabled: true,
    description: "OCR document capture and text extraction",
  },
  EXTERNAL_EVIDENCE: {
    enabled: true,
    description: "External evidence submission for result-based tasks",
  },
  VISION_FEEDBACK: {
    enabled: true,
    description: "Real-time vision feedback during camera missions",
  },
  VERIFICATION_POLICY_ENGINE: {
    enabled: true,
    description: "Policy engine for verification mode routing",
  },
  PROVIDER_ARCHITECTURE: {
    enabled: true,
    description: "Pluggable verification provider architecture",
  },
  ACTIVITY_TAXONOMY: {
    enabled: true,
    description: "Canonical activity taxonomy for task normalization",
  },
  PHOTO_QUALITY_ENGINE: {
    enabled: true,
    description: "Photo quality assessment before submission",
  },
  COMPOUND_MISSIONS: {
    enabled: true,
    description: "Multi-step compound missions with sequential verification",
  },
  MISSION_CHAINS: {
    enabled: true,
    description: "Mission chains linking related missions together",
  },
  ANTI_CHEAT_ADVANCED: {
    enabled: true,
    description: "Advanced anti-cheat with anomaly detection and pattern analysis",
  },
  ADAPTIVE_DIFFICULTY: {
    enabled: true,
    description: "Adaptive difficulty based on user performance history",
  },
  OBSERVABILITY_LOGGING: {
    enabled: true,
    description: "Structured event logging for verification pipeline",
  },
};

class FeatureFlagManager {
  private flags: Record<FeatureFlag, FlagConfig>;

  constructor() {
    this.flags = { ...DEFAULT_FLAGS };

    // Override from environment variables
    for (const flag of Object.keys(this.flags) as FeatureFlag[]) {
      const envKey = `FLAG_${flag}`;
      const envValue = process.env[envKey];
      if (envValue !== undefined) {
        this.flags[flag].enabled = envValue === "true" || envValue === "1";
      }
    }
  }

  /**
   * Check if a feature flag is enabled.
   */
  isEnabled(flag: FeatureFlag): boolean {
    return this.flags[flag]?.enabled ?? false;
  }

  /**
   * Get all flag states.
   */
  getAllFlags(): Record<FeatureFlag, boolean> {
    const result: Record<string, boolean> = {};
    for (const [key, config] of Object.entries(this.flags)) {
      result[key as FeatureFlag] = config.enabled;
    }
    return result as Record<FeatureFlag, boolean>;
  }

  /**
   * Enable a flag (for runtime toggle).
   */
  enable(flag: FeatureFlag): void {
    if (this.flags[flag]) {
      this.flags[flag].enabled = true;
    }
  }

  /**
   * Disable a flag (for runtime toggle).
   */
  disable(flag: FeatureFlag): void {
    if (this.flags[flag]) {
      this.flags[flag].enabled = false;
    }
  }
}

/**
 * Singleton feature flag manager.
 */
export const featureFlags = new FeatureFlagManager();
