/**
 * PDR-4.1 §56-58: Verification Provider Registry Initialization
 * Registers all verification providers and initializes the provider registry.
 * Called once at application startup.
 */

import { providerRegistry } from "../provider-interface";
import { SelfReportProvider } from "./self-report-provider";
import { FocusTimerProvider } from "./focus-timer-provider";
import { PushupPoseProvider } from "./pushup-pose-provider";
import { SquatPoseProvider } from "./squat-pose-provider";
import { LungePoseProvider } from "./lunge-pose-provider";
import { TimerProvider } from "./timer-provider";
import { PhotoEvidenceProvider } from "./photo-evidence-provider";
import { ExternalEvidenceProvider } from "./external-evidence-provider";

let initialized = false;

/**
 * Register all PDR-4 verification providers.
 * Safe to call multiple times (idempotent).
 */
export function initializeVerificationProviders(): void {
  if (initialized) return;

  providerRegistry.register(new SelfReportProvider());
  providerRegistry.register(new FocusTimerProvider());
  providerRegistry.register(new PushupPoseProvider());
  providerRegistry.register(new SquatPoseProvider());
  providerRegistry.register(new LungePoseProvider());
  providerRegistry.register(new TimerProvider());
  providerRegistry.register(new PhotoEvidenceProvider());
  providerRegistry.register(new ExternalEvidenceProvider());

  initialized = true;
  console.log("[VerificationProviders] Registered 8 providers:", providerRegistry.getAll().map((p) => p.name));
}

/**
 * Get the provider registry (ensures initialization).
 */
export function getProviderRegistry() {
  initializeVerificationProviders();
  return providerRegistry;
}
