import type {
  EvidenceKind,
  ProviderResult,
  QualityGateConfig,
  PoseResult,
  PoseLandmark,
} from "../../../types/evidence";
import type {
  VerificationProvider,
  ProviderCapabilities,
} from "../provider-registry";
import { globalProviderRegistry } from "../provider-registry";

export class PoseProvider implements VerificationProvider {
  id = "pose-provider";
  kind: EvidenceKind = "pose";
  version = "1.0.0";

  supports(missionType: string): boolean {
    const supported = [
      "pushups",
      "push-ups",
      "pushup",
      "squats",
      "squat",
      "lunges",
      "lunge",
      "plank",
      "burpees",
      "jumping-jacks",
      "jumpingjacks",
      "mountain-climbers",
      "mountainclimbers",
      "sit-ups",
      "situps",
      "crunches",
      "pull-ups",
      "pullups",
      "dips",
      "yoga",
      "stretching",
      "exercise",
      "workout",
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
      const landmarks = (signals.landmarks as PoseLandmark[]) || [];
      const formScore = (signals.formScore as number) ?? 0;
      const repCount = (signals.repCount as number) ?? 0;
      const invalidRepCount = (signals.invalidRepCount as number) ?? 0;
      const bodyAlignment = (signals.bodyAlignment as number) ?? 0;
      const targetReps = (signals.targetReps as number) ?? 10;

      const hasLandmarks = landmarks.length > 0;
      const progressRatio = targetReps > 0 ? Math.min(1, repCount / targetReps) : 0;
      const repAccuracy =
        repCount + invalidRepCount > 0
          ? repCount / (repCount + invalidRepCount)
          : 0;

      const base = 0.3;
      const formContrib = formScore * 0.25;
      const progressContrib = progressRatio * 0.2;
      const alignmentContrib = bodyAlignment * 0.15;
      const landmarkContrib = hasLandmarks ? 0.1 : 0;

      let confidence =
        base + formContrib + progressContrib + alignmentContrib + landmarkContrib;
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
          landmarkCount: landmarks.length,
          formScore: Math.round(formScore * 100) / 100,
          repCount,
          invalidRepCount,
          bodyAlignment: Math.round(bodyAlignment * 100) / 100,
          progressRatio: Math.round(progressRatio * 100) / 100,
          repAccuracy: Math.round(repAccuracy * 100) / 100,
          targetReps,
          hasLandmarks,
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
      processingMsRange: { min: 100, max: 1000 },
      confidenceRange: { min: 0.3, max: 0.95 },
      supportedMissionTypes: [
        "pushups",
        "push-ups",
        "pushup",
        "squats",
        "squat",
        "lunges",
        "lunge",
        "plank",
        "burpees",
        "jumping-jacks",
        "jumpingjacks",
        "mountain-climbers",
        "mountainclimbers",
        "sit-ups",
        "situps",
        "crunches",
        "pull-ups",
        "pullups",
        "dips",
        "yoga",
        "stretching",
        "exercise",
        "workout",
        "default",
      ],
    };
  }
}

export function registerPoseProvider(): void {
  globalProviderRegistry.register(new PoseProvider());
}
