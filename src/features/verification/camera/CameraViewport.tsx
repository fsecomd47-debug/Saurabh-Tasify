"use client";

/**
 * PDR-4.3 §57-§58: CameraViewport Component
 * Proper video container for camera evidence.
 * Video must live inside CameraViewport, not document.body debug overlay.
 *
 * Architecture:
 * CameraViewport
 * └── video (width: 100%, height: 100%, object-fit: cover)
 */

import React, { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CameraOff, Loader2, AlertCircle } from "lucide-react";
import {
  CameraSession,
  type CameraHealth,
  type CameraIssue,
} from "./camera-session";

type CameraViewportProps = {
  onReady?: (session: CameraSession) => void;
  onError?: (error: string, issue: CameraIssue) => void;
  onHealthChange?: (health: CameraHealth, issue: CameraIssue) => void;
  facingMode?: "user" | "environment";
  width?: number;
  height?: number;
  className?: string;
  showOverlay?: boolean;
  children?: React.ReactNode;
};

const ISSUE_MESSAGES: Record<Exclude<CameraIssue, null>, string> = {
  PERMISSION_DENIED: "Camera access is required for this mission.",
  NO_DEVICE: "No camera was found on this device.",
  INSECURE_CONTEXT: "Camera needs a secure (https) connection.",
  TRACK_ENDED: "The camera disconnected. Restart the mission.",
  FROZEN_FRAME: "The camera feed froze. Try switching cameras.",
  SCENE_DARK: "The scene is too dark. Add more light.",
  LOCK_HELD: "Another camera session is active.",
};

export function CameraViewport({
  onReady,
  onError,
  onHealthChange,
  facingMode = "user",
  width = 640,
  height = 480,
  className = "",
  showOverlay = true,
  children,
}: CameraViewportProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<CameraSession | null>(null);
  const [state, setState] = useState<"initializing" | "ready" | "error">(
    "initializing"
  );
  const [health, setHealth] = useState<CameraHealth | null>(null);
  const [issue, setIssue] = useState<CameraIssue>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const cleanup = useCallback(async () => {
    if (sessionRef.current) {
      await sessionRef.current.stop();
      sessionRef.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initCamera() {
      const video = videoRef.current;
      if (!video) return;

      const session = CameraSession.tryAcquire();
      if (!session) {
        if (!cancelled) {
          setState("error");
          setErrorMsg(ISSUE_MESSAGES.LOCK_HELD);
          onError?.("Camera is in use by another component.", "LOCK_HELD");
        }
        return;
      }
      sessionRef.current = session;

      session.onHealth((h, camIssue) => {
        if (cancelled) return;
        setHealth(h);
        setIssue(camIssue);
        onHealthChange?.(h, camIssue);

        if (!h.healthy && camIssue && camIssue !== "LOCK_HELD") {
          onError?.(ISSUE_MESSAGES[camIssue], camIssue);
        }
      });

      try {
        await session.start(video, {
          facingMode,
          width: { ideal: width },
          height: { ideal: height },
        });
        if (!cancelled) {
          setState("ready");
          onReady?.(session);
        }
      } catch (err) {
        if (!cancelled) {
          const code =
            (err as Error & { issue?: CameraIssue }).issue ?? "PERMISSION_DENIED";
          setState("error");
          setErrorMsg(ISSUE_MESSAGES[code] ?? "Camera could not start.");
          onError?.(ISSUE_MESSAGES[code] ?? "Camera could not start.", code);
        }
      }
    }

    initCamera();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [facingMode, width, height, onReady, onError, onHealthChange, cleanup]);

  return (
    <div
      className={`relative overflow-hidden bg-black ${className}`}
      style={{ aspectRatio: `${width}/${height}` }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />

      {showOverlay && (
        <>
          {/* Live indicator */}
          {state === "ready" && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-full">
              <span
                className={`w-2 h-2 rounded-full ${
                  health?.healthy
                    ? "bg-[#FF3B30] animate-pulse"
                    : "bg-white/40"
                }`}
              />
              <span className="text-[10px] font-bold tracking-wider text-white/90">
                CAMERA ACTIVE
              </span>
            </div>
          )}

          {/* Loading state */}
          {state === "initializing" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
              <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
              <p className="text-[12px] text-white/80">Starting camera...</p>
            </div>
          )}

          {/* Error state */}
          {state === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 px-6">
              <CameraOff className="w-8 h-8 text-white/60 mb-2" />
              <p className="text-[12px] text-white/85 text-center">
                {errorMsg}
              </p>
            </div>
          )}

          {/* Health warnings */}
          {state === "ready" && issue && issue !== "LOCK_HELD" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-x-3 top-12 bg-[#FFF4E5]/95 rounded-[12px] p-3 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-[#FF9500] flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#8a5b00] font-medium">
                {ISSUE_MESSAGES[issue as Exclude<CameraIssue, null>]}
              </p>
            </motion.div>
          )}
        </>
      )}

      {children}
    </div>
  );
}
