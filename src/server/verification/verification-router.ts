import { globalProviderRegistry, type VerificationProvider } from "./provider-registry";
import { EvidenceSessionManager } from "./evidence-session";
import type {
  EvidenceKind,
  EvidenceSession,
  EvidenceManifest,
  ProviderResult,
  VerificationPolicy,
  VerificationFeedback,
  ProviderFeedback,
  MissionVerificationRequest,
  MissionVerificationResponse,
} from "../../types/evidence";

export interface RouteDecision {
  providerId: string;
  kind: EvidenceKind;
  priority: number;
  required: boolean;
}

export class VerificationRouter {
  static routeEvidence(
    manifest: EvidenceManifest,
    policy: VerificationPolicy
  ): RouteDecision[] {
    const decisions: RouteDecision[] = [];

    for (const kind of policy.requiredProviders) {
      const providers = globalProviderRegistry.getProvidersByKind(kind);
      const matching = providers.filter((p) =>
        p.supports(policy.missionType)
      );

      if (matching.length === 0) {
        continue;
      }

      const best = matching[0];
      decisions.push({
        providerId: best.id,
        kind,
        priority: decisions.length,
        required: true,
      });
    }

    for (const kind of policy.optionalProviders) {
      const providers = globalProviderRegistry.getProvidersByKind(kind);
      const matching = providers.filter((p) =>
        p.supports(policy.missionType)
      );

      if (matching.length > 0) {
        decisions.push({
          providerId: matching[0].id,
          kind,
          priority: decisions.length,
          required: false,
        });
      }
    }

    return decisions;
  }

  static async processProvider(
    provider: VerificationProvider,
    signals: Record<string, unknown>,
    policy: VerificationPolicy
  ): Promise<ProviderResult> {
    const start = Date.now();
    try {
      const result = await provider.analyze(signals, policy.qualityGate);
      result.processingMs = Date.now() - start;
      result.processedAt = new Date();
      return result;
    } catch (error) {
      return {
        providerId: provider.id,
        kind: provider.kind,
        decision: "rejected",
        confidence: 0,
        observations: { error: String(error) },
        processedAt: new Date(),
        processingMs: Date.now() - start,
      };
    }
  }

  static async processEvidenceManifest(
    manifest: EvidenceManifest,
    session: EvidenceSession,
    policy: VerificationPolicy
  ): Promise<{
    providerResults: ProviderResult[];
    overallDecision: "supported" | "uncertain" | "rejected";
    overallConfidence: number;
  }> {
    const routeDecisions = this.routeEvidence(manifest, policy);
    const providerResults: ProviderResult[] = [];

    for (const decision of routeDecisions) {
      const provider = globalProviderRegistry.getProvider(decision.providerId);
      if (!provider) continue;

      const evidenceItem = manifest.evidenceItems.find(
        (item) => item.kind === decision.kind
      );

      if (!evidenceItem && decision.required) {
        providerResults.push({
          providerId: decision.providerId,
          kind: decision.kind,
          decision: "rejected",
          confidence: 0,
          observations: { error: "Required evidence item missing" },
          processedAt: new Date(),
          processingMs: 0,
        });
        continue;
      }

      if (!evidenceItem) continue;

      const result = await this.processProvider(
        provider,
        evidenceItem.derivedSignals,
        policy
      );
      providerResults.push(result);
    }

    const requiredResults = providerResults.filter(
      (_, i) => routeDecisions[i]?.required
    );

    const hasRejection = requiredResults.some((r) => r.decision === "rejected");
    const hasUncertainty = requiredResults.some(
      (r) => r.decision === "uncertain"
    );

    let overallDecision: "supported" | "uncertain" | "rejected" = "supported";
    if (hasRejection) overallDecision = "rejected";
    else if (hasUncertainty) overallDecision = "uncertain";

    const avgConfidence =
      requiredResults.length > 0
        ? requiredResults.reduce((sum, r) => sum + r.confidence, 0) /
          requiredResults.length
        : 0;

    const overallConfidence = Math.round(avgConfidence * 100) / 100;

    return { providerResults, overallDecision, overallConfidence };
  }

  static buildFeedback(
    providerResults: ProviderResult[],
    policy: VerificationPolicy
  ): VerificationFeedback {
    const providerFeedbacks: ProviderFeedback[] = providerResults.map((r) => ({
      providerId: r.providerId,
      kind: r.kind,
      decision: r.decision,
      confidence: r.confidence,
      message: this.getProviderMessage(r),
      details: r.observations,
    }));

    const suggestions = this.generateSuggestions(providerResults, policy);
    const summary = this.generateSummary(providerResults);

    return {
      summary,
      providerFeedbacks,
      suggestions,
      humanReadable: this.toHumanReadable(providerResults, suggestions),
    };
  }

  private static getProviderMessage(result: ProviderResult): string {
    if (result.decision === "supported") {
      return `${result.kind} verification passed with ${Math.round(result.confidence * 100)}% confidence`;
    }
    if (result.decision === "uncertain") {
      return `${result.kind} verification uncertain - please retry`;
    }
    return `${result.kind} verification failed`;
  }

  private static generateSuggestions(
    results: ProviderResult[],
    policy: VerificationPolicy
  ): string[] {
    const suggestions: string[] = [];

    for (const result of results) {
      if (result.decision === "rejected" || result.decision === "uncertain") {
        switch (result.kind) {
          case "ocr":
            suggestions.push(
              "Ensure text is clearly visible and well-lit"
            );
            suggestions.push("Hold the camera steady and focused");
            break;
          case "photo":
            suggestions.push("Ensure good lighting and clear focus");
            suggestions.push("Include the subject clearly in frame");
            break;
          case "pose":
            suggestions.push("Position yourself so your full body is visible");
            suggestions.push("Ensure adequate space around you");
            break;
          case "object":
            suggestions.push("Ensure the target object is clearly visible");
            suggestions.push("Reduce clutter in the frame");
            break;
          case "scene":
            suggestions.push(
              "Take before and after photos from the same angle"
            );
            break;
          case "video":
            suggestions.push("Record a steady, clear video");
            suggestions.push("Ensure adequate lighting");
            break;
          case "document":
            suggestions.push("Place the document on a flat surface");
            suggestions.push("Ensure all text is readable");
            break;
        }
      }
    }

    if (policy.confidenceThreshold > 0.7) {
      suggestions.push(
        "This mission requires high confidence - take extra care with evidence quality"
      );
    }

    return suggestions;
  }

  private static generateSummary(results: ProviderResult[]): string {
    const supported = results.filter((r) => r.decision === "supported").length;
    const total = results.length;

    if (supported === total) return "All verifications passed";
    if (supported === 0) return "No verifications passed";
    return `${supported}/${total} verifications passed`;
  }

  private static toHumanReadable(
    results: ProviderResult[],
    suggestions: string[]
  ): string {
    const lines: string[] = [];

    for (const result of results) {
      const icon =
        result.decision === "supported"
          ? "PASS"
          : result.decision === "uncertain"
          ? "WARN"
          : "FAIL";
      lines.push(
        `[${icon}] ${result.kind}: ${Math.round(result.confidence * 100)}% confidence`
      );
    }

    if (suggestions.length > 0) {
      lines.push("");
      lines.push("Suggestions:");
      for (const s of suggestions) {
        lines.push(`  - ${s}`);
      }
    }

    return lines.join("\n");
  }
}
