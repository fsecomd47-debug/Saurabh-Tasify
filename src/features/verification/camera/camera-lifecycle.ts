export type CameraState =
  | "idle"
  | "requesting"
  | "initializing"
  | "active"
  | "locked"
  | "error"
  | "cleanup";

export interface CameraConfig {
  video: boolean | MediaTrackConstraints;
  audio: boolean;
  facingMode?: "user" | "environment";
  width?: number;
  height?: number;
}

export interface CameraCapabilities {
  hasCamera: boolean;
  hasMicrophone: boolean;
  supportedConstraints: MediaTrackSupportedConstraints;
  devices: MediaDeviceInfo[];
}

export class CameraLifecycleManager {
  private stream: MediaStream | null = null;
  private state: CameraState = "idle";
  private lockHolder: string | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private stateListeners: Array<(state: CameraState) => void> = [];

  async requestPermissions(): Promise<CameraCapabilities> {
    this.setState("requesting");

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      const audioDevices = devices.filter((d) => d.kind === "audioinput");

      return {
        hasCamera: videoDevices.length > 0,
        hasMicrophone: audioDevices.length > 0,
        supportedConstraints: navigator.mediaDevices.getSupportedConstraints(),
        devices,
      };
    } catch (error) {
      this.setState("error");
      throw error;
    }
  }

  async initialize(config: CameraConfig): Promise<MediaStream> {
    if (this.state === "active" && this.stream) {
      return this.stream;
    }

    this.setState("initializing");

    try {
      const constraints: MediaStreamConstraints = {
        video:
          typeof config.video === "boolean"
            ? {
                facingMode: config.facingMode || "user",
                width: { ideal: config.width || 1280 },
                height: { ideal: config.height || 720 },
              }
            : config.video,
        audio: config.audio,
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.setState("active");
      return this.stream;
    } catch (error) {
      this.setState("error");
      throw error;
    }
  }

  async attachToVideo(
    videoElement: HTMLVideoElement
  ): Promise<void> {
    if (!this.stream) {
      throw new Error("Camera not initialized");
    }

    this.videoElement = videoElement;
    videoElement.srcObject = this.stream;

    return new Promise((resolve, reject) => {
      videoElement.onloadedmetadata = () => {
        videoElement.play().then(resolve).catch(reject);
      };
    });
  }

  lock(lockId: string): boolean {
    if (this.lockHolder && this.lockHolder !== lockId) {
      return false;
    }

    this.lockHolder = lockId;
    this.setState("locked");
    return true;
  }

  unlock(lockId: string): boolean {
    if (this.lockHolder !== lockId) {
      return false;
    }

    this.lockHolder = null;
    this.setState("active");
    return true;
  }

  isLocked(): boolean {
    return this.state === "locked";
  }

  getLockHolder(): string | null {
    return this.lockHolder;
  }

  async switchCamera(facingMode: "user" | "environment"): Promise<MediaStream> {
    if (!this.stream) {
      throw new Error("Camera not initialized");
    }

    this.stop();

    return this.initialize({
      video: true,
      audio: false,
      facingMode,
    });
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  getVideoTrack(): MediaStreamTrack | null {
    if (!this.stream) return null;
    const tracks = this.stream.getVideoTracks();
    return tracks.length > 0 ? tracks[0] : null;
  }

  getAudioTrack(): MediaStreamTrack | null {
    if (!this.stream) return null;
    const tracks = this.stream.getAudioTracks();
    return tracks.length > 0 ? tracks[0] : null;
  }

  getCapabilities(): MediaTrackCapabilities | undefined {
    const track = this.getVideoTrack();
    return track?.getCapabilities();
  }

  async takePhoto(): Promise<Blob> {
    if (!this.videoElement || !this.stream) {
      throw new Error("Camera not ready");
    }

    const canvas = document.createElement("canvas");
    canvas.width = this.videoElement.videoWidth;
    canvas.height = this.videoElement.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");

    ctx.drawImage(this.videoElement, 0, 0);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to capture photo"));
        },
        "image/jpeg",
        0.92
      );
    });
  }

  async startRecording(): Promise<MediaRecorder> {
    if (!this.stream) {
      throw new Error("Camera not initialized");
    }

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

    const recorder = new MediaRecorder(this.stream, { mimeType });
    return recorder;
  }

  stop(): void {
    this.setState("cleanup");

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }

    this.lockHolder = null;
    this.setState("idle");
  }

  getState(): CameraState {
    return this.state;
  }

  onStateChange(listener: (state: CameraState) => void): () => void {
    this.stateListeners.push(listener);
    return () => {
      this.stateListeners = this.stateListeners.filter((l) => l !== listener);
    };
  }

  private setState(newState: CameraState): void {
    this.state = newState;
    this.stateListeners.forEach((l) => l(newState));
  }
}

let globalCameraManager: CameraLifecycleManager | null = null;

export function getCameraManager(): CameraLifecycleManager {
  if (!globalCameraManager) {
    globalCameraManager = new CameraLifecycleManager();
  }
  return globalCameraManager;
}

export function resetCameraManager(): void {
  if (globalCameraManager) {
    globalCameraManager.stop();
    globalCameraManager = null;
  }
}
