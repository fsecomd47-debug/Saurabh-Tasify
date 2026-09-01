import type {
  VerificationPolicy,
  QualityGateConfig,
  AntiCheatConfig,
  PrivacyConfig,
  EvidenceKind,
} from "../../types/evidence";

const DEFAULT_QUALITY_GATE: QualityGateConfig = {
  minResolution: { width: 640, height: 480 },
  maxBlurScore: 0.5,
  minLightingScore: 0.3,
  requireFaceDetection: false,
  maxFaceCount: 5,
  requireTextDetection: false,
  minTextLength: 10,
};

const STRICT_QUALITY_GATE: QualityGateConfig = {
  minResolution: { width: 1280, height: 720 },
  maxBlurScore: 0.3,
  minLightingScore: 0.5,
  requireFaceDetection: true,
  maxFaceCount: 1,
  requireTextDetection: true,
  minTextLength: 20,
};

const RELAXED_QUALITY_GATE: QualityGateConfig = {
  minResolution: { width: 320, height: 240 },
  maxBlurScore: 0.8,
  minLightingScore: 0.1,
  requireFaceDetection: false,
  maxFaceCount: 10,
  requireTextDetection: false,
  minTextLength: 0,
};

const DEFAULT_ANTI_CHEAT: AntiCheatConfig = {
  requireSessionNonce: true,
  requireLivenessProof: true,
  maxSubmissionAgeMs: 15 * 60 * 1000,
  requireFingerprint: true,
  replayDetection: true,
  temporalContinuity: true,
  maxEventsPerSession: 100,
};

const DEFAULT_PRIVACY: PrivacyConfig = {
  storeRawMedia: false,
  rawMediaRetentionMs: 0,
  piiFields: ["face", "name", "address"],
  anonymizeLogs: true,
};

type MissionPolicyMap = Record<string, Partial<VerificationPolicy>>;

const MISSION_POLICIES: MissionPolicyMap = {
  pushups: {
    requiredProviders: ["pose"],
    optionalProviders: ["photo"],
    minProvidersRequired: 1,
    confidenceThreshold: 0.6,
    qualityGate: { ...DEFAULT_QUALITY_GATE, requireFaceDetection: false },
  },
  squats: {
    requiredProviders: ["pose"],
    optionalProviders: ["photo"],
    minProvidersRequired: 1,
    confidenceThreshold: 0.6,
    qualityGate: { ...DEFAULT_QUALITY_GATE, requireFaceDetection: false },
  },
  lunges: {
    requiredProviders: ["pose"],
    optionalProviders: ["photo"],
    minProvidersRequired: 1,
    confidenceThreshold: 0.6,
    qualityGate: { ...DEFAULT_QUALITY_GATE, requireFaceDetection: false },
  },
  read: {
    requiredProviders: ["ocr"],
    optionalProviders: ["photo"],
    minProvidersRequired: 1,
    confidenceThreshold: 0.5,
    qualityGate: {
      ...DEFAULT_QUALITY_GATE,
      requireTextDetection: true,
      minTextLength: 50,
    },
  },
  study: {
    requiredProviders: ["ocr"],
    optionalProviders: ["photo"],
    minProvidersRequired: 1,
    confidenceThreshold: 0.5,
    qualityGate: {
      ...DEFAULT_QUALITY_GATE,
      requireTextDetection: true,
      minTextLength: 50,
    },
  },
  write: {
    requiredProviders: ["ocr"],
    optionalProviders: ["photo"],
    minProvidersRequired: 1,
    confidenceThreshold: 0.5,
    qualityGate: {
      ...DEFAULT_QUALITY_GATE,
      requireTextDetection: true,
      minTextLength: 30,
    },
  },
  clean: {
    requiredProviders: ["scene"],
    optionalProviders: ["photo"],
    minProvidersRequired: 1,
    confidenceThreshold: 0.5,
    qualityGate: DEFAULT_QUALITY_GATE,
  },
  organize: {
    requiredProviders: ["scene"],
    optionalProviders: ["photo"],
    minProvidersRequired: 1,
    confidenceThreshold: 0.5,
    qualityGate: DEFAULT_QUALITY_GATE,
  },
  cook: {
    requiredProviders: ["photo"],
    optionalProviders: ["ocr"],
    minProvidersRequired: 1,
    confidenceThreshold: 0.5,
    qualityGate: DEFAULT_QUALITY_GATE,
  },
  exercise: {
    requiredProviders: ["pose"],
    optionalProviders: ["photo", "video"],
    minProvidersRequired: 1,
    confidenceThreshold: 0.6,
    qualityGate: DEFAULT_QUALITY_GATE,
  },
  meditation: {
    requiredProviders: [],
    optionalProviders: ["photo"],
    minProvidersRequired: 0,
    confidenceThreshold: 0.4,
    qualityGate: RELAXED_QUALITY_GATE,
  },
  walk: {
    requiredProviders: ["object"],
    optionalProviders: ["photo"],
    minProvidersRequired: 1,
    confidenceThreshold: 0.5,
    qualityGate: DEFAULT_QUALITY_GATE,
  },
  run: {
    requiredProviders: ["object"],
    optionalProviders: ["photo"],
    minProvidersRequired: 1,
    confidenceThreshold: 0.5,
    qualityGate: DEFAULT_QUALITY_GATE,
  },
  default: {
    requiredProviders: [],
    optionalProviders: ["photo"],
    minProvidersRequired: 0,
    confidenceThreshold: 0.4,
    qualityGate: RELAXED_QUALITY_GATE,
  },
};

export class MissionPolicyEngine {
  static getPolicy(
    missionType: string,
    difficulty?: string
  ): VerificationPolicy {
    const typeKey = missionType.toLowerCase().trim();
    const overrides = MISSION_POLICIES[typeKey] || MISSION_POLICIES["default"];

    const difficultyMultiplier =
      difficulty === "elite"
        ? 1.3
        : difficulty === "hard"
        ? 1.15
        : difficulty === "medium"
        ? 1.0
        : 0.85;

    const policy: VerificationPolicy = {
      id: `policy-${typeKey}-${difficulty || "default"}`,
      missionType: typeKey,
      requiredProviders: overrides.requiredProviders || [],
      optionalProviders: overrides.optionalProviders || [],
      minProvidersRequired: overrides.minProvidersRequired || 0,
      qualityGate: { ...DEFAULT_QUALITY_GATE, ...overrides.qualityGate },
      confidenceThreshold: Math.min(
        1,
        (overrides.confidenceThreshold || 0.4) * difficultyMultiplier
      ),
      antiCheat: { ...DEFAULT_ANTI_CHEAT },
      privacy: { ...DEFAULT_PRIVACY },
      version: "1.0.0",
    };

    if (difficulty === "elite") {
      policy.qualityGate = { ...STRICT_QUALITY_GATE, ...overrides.qualityGate };
      policy.antiCheat.requireSessionNonce = true;
      policy.antiCheat.requireLivenessProof = true;
      policy.antiCheat.replayDetection = true;
    }

    return policy;
  }

  static evaluatePolicy(
    policy: VerificationPolicy,
    providerResults: Array<{ kind: EvidenceKind; decision: string; confidence: number }>
  ): {
    passed: boolean;
    reasons: string[];
    requiredMet: boolean;
    confidenceMet: boolean;
  } {
    const reasons: string[] = [];
    let requiredMet = true;
    let confidenceMet = true;

    for (const requiredKind of policy.requiredProviders) {
      const result = providerResults.find((r) => r.kind === requiredKind);
      if (!result) {
        requiredMet = false;
        reasons.push(`Required provider ${requiredKind} not executed`);
      } else if (result.decision === "rejected") {
        requiredMet = false;
        reasons.push(`Required provider ${requiredKind} rejected`);
      }
    }

    const requiredResults = providerResults.filter((r) =>
      policy.requiredProviders.includes(r.kind)
    );

    if (requiredResults.length > 0) {
      const avgConfidence =
        requiredResults.reduce((sum, r) => sum + r.confidence, 0) /
        requiredResults.length;

      if (avgConfidence < policy.confidenceThreshold) {
        confidenceMet = false;
        reasons.push(
          `Average confidence ${avgConfidence.toFixed(2)} below threshold ${policy.confidenceThreshold}`
        );
      }
    }

    const executedCount = providerResults.length;
    if (executedCount < policy.minProvidersRequired) {
      reasons.push(
        `Only ${executedCount}/${policy.minProvidersRequired} required providers executed`
      );
    }

    return {
      passed: requiredMet && confidenceMet,
      reasons,
      requiredMet,
      confidenceMet,
    };
  }

  static listPolicies(): string[] {
    return Object.keys(MISSION_POLICIES);
  }

  static hasPolicy(missionType: string): boolean {
    return missionType.toLowerCase().trim() in MISSION_POLICIES;
  }
}
