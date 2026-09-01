import type {
  EvidenceKind,
  ProviderResult,
  QualityGateConfig,
  SceneResult,
} from "../../../types/evidence";
import type {
  VerificationProvider,
  ProviderCapabilities,
} from "../provider-registry";
import { globalProviderRegistry } from "../provider-registry";

export class SceneProvider implements VerificationProvider {
  id = "scene-provider";
  kind: EvidenceKind = "scene";
  version = "1.0.0";

  supports(missionType: string): boolean {
    const supported = [
      "clean",
      "organize",
      "tidy",
      "declutter",
      "arrange",
      "redecorate",
      "renovate",
      "landscape",
      "garden",
      "mow",
      "sweep",
      "mop",
      "vacuum",
      "wash",
      "polish",
      "scrub",
      "wipe",
      "dust",
      "default",
    ];
    return supported.includes(missionType.toLowerCase());
  }

  async initialize(_config: Record<string, unknown>): Promise<void> {}

  async analyze(
    signals: Record<string, unknown>,
    _policy: QualityGateConfig
  ): Promise<ProviderResult> {
    const start = Date.now();

    try {
      const beforeHash = (signals.beforeHash as string) || "";
      const afterHash = (signals.afterHash as string) || "";
      const changeScore = (signals.changeScore as number) ?? 0;
      const changeRegions =
        (signals.changeRegions as Array<{
          x: number;
          y: number;
          width: number;
          height: number;
        }>) || [];

      const hasBothImages = beforeHash.length > 0 && afterHash.length > 0;
      const changeDetected = changeScore > 0.1;
      const significantChange = changeScore > 0.3;
      const hasChangeRegions = changeRegions.length > 0;

      const base = 0.3;
      const changeContrib = Math.min(1, changeScore) * 0.35;
      const regionContrib = hasChangeRegions ? 0.15 : 0;
      const bothImagesContrib = hasBothImages ? 0.1 : 0;
      const significantContrib = significantChange ? 0.1 : 0;

      let confidence =
        base + changeContrib + regionContrib + bothImagesContrib + significantContrib;
      confidence = Math.max(0, Math.min(0.95, confidence));
      const roundedConfidence = Math.round(confidence * 100) / 100;

      let decision: ProviderResult["decision"] = "supported";
      if (!hasBothImages) decision = "rejected";
      else if (roundedConfidence < 0.3) decision = "rejected";
      else if (roundedConfidence < 0.5) decision = "uncertain";

      return {
        providerId: this.id,
        kind: this.kind,
        decision,
        confidence: roundedConfidence,
        observations: {
          hasBothImages,
          beforeHashPreview: beforeHash.substring(0, 16),
          afterHashPreview: afterHash.substring(0, 16),
          changeScore: Math.round(changeScore * 100) / 100,
          changeDetected,
          significantChange,
          changeRegionCount: changeRegions.length,
          changeRegions: changeRegions.slice(0, 5),
        },
        processedAt: new Date(),
        processingMs: Date.now() - start,
      };
    } catch (error) {
      return {
        providerId: this.id,
        kind: this.kind,
        decision: "rejected",
        confidence: 0,
        observations: { error: String(error) },
        processedAt: new Date(),
        processingMs: Date.now() - start,
      };
    }
  }

  getCapabilities(): ProviderCapabilities {
    return {
      requiresCamera: true,
      requiresNetwork: false,
      processingMsRange: { min: 500, max: 5000 },
      confidenceRange: { min: 0.3, max: 0.95 },
      supportedMissionTypes: [
        "clean",
        "organize",
        "tidy",
        "declutter",
        "arrange",
        "redecorate",
        "renovate",
        "landscape",
        "garden",
        "mow",
        "sweep",
        "mop",
        "vacuum",
        "wash",
        "polish",
        "scrub",
        "wipe",
        "dust",
        "default",
      ],
    };
  }
}

export function registerSceneProvider(): void {
  globalProviderRegistry.register(new SceneProvider());
}
