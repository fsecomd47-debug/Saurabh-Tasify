"use client";

/**
 * Single source of truth for the camera lock (§24).
 * Delegates to the unified CameraSession singleton.
 */
export { tryAcquireCameraLock, releaseCameraLock } from "./camera-session";
