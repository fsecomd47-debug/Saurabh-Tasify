/**
 * PDR-4.2 §4: Vision Provider Registry
 * Central registry for vision providers.
 * Resolves providers based on mission requirements.
 */

import type {
  VisionProviderType,
  VisionRequirements,
} from "./types";
import type { VisionProvider } from "./provider-interface";

class VisionProviderRegistryImpl {
  private providers: Map<VisionProviderType, VisionProvider[]> = new Map();

  /**
   * Register a vision provider.
   */
  register(provider: VisionProvider): void {
    const existing = this.providers.get(provider.type) ?? [];
    existing.push(provider);
    this.providers.set(provider.type, existing);
  }

  /**
   * Get all providers of a specific type.
   */
  get(type: VisionProviderType): VisionProvider | undefined {
    const providers = this.providers.get(type);
    return providers?.[0];
  }

  /**
   * Get all providers of a specific type.
   */
  getAll(type: VisionProviderType): VisionProvider[] {
    return this.providers.get(type) ?? [];
  }

  /**
   * §8: Resolve providers based on mission requirements.
   * Returns the appropriate providers for the given requirements.
   */
  resolve(requirements: VisionRequirements): VisionProvider[] {
    const resolved: VisionProvider[] = [];

    if (requirements.requiresPose) {
      const poseProvider = this.get("pose");
      if (poseProvider) resolved.push(poseProvider);
    }

    if (requirements.requiresObjectDetection) {
      const objectProvider = this.get("object");
      if (objectProvider) resolved.push(objectProvider);
    }

    if (requirements.requiresSceneComparison) {
      const sceneProvider = this.get("scene");
      if (sceneProvider) resolved.push(sceneProvider);
    }

    if (requirements.requiresOCR) {
      const documentProvider = this.get("document");
      if (documentProvider) resolved.push(documentProvider);
    }

    // Quality provider is always included
    const qualityProvider = this.get("quality");
    if (qualityProvider) resolved.push(qualityProvider);

    return resolved;
  }

  /**
   * Check if a provider type is registered.
   */
  has(type: VisionProviderType): boolean {
    return this.providers.has(type) && (this.providers.get(type)?.length ?? 0) > 0;
  }

  /**
   * Get all registered provider types.
   */
  getRegisteredTypes(): VisionProviderType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Clear all registered providers (for testing).
   */
  clear(): void {
    this.providers.clear();
  }
}

/**
 * Singleton vision provider registry.
 */
export const visionProviderRegistry = new VisionProviderRegistryImpl();
