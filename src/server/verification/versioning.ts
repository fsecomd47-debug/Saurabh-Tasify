import "server-only";

/**
 * PDR-4 §80/§123: Provider, model and policy versioning.
 * Stored alongside every verification result so future regressions
 * can be traced back to the exact verification stack that produced it.
 */

export const POLICY_VERSION = "pdr4.1";

export type VerificationStack = {
  policyVersion: string;
  providers: { id: string; providerVersion: string; modelVersion?: string }[];
};

type ProviderVersion = {
  providerVersion: string;
  modelVersion?: string;
};

const CLIENT_PROVIDERS: Record<string, ProviderVersion> = {
  pose_landmarker: { providerVersion: "2.0.0", modelVersion: "pose_landmarker_lite" },
  object_detector: { providerVersion: "1.1.0", modelVersion: "efficientdet_lite0_coco" },
  scene_comparator: { providerVersion: "1.1.0", modelVersion: "grid-histogram-v2" },
  document_ocr: { providerVersion: "1.0.0", modelVersion: "tesseract-eng" },
  quality_analyzer: { providerVersion: "1.1.0", modelVersion: "heuristic-v2" },
  focus_tracker: { providerVersion: "1.1.0", modelVersion: "presence-v2" },
};

export function resolveProviderVersions(providerIds: string[]): VerificationStack["providers"] {
  return providerIds
    .map((id) => {
      const known = CLIENT_PROVIDERS[id];
      return known
        ? { id, providerVersion: known.providerVersion, modelVersion: known.modelVersion }
        : { id, providerVersion: "unknown" };
    });
}

export function currentPolicyVersion(): string {
  return POLICY_VERSION;
}
