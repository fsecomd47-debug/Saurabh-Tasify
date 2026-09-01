import type {
  EvidenceKind,
  ProviderResult,
  QualityGateConfig,
  OCRResult,
} from "../../../types/evidence";
import type {
  VerificationProvider,
  ProviderCapabilities,
} from "../provider-registry";
import { globalProviderRegistry } from "../provider-registry";

export class OCRProvider implements VerificationProvider {
  id = "ocr-provider";
  kind: EvidenceKind = "ocr";
  version = "1.0.0";

  supports(missionType: string): boolean {
    const supported = [
      "read",
      "study",
      "write",
      "journal",
      "review",
      "annotate",
      "proofread",
      "translate",
      "summarize",
      "research",
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
      const text = (signals.extractedText as string) || "";
      const fields = (signals.fields as Record<string, string>) || {};
      const language = (signals.language as string) || "en";

      const textLength = text.trim().length;
      const fieldCount = Object.keys(fields).length;

      const lengthScore = Math.min(1, textLength / 200);
      const fieldScore = Math.min(1, fieldCount / 5);
      const base = 0.40 + lengthScore * 0.30 + fieldScore * 0.20;

      const hasReasonableLength = textLength >= 20;
      const hasMultipleFields = fieldCount >= 2;
      const confidence = Math.min(
        0.95,
        base + (hasReasonableLength ? 0.05 : 0) + (hasMultipleFields ? 0.05 : 0)
      );

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
          textLength,
          fieldCount,
          language,
          lengthScore: Math.round(lengthScore * 100) / 100,
          fieldScore: Math.round(fieldScore * 100) / 100,
          hasReasonableLength,
          hasMultipleFields,
          textPreview: text.substring(0, 100),
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
        "read",
        "study",
        "write",
        "journal",
        "review",
        "annotate",
        "proofread",
        "translate",
        "summarize",
        "research",
      ],
    };
  }
}

export function registerOCRProvider(): void {
  globalProviderRegistry.register(new OCRProvider());
}
