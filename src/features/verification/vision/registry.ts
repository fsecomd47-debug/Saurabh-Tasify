"use client";

/**
 * PDR-4.2: Vision Provider Registry
 * Manages vision providers with capability-based selection and performance tracking.
 */

import type {
  VisionProvider,
  VisionProviderRegistry as IVisionProviderRegistry,
  ProviderRegistryEntry,
  VisionCapability,
  VisionRequirements,
  ProcessingMode,
} from "./types";

export class VisionProviderRegistry implements IVisionProviderRegistry {
  private providers: Map<string, ProviderRegistryEntry> = new Map();

  register(
    provider: VisionProvider,
    capabilities: VisionCapability[],
    processingModes: ProcessingMode[],
    priority: number = 100
  ): void {
    this.providers.set(provider.id, {
      provider,
      capabilities,
      processingModes,
      priority,
      enabled: true,
      failureCount: 0,
      averageLatencyMs: 0,
    });
  }

  unregister(providerId: string): void {
    this.providers.delete(providerId);
  }

  getProvider(
    requirements: VisionRequirements,
    processingMode: ProcessingMode
  ): VisionProvider | null {
    const candidates = Array.from(this.providers.values())
      .filter((entry) => {
        if (!entry.enabled) return false;
        if (!entry.processingModes.includes(processingMode)) return false;
        return requirements.capabilities.every((cap) =>
          entry.capabilities.includes(cap)
        );
      })
      .sort((a, b) => {
        // Sort by priority first, then by average latency
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.averageLatencyMs - b.averageLatencyMs;
      });

    return candidates.length > 0 ? candidates[0].provider : null;
  }

  getProvidersByCapability(capability: VisionCapability): ProviderRegistryEntry[] {
    return Array.from(this.providers.values()).filter((entry) =>
      entry.capabilities.includes(capability)
    );
  }

  updateMetrics(providerId: string, latencyMs: number, success: boolean): void {
    const entry = this.providers.get(providerId);
    if (!entry) return;

    // Update average latency with exponential moving average
    const alpha = 0.2;
    entry.averageLatencyMs =
      entry.averageLatencyMs * (1 - alpha) + latencyMs * alpha;

    if (!success) {
      entry.failureCount++;
    }

    entry.lastUsed = Date.now();
  }

  setEnabled(providerId: string, enabled: boolean): void {
    const entry = this.providers.get(providerId);
    if (entry) {
      entry.enabled = enabled;
    }
  }

  getState(): ProviderRegistryEntry[] {
    return Array.from(this.providers.values());
  }
}