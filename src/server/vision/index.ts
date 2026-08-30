/**
 * PDR-4.2 §70: Vision Provider Index
 * Exports all vision providers and registers them with the registry.
 */

export { QualityProvider, assessImageQuality } from "./providers/quality-provider";
export { PoseProvider } from "./providers/pose-provider";
export { ObjectDetectionProvider, suppressDuplicates } from "./providers/object-detection-provider";
export { SceneComparisonProvider } from "./providers/scene-comparison-provider";
export { DocumentProvider } from "./providers/document-provider";

import { visionProviderRegistry } from "./registry";
import { QualityProvider } from "./providers/quality-provider";
import { PoseProvider } from "./providers/pose-provider";
import { ObjectDetectionProvider } from "./providers/object-detection-provider";
import { SceneComparisonProvider } from "./providers/scene-comparison-provider";
import { DocumentProvider } from "./providers/document-provider";

/**
 * §70: Register all PDR-4.2 vision providers.
 * Called once at startup.
 */
export function registerAllVisionProviders(): void {
  visionProviderRegistry.register(new QualityProvider());
  visionProviderRegistry.register(new PoseProvider());
  visionProviderRegistry.register(new ObjectDetectionProvider());
  visionProviderRegistry.register(new SceneComparisonProvider());
  visionProviderRegistry.register(new DocumentProvider());
}
