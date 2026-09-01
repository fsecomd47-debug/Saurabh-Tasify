import type {
  EvidenceKind,
  ProviderResult,
  QualityGateConfig,
  VideoResult,
} from "../../../types/evidence";
import type {
  VerificationProvider,
  ProviderCapabilities,
} from "../provider-registry";
import { globalProviderRegistry } from "../provider-registry";

export class VideoProvider implements VerificationProvider {
  id = "video-provider";
  kind: EvidenceKind = "video";
  version = "1.0.0";

  supports(missionType: string): boolean {
    const supported = [
      "exercise",
      "workout",
      "yoga",
      "dance",
      "run",
      "walk",
      "hike",
      "bike",
      "swim",
      "cook",
      "bake",
      "craft",
      "build",
      "paint",
      "draw",
      "play",
      "practice",
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
      const durationMs = (signals.durationMs as number) ?? 0;
      const frameCount = (signals.frameCount as number) ?? 0;
      const keyFrames = (signals.keyFrames as Array<{
        timestampMs: number;
        hash: string;
        quality: number;
      }>) || [];
      const motionDetected = (signals.motionDetected as boolean) ?? false;
      const audioDetected = (signals.audioDetected as boolean) ?? false;
      const resolution = (signals.resolution as { width: number; height: number }) ?? {
        width: 640,
        height: 480,
      };

      const durationSec = durationMs / 1000;
      const hasMinimumDuration = durationSec >= 3;
      const hasFrames = frameCount > 0;
      const hasKeyFrames = keyFrames.length > 0;

      const avgKeyFrameQuality =
        keyFrames.length > 0
          ? keyFrames.reduce((sum, kf) => sum + kf.quality, 0) /
            keyFrames.length
          : 0;

      const resolutionScore = Math.min(
        1,
        (resolution.width * resolution.height) / (1920 * 1080)
      );

      const base = 0.3;
      const durationContrib = Math.min(1, durationSec / 30) * 0.2;
      const frameContrib = hasFrames ? 0.15 : 0;
      const keyFrameContrib = hasKeyFrames ? avgKeyFrameQuality * 0.15 : 0;
      const motionContrib = motionDetected ? 0.1 : 0;
      const resolutionContrib = resolutionScore * 0.1;

      let confidence =
        base +
        durationContrib +
        frameContrib +
        keyFrameContrib +
        motionContrib +
        resolutionContrib;
      confidence = Math.max(0, Math.min(0.95, confidence));
      const roundedConfidence = Math.round(confidence * 100) / 100;

      let decision: ProviderResult["decision"] = "supported";
      if (!hasMinimumDuration || !hasFrames) decision = "rejected";
      else if (roundedConfidence < 0.3) decision = "rejected";
      else if (roundedConfidence < 0.5) decision = "uncertain";

      return {
        providerId: this.id,
        kind: this.kind,
        decision,
        confidence: roundedConfidence,
        observations: {
          durationMs,
          durationSec: Math.round(durationSec * 10) / 10,
          frameCount,
          keyFrameCount: keyFrames.length,
          avgKeyFrameQuality: Math.round(avgKeyFrameQuality * 100) / 100,
          motionDetected,
          audioDetected,
          resolution,
          resolutionScore: Math.round(resolutionScore * 100) / 100,
          hasMinimumDuration,
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
      processingMsRange: { min: 1000, max: 10000 },
      confidenceRange: { min: 0.3, max: 0.95 },
      supportedMissionTypes: [
        "exercise",
        "workout",
        "yoga",
        "dance",
        "run",
        "walk",
        "hike",
        "bike",
        "swim",
        "cook",
        "bake",
        "craft",
        "build",
        "paint",
        "draw",
        "play",
        "practice",
        "default",
      ],
    };
  }
}

export function registerVideoProvider(): void {
  globalProviderRegistry.register(new VideoProvider());
}
