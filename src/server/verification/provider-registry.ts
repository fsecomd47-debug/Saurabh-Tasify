import type {
  EvidenceKind,
  ProviderDecision,
  ProviderResult,
  QualityGateConfig,
} from "../../types/evidence";

export interface VerificationProvider {
  id: string;
  kind: EvidenceKind;
  version: string;
  supports(missionType: string): boolean;
  initialize(config: Record<string, unknown>): Promise<void>;
  analyze(
    signals: Record<string, unknown>,
    policy: QualityGateConfig
  ): Promise<ProviderResult>;
  getCapabilities(): ProviderCapabilities;
}

export interface ProviderCapabilities {
  requiresCamera: boolean;
  requiresNetwork: boolean;
  processingMsRange: { min: number; max: number };
  confidenceRange: { min: number; max: number };
  supportedMissionTypes: string[];
}

export class ProviderRegistry {
  private providers: Map<string, VerificationProvider> = new Map();
  private kindIndex: Map<EvidenceKind, VerificationProvider[]> = new Map();

  register(provider: VerificationProvider): void {
    this.providers.set(provider.id, provider);

    const existing = this.kindIndex.get(provider.kind) || [];
    existing.push(provider);
    this.kindIndex.set(provider.kind, existing);
  }

  unregister(providerId: string): void {
    const provider = this.providers.get(providerId);
    if (provider) {
      this.providers.delete(providerId);
      const kindProviders = this.kindIndex.get(provider.kind) || [];
      const idx = kindProviders.findIndex((p) => p.id === providerId);
      if (idx >= 0) kindProviders.splice(idx, 1);
    }
  }

  getProvider(id: string): VerificationProvider | undefined {
    return this.providers.get(id);
  }

  getProvidersByKind(kind: EvidenceKind): VerificationProvider[] {
    return this.kindIndex.get(kind) || [];
  }

  getProvidersForMission(missionType: string): VerificationProvider[] {
    return Array.from(this.providers.values()).filter((p) =>
      p.supports(missionType)
    );
  }

  getRequiredProviders(
    missionType: string,
    requiredKinds: EvidenceKind[]
  ): VerificationProvider[] {
    const providers: VerificationProvider[] = [];
    for (const kind of requiredKinds) {
      const kindProviders = this.getProvidersByKind(kind);
      const matching = kindProviders.filter((p) => p.supports(missionType));
      if (matching.length > 0) {
        providers.push(matching[0]);
      }
    }
    return providers;
  }

  listAll(): VerificationProvider[] {
    return Array.from(this.providers.values());
  }

  getVersion(providerId: string): string {
    return this.providers.get(providerId)?.version || "unknown";
  }
}

export const globalProviderRegistry = new ProviderRegistry();
