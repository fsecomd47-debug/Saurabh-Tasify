/**
 * PDR-4.1 §55: Reusable CameraMissionView
 * Single camera component for all camera-based missions.
 * §20: One mission → one camera session → one active video element → one stream.
 */

"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";

type CameraMissionViewProps = {
  missionId: string;
  mode: "pushup" | "squat" | "focus" | "photo";
  onReady?: () => void;
  onError?: (error: string) => void;
  onFrame?: (video: HTMLVideoElement) => void;
  showIndicator?: boolean;
  className?: string;
};

type CameraState = {
  status: "idle" | "requesting" | "ready" | "active" | "error" | "stopped";
  error?: string;
  stream?: MediaStream;
};

/**
 * §20: Camera session security.
 * One mission → one camera session → one stream.
 */
let activeCameraLock = false;
let activeStream: MediaStream | null = null;

function releaseCamera() {
  if (activeStream) {
    activeStream.getTracks().forEach((track) => {
      track.stop();
    });
    activeStream = null;
  }
  activeCameraLock = false;
}

export function CameraMissionView({
  missionId,
  mode,
  onReady,
  onError,
  onFrame,
  showIndicator = true,
  className = "",
}: CameraMissionViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<CameraState>({ status: "idle" });
  const frameLoopRef = useRef<number | null>(null);

  // §51: Camera session security - one mission = one session
  const startCamera = useCallback(async () => {
    if (activeCameraLock) {
      setState({ status: "error", error: "Camera already in use by another mission" });
      onError?.("Camera already in use by another mission");
      return;
    }

    setState({ status: "requesting" });

    try {
      // §54: Device capability check
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera not supported in this browser");
      }

      if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
        throw new Error("Camera requires a secure context (HTTPS)");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode === "pushup" || mode === "squat" ? "user" : "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      // §20: Acquire camera lock
      activeCameraLock = true;
      activeStream = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setState({ status: "ready", stream });
      onReady?.();

      // Start frame processing loop (§52-53)
      startFrameLoop();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Camera access failed";
      setState({ status: "error", error: message });
      onError?.(message);
    }
  }, [missionId, mode, onReady, onError]);

  // §52-53: Controlled vision processing rate
  const startFrameLoop = useCallback(() => {
    const processFrame = () => {
      if (videoRef.current && videoRef.current.readyState >= 2 && onFrame) {
        onFrame(videoRef.current);
      }
      frameLoopRef.current = requestAnimationFrame(processFrame);
    };
    frameLoopRef.current = requestAnimationFrame(processFrame);
  }, [onFrame]);

  const stopCamera = useCallback(() => {
    // Stop frame loop
    if (frameLoopRef.current) {
      cancelAnimationFrame(frameLoopRef.current);
      frameLoopRef.current = null;
    }

    // §51: Release camera session
    releaseCamera();

    setState({ status: "stopped" });
  }, []);

  // §51: Cleanup on unmount
  useEffect(() => {
    return () => {
      if (frameLoopRef.current) {
        cancelAnimationFrame(frameLoopRef.current);
      }
      if (state.stream || activeStream) {
        releaseCamera();
      }
    };
  }, []);

  if (state.status === "error") {
    return (
      <div className={`bg-neutral-900 rounded-xl p-6 text-center ${className}`}>
        <div className="text-red-400 text-lg mb-2">Camera Error</div>
        <div className="text-neutral-400 text-sm">{state.error}</div>
        <button
          onClick={startCamera}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (state.status === "stopped") {
    return (
      <div className={`bg-neutral-900 rounded-xl p-6 text-center ${className}`}>
        <div className="text-neutral-400 text-lg">Camera Stopped</div>
        <button
          onClick={startCamera}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
        >
          Restart Camera
        </button>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-auto rounded-xl bg-black"
        style={{ transform: "scaleX(-1)" }}
      />

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* §30: Camera indicator */}
      {showIndicator && (state.status === "ready" || state.status === "active") && (
        <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-white text-xs font-medium">LIVE</span>
        </div>
      )}

      {/* Start button (initial state) */}
      {state.status === "idle" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl">
          <button
            onClick={startCamera}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors font-semibold"
          >
            Enable Camera
          </button>
        </div>
      )}

      {/* Requesting permission */}
      {state.status === "requesting" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl">
          <div className="text-white text-center">
            <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-3" />
            <div className="text-sm">Requesting camera access...</div>
          </div>
        </div>
      )}
    </div>
  );
}
