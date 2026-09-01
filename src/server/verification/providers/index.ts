import { registerOCRProvider } from "./ocr-provider";
import { registerPhotoProvider } from "./photo-provider";
import { registerObjectProvider } from "./object-provider";
import { registerSceneProvider } from "./scene-provider";
import { registerVideoProvider } from "./video-provider";
import { registerDocumentProvider } from "./document-provider";
import { registerPoseProvider } from "./pose-provider";
import { globalProviderRegistry } from "../provider-registry";

let initialized = false;

export function initializeProviders(): void {
  if (initialized) return;

  registerOCRProvider();
  registerPhotoProvider();
  registerObjectProvider();
  registerSceneProvider();
  registerVideoProvider();
  registerDocumentProvider();
  registerPoseProvider();

  initialized = true;

  console.log(
    `[Verification] Initialized ${globalProviderRegistry.listAll().length} providers`
  );
}

export function getProviderCount(): number {
  return globalProviderRegistry.listAll().length;
}
