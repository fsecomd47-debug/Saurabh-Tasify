import type {
  EvidenceKind,
  ProviderResult,
  QualityGateConfig,
  PhotoResult,
} from "../../../types/evidence";
import type {
  VerificationProvider,
  ProviderCapabilities,
} from "../provider-registry";
import { globalProviderRegistry } from "../provider-registry";

export class PhotoProvider implements VerificationProvider {
  id = "photo-provider";
  kind: EvidenceKind = "photo";
  version = "1.0.0";

  supports(missionType: string): boolean {
    const supported = [
      "cook",
      "paint",
      "draw",
      "craft",
      "build",
      "fix",
      "assemble",
      "garden",
      "plant",
      "decorate",
      "organize",
      "clean",
      "exercise",
      "walk",
      "run",
      "yoga",
      "meditation",
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
      const faceDetected = (signals.faceDetected as boolean) ?? false;
      const faceCount = (signals.faceCount as number) ?? 0;
      const lightingScore = (signals.lightingScore as number) ?? 0.5;
      const blurScore = (signals.blurScore as number) ?? 0.5;
      const resolution = (signals.resolution as { width: number; height: number }) ?? {
        width: 640,
        height: 480,
      };
      const composition = (signals.composition as number) ?? 0.5;

      const resolutionScore = Math.min(
        1,
        (resolution.width * resolution.height) / (1920 * 1080)
      );

      const lightingNorm = Math.max(0, Math.min(1, lightingScore));
      const blurNorm = Math.max(0, Math.min(1, 1 - blurScore));

      const base = 0.3;
      const lightingContrib = lightingNorm * 0.25;
      const blurContrib = blurNorm * 0.25;
      const resolutionContrib = resolutionScore * 0.15;
      const compositionContrib = composition * 0.05;

      let confidence = base + lightingContrib + blurContrib + resolutionContrib + compositionContrib;

      if (faceDetected && faceCount === 1) confidence += 0.05;
      if (resolution.width >= 1280 && resolution.height >= 720) confidence += 0.05;

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
          faceDetected,
          faceCount,
          lightingScore: lightingNorm,
          blurScore: blurNorm,
          resolution,
          composition,
          resolutionScore: Math.round(resolutionScore * 100) / 100,
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
      processingMsRange: { min: 200, max: 2000 },
      confidenceRange: { min: 0.3, max: 0.95 },
      supportedMissionTypes: [
        "cook",
        "paint",
        "draw",
        "craft",
        "build",
        "fix",
        "assemble",
        "garden",
        "plant",
        "decorate",
        "organize",
        "clean",
        "exercise",
        "walk",
        "run",
        "yoga",
        "meditation",
        "default",
      ],
    };
  }
}

export function registerPhotoProvider(): void {
  globalProviderRegistry.register(new PhotoProvider());
}
