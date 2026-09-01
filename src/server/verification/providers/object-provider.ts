import type {
  EvidenceKind,
  ProviderResult,
  QualityGateConfig,
  ObjectResult,
  DetectedObject,
} from "../../../types/evidence";
import type {
  VerificationProvider,
  ProviderCapabilities,
} from "../provider-registry";
import { globalProviderRegistry } from "../provider-registry";

export class ObjectProvider implements VerificationProvider {
  id = "object-provider";
  kind: EvidenceKind = "object";
  version = "1.0.0";

  supports(missionType: string): boolean {
    const supported = [
      "walk",
      "run",
      "hike",
      "bike",
      "swim",
      "drive",
      "shop",
      "cook",
      "clean",
      "organize",
      "garden",
      "fix",
      "build",
      "assemble",
      "paint",
      "draw",
      "craft",
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
      const objects = (signals.objects as DetectedObject[]) || [];
      const objectCount = objects.length;
      const targetLabel = (signals.targetLabel as string) || "";

      let targetMatch = false;
      let maxTargetScore = 0;

      if (targetLabel) {
        for (const obj of objects) {
          if (
            obj.label.toLowerCase().includes(targetLabel.toLowerCase()) ||
            targetLabel.toLowerCase().includes(obj.label.toLowerCase())
          ) {
            targetMatch = true;
            maxTargetScore = Math.max(maxTargetScore, obj.score);
          }
        }
      }

      const avgScore =
        objectCount > 0
          ? objects.reduce((sum, o) => sum + o.score, 0) / objectCount
          : 0;

      const base = 0.35;
      const countScore = Math.min(1, objectCount / 10) * 0.25;
      const scoreContrib = avgScore * 0.2;
      const targetContrib = targetMatch ? maxTargetScore * 0.2 : 0;

      let confidence = base + countScore + scoreContrib + targetContrib;
      confidence = Math.max(0, Math.min(0.95, confidence));
      const roundedConfidence = Math.round(confidence * 100) / 100;

      let decision: ProviderResult["decision"] = "supported";
      if (roundedConfidence < 0.3) decision = "rejected";
      else if (roundedConfidence < 0.5) decision = "uncertain";

      return {
        providerId: this.id,
        kind: this.kind,
        decision,
        confidence: roundedConfidence,
        observations: {
          objectCount,
          targetLabel,
          targetMatch,
          maxTargetScore: Math.round(maxTargetScore * 100) / 100,
          avgScore: Math.round(avgScore * 100) / 100,
          objects: objects.slice(0, 10),
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
      processingMsRange: { min: 300, max: 3000 },
      confidenceRange: { min: 0.3, max: 0.95 },
      supportedMissionTypes: [
        "walk",
        "run",
        "hike",
        "bike",
        "swim",
        "drive",
        "shop",
        "cook",
        "clean",
        "organize",
        "garden",
        "fix",
        "build",
        "assemble",
        "paint",
        "draw",
        "craft",
        "default",
      ],
    };
  }
}

export function registerObjectProvider(): void {
  globalProviderRegistry.register(new ObjectProvider());
}
