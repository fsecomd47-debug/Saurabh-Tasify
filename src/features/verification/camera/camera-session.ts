"use client";

/**
 * PDR-4 §23-§29 + §67-§69: Unified camera session.
 *
 * One mission → one session → one stream → one production <video>.
 * The session owns the lock, the lifecycle state machine and live
 * health evidence (track state, frame progression, multi-region
 * luminance). Raw frames exist only in transient buffers for derived
 * signals and are discarded immediately (§29).
 */

export type CameraLifecycleState =
  | "idle"
  | "requesting"
  | "stream_acquired"
  | "attaching"
  | "playing"
  | "ready"
  | "active"
  | "stopping"
  | "stopped"
  | "error";

export type CameraIssue =
  | null
  | "PERMISSION_DENIED"
  | "NO_DEVICE"
  | "INSECURE_CONTEXT"
  | "TRACK_ENDED"
  | "FROZEN_FRAME"
  | "SCENE_DARK"
  | "LOCK_HELD";

export type CameraHealth = {
  streamActive: boolean;
  trackLive: boolean;
  dimensionsValid: boolean;
  videoPlaying: boolean;
  framesProgressing: boolean;
  sceneVisible: boolean;
  healthy: boolean;
};

type HealthListener = (health: CameraHealth, issue: CameraIssue) => void;

/* Module-level singleton lock — one active stream per document (§24). */
let activeSession: CameraSession | null = null;

const LUMINANCE_REGIONS = 5; // center + 4 quadrants
const BLACK_LUMINANCE_THRESHOLD = 14;
const DARK_SAMPLE_REQUIRED = 4;
const FROZEN_SAMPLE_REQUIRED = 3;
const SAMPLE_INTERVAL_MS = 1200;
const SAMPLE_W = 32;
const SAMPLE_H = 24;

export class CameraSession {
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private state: CameraLifecycleState = "idle";
  private issue: CameraIssue = null;
  private healthListener: HealthListener | null = null;

  private sampleTimer: ReturnType<typeof setInterval> | null = null;
  private sampleCanvas: HTMLCanvasElement | null = null;
  private sampleCtx: CanvasRenderingContext2D | null = null;

  private darkSamples = 0;
  private lastFrameSignature = "";
  private frozenSamples = 0;
  private lastVideoTime = -1;
  private stalledTimeSamples = 0;

  private ended = false;

  static tryAcquire(): CameraSession | null {
    if (activeSession && !activeSession.ended) return null;
    const session = new CameraSession();
    activeSession = session;
    return session;
  }

  static get hasActiveSession(): boolean {
    return activeSession !== null && !activeSession.ended;
  }

  constructor() {
    // Intentionally private-ish: use tryAcquire.
  }

  getState(): CameraLifecycleState {
    return this.state;
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  onHealth(listener: HealthListener): void {
    this.healthListener = listener;
  }

  private setState(state: CameraLifecycleState): void {
    this.state = state;
  }

  private currentHealth(): CameraHealth {
    const track = this.stream?.getVideoTracks()[0];
    const video = this.video;
    const dimsValid = !!video && video.videoWidth > 0 && video.videoHeight > 0;
    const playing = !!video && !video.paused && !video.ended && video.readyState >= 2;
    const health: CameraHealth = {
      streamActive: !!this.stream && this.stream.active,
      trackLive: !!track && track.readyState === "live",
      dimensionsValid: dimsValid,
      videoPlaying: playing,
      framesProgressing: this.stalledTimeSamples < 2,
      sceneVisible: this.darkSamples < DARK_SAMPLE_REQUIRED,
      healthy: false,
    };
    health.healthy =
      health.streamActive &&
      health.trackLive &&
      health.dimensionsValid &&
      health.videoPlaying &&
      health.framesProgressing &&
      health.sceneVisible;
    return health;
  }

  private emitHealth(): void {
    this.healthListener?.(this.currentHealth(), this.issue);
  }

  /**
   * Full acquisition flow: permission → stream → attach → play → ready.
   * Throws Error with user-facing-safe `issue` attached when it fails.
   */
  async start(
    video: HTMLVideoElement,
    constraints: MediaTrackConstraints = { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
  ): Promise<void> {
    if (typeof window === "undefined") throw attachIssue(new Error("No window"), "INSECURE_CONTEXT");

    if (!window.isSecureContext) {
      this.setState("error");
      this.issue = "INSECURE_CONTEXT";
      throw attachIssue(new Error("Camera requires a secure context."), "INSECURE_CONTEXT");
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      this.setState("error");
      this.issue = "NO_DEVICE";
      throw attachIssue(new Error("Camera is not available on this device."), "NO_DEVICE");
    }

    try {
      this.setState("requesting");
      const stream = await navigator.mediaDevices.getUserMedia({ video: constraints, audio: false });
      this.stream = stream;
      this.setState("stream_acquired");
    } catch (err) {
      this.setState("error");
      const name = (err as DOMException)?.name ?? "";
      this.issue = name === "NotFoundError" || name === "OverconstrainedError" ? "NO_DEVICE" : "PERMISSION_DENIED";
      this.emitHealth();
      throw attachIssue(new Error(name === "NotAllowedError" ? "Camera permission was denied." : "Camera could not be started."), this.issue);
    }

    const [track] = this.stream.getVideoTracks();
    if (track) {
      track.addEventListener("ended", () => {
        if (this.ended) return;
        this.issue = "TRACK_ENDED";
        this.emitHealth();
      });
    }

    this.video = video;
    this.setState("attaching");
    video.srcObject = this.stream;
    video.muted = true;
    (video as HTMLVideoElement & { defaultMuted: boolean }).defaultMuted = true;
    video.playsInline = true;

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(attachIssue(new Error("Camera did not start in time."), "TRACK_ENDED")), 8000);
      const onMeta = () => {
        clearTimeout(timeout);
        video.removeEventListener("loadedmetadata", onMeta);
        resolve();
      };
      video.addEventListener("loadedmetadata", onMeta);
      if (video.readyState >= 1) {
        clearTimeout(timeout);
        video.removeEventListener("loadedmetadata", onMeta);
        resolve();
      }
    });

    await video.play().catch(() => video.play());
    this.setState("playing");
    this.startHealthMonitor();
    this.setState("ready");
    this.emitHealth();
  }

  markActive(): void {
    if (this.state === "ready" || this.state === "active") {
      this.setState("active");
      this.emitHealth();
    }
  }

  /** Begin periodic health sampling. Uses ONE reused canvas context (§28). */
  private startHealthMonitor(): void {
    this.sampleCanvas = this.sampleCanvas ?? document.createElement("canvas");
    this.sampleCanvas.width = SAMPLE_W;
    this.sampleCanvas.height = SAMPLE_H;
    this.sampleCtx =
      this.sampleCtx ??
      (this.sampleCanvas.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D | null);

    this.sampleTimer = setInterval(() => this.sampleHealth(), SAMPLE_INTERVAL_MS);
  }

  private sampleHealth(): void {
    if (this.ended || !this.video || this.stream === null) return;
    const ctx = this.sampleCtx;
    const video = this.video;

    if (!ctx || video.readyState < 2) return;

    /* Frame progression: currentTime must advance between samples. */
    if (Math.abs(video.currentTime - this.lastVideoTime) < 0.01) {
      this.stalledTimeSamples += 1;
      if (this.stalledTimeSamples >= FROZEN_SAMPLE_REQUIRED && this.issue === null) {
        this.issue = "FROZEN_FRAME";
      }
    } else {
      this.stalledTimeSamples = 0;
      if (this.issue === "FROZEN_FRAME") this.issue = null;
      this.lastVideoTime = video.currentTime;
    }

    /* Multi-region luminance — a dark room is valid, pitch black is not. */
    ctx.drawImage(video, 0, 0, SAMPLE_W, SAMPLE_H);
    const { data } = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H);
    const regionLum = sampleRegionLuminance(data, SAMPLE_W, SAMPLE_H);
    const allDark = regionLum.every((l) => l < BLACK_LUMINANCE_THRESHOLD);

    this.darkSamples = allDark ? this.darkSamples + 1 : 0;
    if (this.darkSamples >= DARK_SAMPLE_REQUIRED) {
      if (this.issue === null) this.issue = "SCENE_DARK";
    } else if (this.issue === "SCENE_DARK") {
      this.issue = null;
    }

    /* Frozen-frame signature over coarse pixels. */
    let sig = "";
    for (let i = 0; i < data.length; i += 397) sig += String.fromCharCode(data[i] & 63);
    if (sig === this.lastFrameSignature) {
      this.frozenSamples += 1;
      if (this.frozenSamples >= FROZEN_SAMPLE_REQUIRED && this.stalledTimeSamples >= FROZEN_SAMPLE_REQUIRED && this.issue === null) {
        this.issue = "FROZEN_FRAME";
      }
    } else {
      this.frozenSamples = 0;
      this.lastFrameSignature = sig;
    }

    this.emitHealth();
  }

  /** §69: stop tracks, cancel loops, detach, clear transient buffers. */
  async stop(): Promise<void> {
    if (this.ended) return;
    this.ended = true;
    this.setState("stopping");

    if (this.sampleTimer !== null) {
      clearInterval(this.sampleTimer);
      this.sampleTimer = null;
    }
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
      this.stream = null;
    }
    if (this.video) {
      this.video.pause();
      this.video.srcObject = null;
      this.video = null;
    }
    this.sampleCtx = null;
    this.sampleCanvas = null;
    this.lastFrameSignature = "";
    this.healthListener = null;

    if (activeSession === this) activeSession = null;
    this.setState("stopped");
  }
}

function sampleRegionLuminance(data: Uint8ClampedArray, w: number, h: number): number[] {
  const centers: Array<[number, number]> = [
    [Math.floor(w / 2), Math.floor(h / 2)],
    [Math.floor(w / 4), Math.floor(h / 4)],
    [Math.floor((3 * w) / 4), Math.floor(h / 4)],
    [Math.floor(w / 4), Math.floor((3 * h) / 4)],
    [Math.floor((3 * w) / 4), Math.floor((3 * h) / 4)],
  ];
  const radius = Math.max(2, Math.floor(Math.min(w, h) / 8));
  const results: number[] = [];

  for (const [cx, cy] of centers) {
    let sum = 0;
    let n = 0;
    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const idx = (y * w + x) * 4;
        sum += 0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2];
        n++;
      }
    }
    results.push(n > 0 ? sum / n : 0);
  }
  return results;
}

function attachIssue(err: Error, issue: CameraIssue): Error {
  (err as Error & { issue: CameraIssue }).issue = issue;
  return err;
}

/*
 * Legacy single-flag lock kept for backward compatibility during the
 * migration of older call sites.
 */
let legacyLockHeld = false;

export function tryAcquireCameraLock(): boolean {
  if (legacyLockHeld || CameraSession.hasActiveSession) return false;
  legacyLockHeld = true;
  return true;
}

export function releaseCameraLock(): void {
  legacyLockHeld = false;
}
