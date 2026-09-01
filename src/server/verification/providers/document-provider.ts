import type {
  EvidenceKind,
  ProviderResult,
  QualityGateConfig,
  DocumentResult,
} from "../../../types/evidence";
import type {
  VerificationProvider,
  ProviderCapabilities,
} from "../provider-registry";
import { globalProviderRegistry } from "../provider-registry";

export class DocumentProvider implements VerificationProvider {
  id = "document-provider";
  kind: EvidenceKind = "document";
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
      "learn",
      "practice",
      "memorize",
      "recite",
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
      const textExtracted = (signals.textExtracted as string) || "";
      const fields = (signals.fields as Record<string, string>) || {};
      const documentType = (signals.documentType as string) || "unknown";

      const textLength = textExtracted.trim().length;
      const fieldCount = Object.keys(fields).length;

      const lengthScore = Math.min(1, textLength / 300);
      const fieldScore = Math.min(1, fieldCount / 5);
      const base = 0.35;
      const lengthContrib = lengthScore * 0.3;
      const fieldContrib = fieldScore * 0.25;

      let confidence = base + lengthContrib + fieldContrib;
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
          documentType,
          textLength,
          fieldCount,
          lengthScore: Math.round(lengthScore * 100) / 100,
          fieldScore: Math.round(fieldScore * 100) / 100,
          textPreview: textExtracted.substring(0, 100),
          fields: Object.keys(fields).slice(0, 10),
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
        "learn",
        "practice",
        "memorize",
        "recite",
        "default",
      ],
    };
  }
}

export function registerDocumentProvider(): void {
  globalProviderRegistry.register(new DocumentProvider());
}
